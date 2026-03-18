import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import AddRecipePage from './pages/AddRecipePage'
import RecipeDetailPage from './pages/RecipeDetailPage'

const VIEWS = {
  HOME: 'home',
  ADD: 'add',
  DETAIL: 'detail',
}

function App() {
  const { user, loading } = useAuth()
  const [view, setView] = useState(VIEWS.HOME)
  const [selectedRecipeId, setSelectedRecipeId] = useState(null)

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.warn)
    }
  }, [])

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#fdfaf7' }}
      >
        <div className="text-center">
          <div className="text-5xl mb-4">🍳</div>
          <svg className="spinner w-8 h-8 text-primary mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  if (view === VIEWS.ADD) {
    return (
      <AddRecipePage
        onBack={() => setView(VIEWS.HOME)}
        onSaved={(id) => {
          setSelectedRecipeId(id)
          setView(VIEWS.DETAIL)
        }}
      />
    )
  }

  if (view === VIEWS.DETAIL && selectedRecipeId) {
    return (
      <RecipeDetailPage
        recipeId={selectedRecipeId}
        onBack={() => {
          setSelectedRecipeId(null)
          setView(VIEWS.HOME)
        }}
      />
    )
  }

  return (
    <HomePage
      onAddRecipe={() => setView(VIEWS.ADD)}
      onViewRecipe={(id) => {
        setSelectedRecipeId(id)
        setView(VIEWS.DETAIL)
      }}
    />
  )
}

export default App
