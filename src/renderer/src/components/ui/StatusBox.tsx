import clsx from 'clsx'
import { EditIcon } from 'lucide-react'
import React, { useState } from 'react'
import { Category } from '@shared/types'

interface StatusBoxProps {
  label: string
  time: string // Placeholder for now, e.g., "00:00:00"
  isHighlighted: boolean // Determines if this box should use its highlight color and be prominent
  highlightColor?: 'green' | 'red' | 'orange'
  isEnlarged: boolean // Determines if this box takes more space
  categoryDetails?: Category
  onCategoryClick?: () => void
  disabled?: boolean
}

const StatusBox: React.FC<StatusBoxProps> = ({
  label,
  time,
  isHighlighted,
  highlightColor,
  isEnlarged,
  categoryDetails,
  onCategoryClick,
  disabled
}) => {
  const [isHovered, setIsHovered] = useState(false)

  // Default styles for non-highlighted state
  let timeColorCls = 'text-foreground'
  let borderColorCls = 'border-border'
  let labelColorCls = 'text-muted-foreground'

  if (isHighlighted) {
    // Highlighted state overrides
    labelColorCls = 'text-primary' // Label is always primary when highlighted

    if (highlightColor) {
      borderColorCls = `border-${highlightColor}-500`
      switch (highlightColor) {
        case 'green':
          timeColorCls = 'text-green-300'
          break
        case 'red':
          timeColorCls = 'text-red-300'
          break
        case 'orange':
          timeColorCls = 'text-orange-300'
          break
      }
    } else {
      // Fallback if highlighted but no specific R/G/O color
      timeColorCls = 'text-primary'
      borderColorCls = 'border-primary'
    }
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        'px-0.5 rounded-md border flex items-center bg-secondary justify-center h-full transition-all duration-300 ease-in-out relative',
        borderColorCls,
        isEnlarged ? 'flex-auto gap-2  py-[1.5px]' : 'flex-col justify-center w-[32%] py-0.5',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {isEnlarged && (
        <span
          className={clsx(
            'font-sm font-medium flex flex-row items-center gap-1',
            labelColorCls,
            isEnlarged && 'pr-2'
          )}
          style={{ fontSize: isEnlarged ? '0.75rem' : '9px' }}
        >
          {isHovered && isEnlarged && (
            <span className="edit-icon-area rounded-md p-2 hover:bg-white/10">
              <EditIcon
                onClick={(e) => {
                  if (!disabled) {
                    e.stopPropagation()
                    onCategoryClick?.()
                  }
                }}
                size={12}
                className="text-muted-foreground cursor-pointer hover:text-primary"
              />
            </span>
          )}
          <span className="truncate w-full max-w-[80px]">
            {label}
          </span>
        </span>
      )}
      <span
        className={clsx(
          'font-mono pointer-events-none',
          timeColorCls,
          isEnlarged ? 'text-xl font-semibold' : 'text-md text-primary py-[1.5px]'
        )}
      >
        {time}
      </span>
    </div>
  )
}

export default StatusBox
