import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        setLoading(false)

        // Create profile on first sign in
        if (event === 'SIGNED_IN' && currentUser) {
          await ensureProfile(currentUser)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}

async function ensureProfile(user) {
  // Profile + household are created by a DB trigger on auth.users INSERT.
  // Nothing to do client-side — the trigger handles it with SECURITY DEFINER.
  // We just wait briefly to let the trigger complete before the app tries to read the profile.
  await new Promise(r => setTimeout(r, 800))
}
