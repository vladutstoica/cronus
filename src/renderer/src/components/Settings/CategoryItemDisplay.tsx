import { JSX } from 'react'
import { useDarkMode } from '../../hooks/useDarkMode'
import { getDarkerColor, getLighterColor, hexToRgba } from '../../lib/colors'

interface CategoryDisplayProps {
  name: string
  description?: string | null
  color?: string | null
  emoji?: string | null
  isArchived?: boolean
  actions: React.ReactNode
}

export function CategoryItemDisplay({
  name,
  description,
  color,
  emoji,
  isArchived,
  actions
}: CategoryDisplayProps): JSX.Element {
  const isDarkMode = useDarkMode()

  const textColor = color
    ? isDarkMode
      ? getLighterColor(color, 0.9)
      : getDarkerColor(color, 0.6)
    : undefined

  const backgroundColor = color
    ? isDarkMode
      ? hexToRgba(color, 0.28)
      : hexToRgba(color, 0.1)
    : undefined

  return (
    <div
      className="divide-border border rounded-lg p-2 hover:bg-accent transition-colors"
      style={{
        backgroundColor: isArchived ? 'transparent' : backgroundColor
      }}
    >
      <div className="flex items-center justify-between gap-x-4">
        <div className="flex items-center flex-1 min-w-0">
          <span className="text-lg mx-2 flex-shrink-0">{emoji}</span>
          <div className="flex-1 min-w-0">
            <p
              className="text-md font-medium truncate"
              style={{ color: isArchived ? 'text-muted-foreground' : textColor }}
            >
              {name}
            </p>
            {/* {description && (
              <p
                className="text-sm truncate opacity-70"
                style={{ color: isArchived ? 'text-muted-foreground' : textColor }}
              >
                {description}
              </p>
            )} */}
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center space-x-1 sm:space-x-2">{actions}</div>
      </div>
    </div>
  )
}
