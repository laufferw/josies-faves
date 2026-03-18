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
  try {
    // Check if profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      // Create a household for solo users
      const { data: household } = await supabase
        .from('households')
        .insert({ name: `${user.email}'s Kitchen` })
        .select()
        .single()

      if (household) {
        await supabase.from('profiles').insert({
          id: user.id,
          household_id: household.id,
          display_name: user.email?.split('@')[0] || 'Josie',
          email: user.email,
        })
      }
    }
  } catch (err) {
    console.error('Error ensuring profile:', err)
  }
}
