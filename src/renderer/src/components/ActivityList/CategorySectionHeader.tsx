import { formatDuration } from '@renderer/lib/timeFormatting'
import { XIcon } from 'lucide-react'
import React from 'react'
import { Category as SharedCategory } from '@shared/types'
import { useDarkMode } from '../../hooks/useDarkMode'
import type { ProcessedCategory } from '../../lib/activityProcessing'
import { getDarkerColor, getLighterColor, hexToRgba } from '../../lib/colors'
import { CategoryBadge } from '../CategoryBadge'
import { Button } from '../ui/button'
import { MoveSelectedActivitiesButton } from './MoveSelectedActivitiesButton'

interface CategorySectionHeaderProps {
  category: ProcessedCategory
  variant?: 'default' | 'empty'
  isAnyActivitySelected?: boolean
  otherCategories?: SharedCategory[]
  isMovingActivity?: boolean
  handleMoveSelected?: (targetCategoryId: string) => void
  handleClearSelection?: () => void
  onAddNewCategory?: () => void
}

export const CategorySectionHeader: React.FC<CategorySectionHeaderProps> = ({
  category,
  variant = 'default',
  isAnyActivitySelected,
  otherCategories,
  isMovingActivity,
  handleMoveSelected,
  handleClearSelection,
  onAddNewCategory
}) => {
  const isDarkMode = useDarkMode()

  const showMoveButton =
    isAnyActivitySelected &&
    otherCategories &&
    otherCategories.length > 0 &&
    handleMoveSelected &&
    isMovingActivity !== undefined &&
    onAddNewCategory

  // Get emoji for the category
  const categoryEmoji = category.emoji

  // Calculate text color based on category color and theme - same logic as other components
  const textColor = category.color
    ? isDarkMode
      ? getLighterColor(category.color, 0.8)
      : getDarkerColor(category.color, 0.6)
    : undefined
  // Use lighter color for background
  const backgroundColor = category.color
    ? isDarkMode
      ? hexToRgba(category.color, 0.3)
      : hexToRgba(category.color, 0.1)
    : undefined

  const renderButtons = () => {
    if (!showMoveButton) return null
    return (
      <div className="flex items-center gap-2">
        <MoveSelectedActivitiesButton
          otherCategories={otherCategories}
          handleMove={handleMoveSelected}
          isMoving={isMovingActivity}
          onAddNewCategory={onAddNewCategory}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleClearSelection}
          aria-label="Clear selection"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  if (variant === 'empty') {
    return (
      <div className="sticky top-0 z-10 flex select-none items-center justify-between border-b border-border bg-card py-2 pl-2">
        <div className="flex items-center">
          <span className="mr-2 text-lg">{categoryEmoji}</span>
          <h3 className="text-md font-semibold" style={{ color: textColor }}>
            {category.name.toUpperCase()}
          </h3>
        </div>
        {showMoveButton ? (
          renderButtons()
        ) : (
          <span className="text-md font-semibold text-foreground">
            {formatDuration(category.totalDurationMs)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-10 flex select-none items-center justify-between border-b border-border bg-card py-2">
      <div className="flex items-center">
        <CategoryBadge
          category={{ name: category.name, color: category.color, emoji: category.emoji }}
        />
      </div>
      {showMoveButton ? (
        renderButtons()
      ) : (
        <span className="text-md font-semibold text-foreground">
          {formatDuration(category.totalDurationMs)}
        </span>
      )}
    </div>
  )
}
