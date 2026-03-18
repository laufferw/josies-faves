import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#fdfaf7' }}>
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-6">📬</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Check your email!</h1>
          <p className="text-gray-500 text-lg mb-8">
            We sent a magic link to<br />
            <span className="font-semibold text-gray-700">{email}</span>
          </p>
          <p className="text-gray-400 text-sm">
            Tap the link in your email to sign in. You can close this tab.
          </p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            className="mt-8 text-primary underline text-sm"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#fdfaf7' }}>
      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🍳</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Josie's Faves</h1>
          <p className="text-gray-500 text-lg">Your personal recipe collection</p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2 text-lg">
              Your email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="josie@example.com"
              className="input-field"
              required
              autoComplete="email"
              inputMode="email"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="btn-primary w-full text-lg"
            style={{ minHeight: '56px' }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="spinner w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending...
              </span>
            ) : (
              '✉️ Send me a magic link'
            )}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-8">
          No password needed — we'll email you a link to sign in instantly.
        </p>
      </div>
    </div>
  )
}
