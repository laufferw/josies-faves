import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function RecipeDetailPage({ recipeId, onBack }) {
  const { user } = useAuth()
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [togglingFav, setTogglingFav] = useState(false)
  const [error, setError] = useState(null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (!recipeId) return
    fetchRecipe()
  }, [recipeId])

  const fetchRecipe = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single()

      if (fetchError) throw fetchError
      setRecipe(data)

      // Check if favorited
      if (user) {
        const { data: fav } = await supabase
          .from('favorites')
          .select('user_id')
          .eq('user_id', user.id)
          .eq('recipe_id', recipeId)
          .maybeSingle()
        setIsFavorite(!!fav)
      }
    } catch (err) {
      setError('Could not load recipe')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async () => {
    if (!user || togglingFav) return
    setTogglingFav(true)

    try {
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('recipe_id', recipeId)
        setIsFavorite(false)
      } else {
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, recipe_id: recipeId })
        setIsFavorite(true)
      }
    } catch (err) {
      console.error('Favorite toggle error:', err)
    } finally {
      setTogglingFav(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this recipe? This cannot be undone.')) return

    try {
      await supabase.from('favorites').delete().eq('recipe_id', recipeId)
      await supabase.from('recipes').delete().eq('id', recipeId)
      onBack()
    } catch (err) {
      console.error('Delete error:', err)
      alert('Could not delete recipe')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fdfaf7' }}>
        <div className="text-center">
          <svg className="spinner w-10 h-10 text-primary mb-3 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400">Loading recipe...</p>
        </div>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#fdfaf7' }}>
        <p className="text-gray-500 mb-4">{error || 'Recipe not found'}</p>
        <button onClick={onBack} className="btn-primary px-8">Go back</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: '#fdfaf7' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 sticky top-0 z-10" style={{ background: '#fdfaf7' }}>
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-gray-500 text-lg"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFavorite}
            disabled={togglingFav}
            className="p-2 text-2xl transition-transform active:scale-110"
            style={{ minWidth: 44, minHeight: 44 }}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-gray-300 text-lg"
            style={{ minWidth: 44, minHeight: 44 }}
            aria-label="Delete recipe"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Photo */}
      {recipe.photo_url && !imageError ? (
        <div className="mx-4 mb-4 rounded-2xl overflow-hidden shadow-sm">
          <img
            src={recipe.photo_url}
            alt={recipe.title}
            className="w-full max-h-72 object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div
          className="mx-4 mb-4 rounded-2xl flex items-center justify-center"
          style={{ height: 120, background: '#fce7ef' }}
        >
          <span className="text-4xl">📖</span>
        </div>
      )}

      {/* Title + Source */}
      <div className="px-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{recipe.title}</h1>
        {recipe.source && (
          <p className="text-gray-400 flex items-center gap-1">
            <span>📚</span>
            <span>{recipe.source}</span>
          </p>
        )}
        <p className="text-gray-300 text-xs mt-1">
          Saved {new Date(recipe.created_at).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
          })}
        </p>
      </div>

      {/* Recipe Text */}
      {recipe.ocr_text ? (
        <div className="px-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-600 mb-3 text-sm uppercase tracking-wide">Recipe</h2>
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base">
              {recipe.ocr_text}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center text-gray-400">
            <p>No recipe text available</p>
          </div>
        </div>
      )}
    </div>
  )
}
