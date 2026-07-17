import { CATEGORY_EMOJI } from '@/lib/emoji'

interface CategorySidebarProps {
  categories: string[]
  active: string
  onSelect: (cat: string) => void
}

export function CategorySidebar({ categories, active, onSelect }: CategorySidebarProps) {
  return (
    <nav className="shrink-0 w-24 sm:w-32 lg:w-40 border-r border-border/60 bg-card/30 flex flex-col py-3 gap-1 overflow-y-auto scrollbar-verve">
      {categories.map((cat) => {
        const isActive = active === cat
        const emoji = CATEGORY_EMOJI[cat] ?? '🍽️'
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`flex flex-col items-center gap-1.5 px-2 py-3 mx-2 rounded-xl transition-all ${
              isActive
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="text-2xl sm:text-3xl leading-none" aria-hidden>{emoji}</span>
            <span className="text-[11px] sm:text-xs font-medium leading-tight text-center">{cat}</span>
          </button>
        )
      })}
    </nav>
  )
}
