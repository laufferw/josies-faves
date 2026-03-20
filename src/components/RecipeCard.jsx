// Detect meal type from title and return { emoji, bg, accent }
function getMealStyle(title = '') {
  const t = title.toLowerCase()

  if (/chili|chilli/.test(t))
    return { emoji: '🌶️', bg: '#ffebee', accent: '#c62828' }
  if (/soup|stew|chowder|bisque|broth/.test(t))
    return { emoji: '🍲', bg: '#fff3e0', accent: '#fb8c00' }
  if (/salad|slaw|greens|arugula|kale|spinach/.test(t))
    return { emoji: '🥗', bg: '#e8f5e9', accent: '#43a047' }
  if (/pasta|noodle|spaghetti|linguine|fettuccine|penne|rigatoni|lasagna/.test(t))
    return { emoji: '🍝', bg: '#fce4ec', accent: '#e91e63' }
  if (/pizza|flatbread/.test(t))
    return { emoji: '🍕', bg: '#fff8e1', accent: '#f9a825' }
  if (/burger|sandwich|wrap|taco|burrito|quesadilla/.test(t))
    return { emoji: '🌮', bg: '#fff3e0', accent: '#ef6c00' }
  if (/chicken|poultry|turkey/.test(t))
    return { emoji: '🍗', bg: '#fff8e1', accent: '#f9a825' }
  if (/fish|salmon|tuna|shrimp|prawn|seafood|cod|halibut|tilapia|curry.*fish|fish.*curry/.test(t))
    return { emoji: '🐟', bg: '#e3f2fd', accent: '#1e88e5' }
  if (/beef|steak|brisket|meatball/.test(t))
    return { emoji: '🥩', bg: '#fce4ec', accent: '#c62828' }
  if (/pork|bacon|ham|sausage/.test(t))
    return { emoji: '🥓', bg: '#fbe9e7', accent: '#d84315' }
  if (/egg|frittata|omelette|quiche|shakshuka/.test(t))
    return { emoji: '🍳', bg: '#fffde7', accent: '#f9a825' }
  if (/cake|cookie|brownie|muffin|cupcake|dessert|pie|tart|pudding|cheesecake/.test(t))
    return { emoji: '🍰', bg: '#fce4ec', accent: '#e91e63' }
  if (/bread|biscuit|scone|roll|loaf|baguette/.test(t))
    return { emoji: '🍞', bg: '#fff8e1', accent: '#f57f17' }
  if (/smoothie|juice|drink|cocktail|lemonade/.test(t))
    return { emoji: '🥤', bg: '#e3f2fd', accent: '#1e88e5' }
  if (/rice|risotto|pilaf|fried rice/.test(t))
    return { emoji: '🍚', bg: '#f3e5f5', accent: '#8e24aa' }
  if (/bean|lentil|chickpea|legume/.test(t))
    return { emoji: '🫘', bg: '#efebe9', accent: '#795548' }
  if (/veggie|vegetable|tofu|vegan|plant/.test(t))
    return { emoji: '🥦', bg: '#e8f5e9', accent: '#2e7d32' }
  if (/quinoa|grain|oat|farro/.test(t))
    return { emoji: '🌾', bg: '#f9fbe7', accent: '#9e9d24' }
  if (/lassi|smoothie|juice|drink|cocktail|lemonade/.test(t))
    return { emoji: '🥭', bg: '#fff8e1', accent: '#f9a825' }
  if (/breakfast|pancake|waffle|french toast|granola/.test(t))
    return { emoji: '🥞', bg: '#fff3e0', accent: '#f57c00' }
  if (/polenta|frico|fritter/.test(t))
    return { emoji: '🧀', bg: '#fffde7', accent: '#f9a825' }

  // Default — warm pink like the original
  return { emoji: '🍽️', bg: '#fce7ef', accent: '#e11d48' }
}

export default function RecipeCard({ recipe, onClick }) {
  const { emoji, bg, accent } = getMealStyle(recipe.title)

  return (
    <div
      className="recipe-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Photo or styled placeholder */}
      <div className="aspect-square overflow-hidden relative" style={{ background: bg }}>
        {recipe.photo_url ? (
          <>
            <img
              src={recipe.photo_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            {/* Fallback if photo fails */}
            <div className="w-full h-full items-center justify-center text-5xl absolute inset-0" style={{ display: 'none' }}>
              {emoji}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <span style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', lineHeight: 1 }}>{emoji}</span>
            {/* Accent bar at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b" style={{ background: accent }} />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2 mb-1">
          {recipe.title}
        </h3>
        <p className="text-xs truncate" style={{ color: recipe.source ? accent : 'transparent' }}>
          {recipe.source || '·'}
        </p>
      </div>
    </div>
  )
}
