import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import RecipeCard from '../components/RecipeCard'

export default function HomePage({ onAddRecipe, onViewRecipe }) {
  const { user } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)

  const fetchRecipes = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      // Get user's profile — may not exist yet if first login just happened
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', user.id)
        .maybeSingle()  // won't throw on 0 rows

      if (profileErr) throw profileErr

      if (!profile?.household_id) {
        // Profile not ready yet — wait a beat and retry once
        await new Promise(r => setTimeout(r, 1500))
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('household_id')
          .eq('id', user.id)
          .maybeSingle()

        if (!retryProfile?.household_id) {
          setRecipes([])
          setLoading(false)
          return
        }
        // Use the retried profile
        const { data } = await supabase
          .from('recipes')
          .select('id, title, source, photo_url, created_at')
          .eq('household_id', retryProfile.household_id)
          .order('created_at', { ascending: false })
        setRecipes(data || [])
        setLoading(false)
        return
      }

      let data, fetchError

      if (search.trim()) {
        // Use ilike for search — simple and reliable
        ;({ data, error: fetchError } = await supabase
          .from('recipes')
          .select('id, title, source, photo_url, created_at')
          .eq('household_id', profile.household_id)
          .or(`title.ilike.%${search.trim()}%,ocr_text.ilike.%${search.trim()}%`)
          .order('created_at', { ascending: false }))
      } else {
        ;({ data, error: fetchError } = await supabase
          .from('recipes')
          .select('id, title, source, photo_url, created_at')
          .eq('household_id', profile.household_id)
          .order('created_at', { ascending: false }))
      }

      if (fetchError) throw fetchError
      setRecipes(data || [])
    } catch (err) {
      console.error('Error fetching recipes:', err)
      setError('Could not load recipes. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [user, search])

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#fdfaf7' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{ background: '#fdfaf7' }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-800">Josie's Faves 🍳</h1>
          <button
            onClick={handleSignOut}
            className="text-gray-400 text-sm p-2"
          >
            Sign out
          </button>
        </div>

        {/* Search — pl-10 so text clears the icon */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none select-none">🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes or ingredients..."
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="spinner w-8 h-8 text-primary mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-400">Loading your recipes...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">{error}</p>
            <button onClick={fetchRecipes} className="btn-primary px-8">Try again</button>
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">{search ? '🔍' : '📖'}</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              {search ? 'No recipes found' : 'No recipes yet!'}
            </h2>
            <p className="text-gray-400 mb-8">
              {search
                ? `No recipes match "${search}"`
                : 'Tap the + button to add your first recipe'}
            </p>
            {!search && (
              <button onClick={onAddRecipe} className="btn-primary px-10">
                📸 Add your first recipe
              </button>
            )}
          </div>
        ) : (
          <>
            {search && (
              <p className="text-gray-400 text-sm mb-3">
                {recipes.length} result{recipes.length !== 1 ? 's' : ''} for "{search}"
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => onViewRecipe(recipe.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={onAddRecipe}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-white text-3xl z-20 active:scale-95 transition-transform"
        style={{ background: '#e11d48' }}
        aria-label="Add recipe"
      >
        +
      </button>
    </div>
  )
}
