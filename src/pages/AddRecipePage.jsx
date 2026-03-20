import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const STEPS = {
  CAPTURE: 'capture',
  READING: 'reading',
  REVIEW: 'review',
  SAVING: 'saving',
  DONE: 'done',
}

export default function AddRecipePage({ onBack, onSaved }) {
  const { user } = useAuth()
  const [step, setStep] = useState(STEPS.CAPTURE)
  const [capturedImage, setCapturedImage] = useState(null) // { base64, mimeType, objectUrl }
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [ocrText, setOcrText] = useState('')
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Convert to base64
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result
      const base64 = dataUrl.split(',')[1]
      const mimeType = file.type || 'image/jpeg'
      const objectUrl = URL.createObjectURL(file)

      setCapturedImage({ base64, mimeType, objectUrl, file })
      setStep(STEPS.READING)

      // Call OCR
      try {
        const response = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mimeType }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || `OCR failed (${response.status})`)
        }

        const { title: extractedTitle, text: extractedText } = await response.json()
        setTitle(extractedTitle || '')
        setOcrText(extractedText || '')
        setStep(STEPS.REVIEW)
      } catch (err) {
        console.error('OCR error:', err)
        setError(`Couldn't read the recipe: ${err.message}. You can type the title manually.`)
        setTitle('')
        setOcrText('')
        setStep(STEPS.REVIEW)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a title for the recipe')
      return
    }

    setStep(STEPS.SAVING)
    setError(null)

    try {
      // Get user profile + household
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, household_id')
        .eq('id', user.id)
        .single()

      if (!profile?.household_id) throw new Error('Profile not set up correctly')

      let photoUrl = null

      // Upload photo to Supabase Storage
      if (capturedImage?.file) {
        const ext = capturedImage.mimeType.includes('png') ? 'png' : 'jpg'
        const filename = `${profile.household_id}/${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('recipe-photos')
          .upload(filename, capturedImage.file, {
            contentType: capturedImage.mimeType,
            upsert: false,
          })

        if (uploadError) {
          console.warn('Photo upload failed:', uploadError.message)
          // Continue without photo rather than blocking save
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('recipe-photos')
            .getPublicUrl(filename)
          photoUrl = publicUrl
        }
      }

      // Insert recipe
      const { data: recipe, error: insertError } = await supabase
        .from('recipes')
        .insert({
          household_id: profile.household_id,
          created_by: profile.id,
          title: title.trim(),
          source: source.trim() || null,
          ocr_text: ocrText || null,
          photo_url: photoUrl,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setStep(STEPS.DONE)
      setTimeout(() => onSaved(recipe.id), 1500)
    } catch (err) {
      console.error('Save error:', err)
      setError(`Couldn't save: ${err.message}`)
      setStep(STEPS.REVIEW)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#fdfaf7' }}>
      {/* Header */}
      <div className="flex items-center px-4 py-4 sticky top-0 z-10" style={{ background: '#fdfaf7' }}>
        <button
          onClick={onBack}
          className="mr-3 p-2 -ml-2 text-gray-500 text-lg"
          style={{ minWidth: 44, minHeight: 44 }}
          aria-label="Go back"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-gray-800">Add Recipe</h1>
      </div>

      {/* Step: Capture */}
      {step === STEPS.CAPTURE && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-7xl mb-6">📸</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Take a photo</h2>
          <p className="text-gray-500 text-lg mb-10">
            Point your camera at a cookbook page and snap a photo.
          </p>

          {/* Camera input — capture attr causes black screen on iOS Safari PWA, omit it */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary w-full max-w-xs text-xl"
            style={{ minHeight: 64 }}
          >
            📷 Take Photo or Choose
          </button>
        </div>
      )}

      {/* Step: Reading (OCR in progress) */}
      {step === STEPS.READING && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          {capturedImage?.objectUrl && (
            <img
              src={capturedImage.objectUrl}
              alt="Recipe photo"
              className="w-48 h-48 object-cover rounded-2xl mb-8 shadow-md opacity-70"
            />
          )}
          <svg className="spinner w-12 h-12 text-primary mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Reading your recipe...</h2>
          <p className="text-gray-400">Just a moment while we extract the text ✨</p>
        </div>
      )}

      {/* Step: Review */}
      {step === STEPS.REVIEW && (
        <div className="flex-1 px-4 pb-8">
          {capturedImage?.objectUrl && (
            <div className="mb-4 rounded-2xl overflow-hidden shadow-sm">
              <img
                src={capturedImage.objectUrl}
                alt="Recipe photo"
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {error && (
            <div className="bg-orange-50 border border-orange-200 text-orange-700 rounded-xl px-4 py-3 text-sm mb-4">
              ⚠️ {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Recipe title <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chocolate Chip Cookies"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Source <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Joy of Cooking, page 342"
                className="input-field"
              />
            </div>

            {ocrText && (
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Recipe text
                </label>
                <div className="bg-white rounded-2xl border-2 border-gray-100 px-4 py-3 text-sm text-gray-600 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {ocrText}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="btn-primary w-full text-lg"
              style={{ minHeight: 56 }}
            >
              💾 Save Recipe
            </button>
            <button
              onClick={() => {
                setCapturedImage(null)
                setTitle('')
                setSource('')
                setOcrText('')
                setError(null)
                setStep(STEPS.CAPTURE)
              }}
              className="btn-secondary w-full"
            >
              Retake Photo
            </button>
          </div>
        </div>
      )}

      {/* Step: Saving */}
      {step === STEPS.SAVING && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <svg className="spinner w-12 h-12 text-primary mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Saving your recipe...</h2>
          <p className="text-gray-400">Almost there! 🍴</p>
        </div>
      )}

      {/* Step: Done */}
      {step === STEPS.DONE && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-7xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Recipe saved!</h2>
          <p className="text-gray-400">Opening your recipe...</p>
        </div>
      )}
    </div>
  )
}
