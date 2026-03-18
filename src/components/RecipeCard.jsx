export default function RecipeCard({ recipe, onClick }) {
  return (
    <div
      className="recipe-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Photo or placeholder */}
      <div className="aspect-square overflow-hidden" style={{ background: '#fce7ef' }}>
        {recipe.photo_url ? (
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
        ) : null}
        <div
          className="w-full h-full items-center justify-center text-3xl"
          style={{ display: recipe.photo_url ? 'none' : 'flex' }}
        >
          📖
        </div>
      </div>

      {/* Text */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2 mb-1">
          {recipe.title}
        </h3>
        {recipe.source && (
          <p className="text-gray-400 text-xs truncate">{recipe.source}</p>
        )}
      </div>
    </div>
  )
}
