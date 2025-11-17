import { PlusCircle } from 'lucide-react'
import { Category as SharedCategory } from '@shared/types'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'

interface MoveSelectedActivitiesButtonProps {
  otherCategories: SharedCategory[]
  handleMove: (targetCategoryId: string) => void
  isMoving: boolean
  onAddNewCategory: () => void
}

export const MoveSelectedActivitiesButton = ({
  otherCategories,
  handleMove,
  isMoving,
  onAddNewCategory
}: MoveSelectedActivitiesButtonProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 px-2 py-1 text-xs" disabled={isMoving}>
          {isMoving ? 'Moving...' : 'Move selected'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {otherCategories
          .filter((c) => !c.isArchived)
          .map((targetCat) => (
            <DropdownMenuItem
              key={targetCat._id}
              onClick={() => handleMove(targetCat._id)}
              disabled={isMoving}
            >
              <span className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: targetCat.color }}
                />
                {targetCat.name}
              </span>
            </DropdownMenuItem>
          ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onAddNewCategory}>
          <span className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Create new category
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
