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

// Resize + compress image to max 1200px, JPEG 80% — keeps it under Vercel's 4.5MB limit
function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1200
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width)
          width = MAX
        } else {
          width = Math.round((width * MAX) / height)
          height = MAX
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.80)
      const base64 = dataUrl.split(',')[1]
      URL.revokeObjectURL(objectUrl)
      resolve({ base64, mimeType: 'image/jpeg', objectUrl: dataUrl })
    }
    img.src = objectUrl
  })
}

export default function AddRecipePage({ onBack, onSaved }) {
  const { user } = useAuth()
  const [step, setStep] = useState(STEPS.CAPTURE)
  const [capturedImage, setCapturedImage] = useState(null)
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [ocrText, setOcrText] = useState('')
  const [error, setError] = useState(null)
  const cameraInputRef = useRef(null)
  const libraryInputRef = useRef(null)

  const processFile = async (file) => {
    if (!file) return
    setError(null)
    setStep(STEPS.READING)

    try {
      // Compress before sending — iPhone photos can be 15MB+
      const { base64, mimeType, objectUrl } = await compressImage(file)
      setCapturedImage({ base64, mimeType, objectUrl, file })

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
      setError(`Couldn't read the recipe: ${err.message}. Enter the title manually below.`)
      setStep(STEPS.REVIEW)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a title for the recipe')
      return
    }

    setStep(STEPS.SAVING)
    setError(null)

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, household_id')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) throw new Error(`Profile error: ${profileError.message}`)
      if (!profile?.household_id) throw new Error('Profile not ready — please sign out and sign back in')

      // Save recipe immediately — don't wait for photo upload
      const { data: recipe, error: insertError } = await supabase
        .from('recipes')
        .insert({
          household_id: profile.household_id,
          created_by: profile.id,
          title: title.trim(),
          source: source.trim() || null,
          ocr_text: ocrText || null,
          photo_url: null, // will be backfilled async
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Upload photo in background — don't block navigation
      if (capturedImage?.file) {
        const filename = `${profile.household_id}/${recipe.id}.jpg`
        supabase.storage
          .from('recipe-photos')
          .upload(filename, capturedImage.file, { contentType: 'image/jpeg', upsert: false })
          .then(({ error: uploadError }) => {
            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('recipe-photos')
                .getPublicUrl(filename)
              supabase.from('recipes').update({ photo_url: publicUrl }).eq('id', recipe.id)
            }
          })
      }

      setStep(STEPS.DONE)
      setTimeout(() => onSaved(recipe.id), 1200)
    } catch (err) {
      console.error('Save error:', err)
      setError(`Couldn't save: ${err.message}`)
      setStep(STEPS.REVIEW)
    }
  }

  const reset = () => {
    setCapturedImage(null)
    setTitle('')
    setSource('')
    setOcrText('')
    setError(null)
    setStep(STEPS.CAPTURE)
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
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Add a recipe</h2>
          <p className="text-gray-500 text-lg mb-10">
            Take a photo of a cookbook page or choose one from your library.
          </p>

          {/* Single input, no capture attr — iOS shows action sheet: Camera / Photo Library / Files */}
          <input
            ref={libraryInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => processFile(e.target.files?.[0])}
            className="hidden"
          />

          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={() => libraryInputRef.current?.click()}
              className="btn-primary w-full text-xl"
              style={{ minHeight: 64 }}
            >
              📷 Take Photo or Choose
            </button>
          </div>
        </div>
      )}

      {/* Step: Reading */}
      {step === STEPS.READING && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          {capturedImage?.objectUrl && (
            <img
              src={capturedImage.objectUrl}
              alt="Recipe"
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
                alt="Recipe"
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
                <label className="block text-gray-700 font-semibold mb-2">Recipe text</label>
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
            <button onClick={reset} className="btn-secondary w-full">
              Try Another Photo
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
