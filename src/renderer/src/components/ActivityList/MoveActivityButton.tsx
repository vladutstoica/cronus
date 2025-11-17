import { PlusCircle } from 'lucide-react'
import { Category as SharedCategory } from '@shared/types'
import { getTimeRangeDescription } from '../../lib/activityMoving'
import { ActivityItem } from '../../lib/activityProcessing'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

interface MoveActivityButtonProps {
  activity: ActivityItem
  otherCategories: SharedCategory[]
  handleMoveActivity: (activity: ActivityItem, targetCategoryId: string) => void
  isMovingActivity: boolean
  selectedHour: number | null
  selectedDay: Date | null
  viewMode: 'day' | 'week'
  startDateMs: number | null
  endDateMs: number | null
  openDropdownActivityKey: string | null
  setOpenDropdownActivityKey: (key: string | null) => void
  activityKey: string
  setHoveredActivityKey: (key: string | null) => void
  onAddNewCategory: () => void
}

export const MoveActivityButton = ({
  activity,
  otherCategories,
  handleMoveActivity,
  isMovingActivity,
  selectedHour,
  selectedDay,
  viewMode,
  startDateMs,
  endDateMs,
  openDropdownActivityKey,
  setOpenDropdownActivityKey,
  activityKey,
  setHoveredActivityKey,
  onAddNewCategory
}: MoveActivityButtonProps) => {
  const activeCategories = otherCategories.filter((c) => !c.isArchived)

  if (activeCategories.length === 1) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-5 px-2 py-1 text-xs"
        onClick={(e) => {
          e.stopPropagation()
          handleMoveActivity(activity, activeCategories[0]._id)
        }}
        disabled={isMovingActivity}
      >
        {isMovingActivity
          ? 'Moving...'
          : `Move: ${activeCategories[0].name.substring(0, 10)}${
              activeCategories[0].name.length > 10 ? '...' : ''
            }`}
      </Button>
    )
  }

  return (
    <DropdownMenu
      open={openDropdownActivityKey === activityKey}
      onOpenChange={(isOpen) => {
        setOpenDropdownActivityKey(isOpen ? activityKey : null)
        if (!isOpen) {
          setHoveredActivityKey(null)
        }
      }}
    >
      <Tooltip delayDuration={250}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-5 px-2 py-1 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              Move to...
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          Move this activity to another category{' '}
          {getTimeRangeDescription(selectedHour, selectedDay, viewMode, startDateMs, endDateMs)}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        collisionPadding={{ top: 40 }}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {' '}
        {activeCategories.map((targetCat) => (
          <DropdownMenuItem
            key={targetCat._id}
            onClick={(e) => {
              e.stopPropagation()
              handleMoveActivity(activity, targetCat._id)
            }}
            disabled={isMovingActivity}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: targetCat.color }} />
              {targetCat.name}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            onAddNewCategory()
          }}
        >
          <span className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Create new category
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
