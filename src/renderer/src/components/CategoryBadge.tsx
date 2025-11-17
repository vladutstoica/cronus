import { X } from 'lucide-react'
import React from 'react'
import { useDarkMode } from '../hooks/useDarkMode'
import { getDarkerColor, getLighterColor, hexToRgba } from '../lib/colors'

interface CategoryBadgeProps {
  category: {
    name: string
    color: string
    emoji?: string
  }
  className?: string
  onClear?: () => void
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, className, onClear }) => {
  const { name, color, emoji } = category
  const isDarkMode = useDarkMode()

  const textColor = color
    ? isDarkMode
      ? getLighterColor(color, 0.8)
      : getDarkerColor(color, 0.6)
    : undefined

  const backgroundColor = color
    ? isDarkMode
      ? hexToRgba(color, 0.3)
      : hexToRgba(color, 0.1)
    : undefined

  return (
    <div
      className={`px-2 py-1 rounded-md text-sm font-medium transition-all overflow-hidden flex items-center gap-2 w-fit whitespace-nowrap ${className}`}
      style={{
        backgroundColor: backgroundColor,
        color: textColor
      }}
    >
      {emoji && <span className="text-base">{emoji}</span>}
      <span>{name}</span>
      {onClear && (
        <button
          type="button"
          className="ml-1 -mr-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={onClear}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
