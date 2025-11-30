import {
  Archive,
  ArchiveRestore,
  Edit3,
  MoreHorizontal,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { JSX } from "react";
import { Category } from "@shared/types";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { CategoryItemDisplay } from "./CategoryItemDisplay";

interface CategoryListItemProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onToggleProductive: (category: Category) => void;
  onToggleArchive: (category: Category) => void;
  isDeleting: boolean;
  isUpdating: boolean;
}

export function CategoryListItem({
  category,
  onEdit,
  onDelete,
  onToggleProductive,
  onToggleArchive,
  isDeleting,
  isUpdating,
}: CategoryListItemProps): JSX.Element {
  return (
    <CategoryItemDisplay
      name={category.name}
      color={category.color}
      isArchived={category.isArchived}
      actions={
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(category)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Edit category"
            disabled={isUpdating}
          >
            <Edit3 size={16} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                disabled={isUpdating || isDeleting}
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onToggleProductive(category)}
                disabled={isUpdating}
                className="flex items-center cursor-pointer"
              >
                {category.isProductive ? (
                  <ToggleRight size={16} className="mr-2 text-green-500" />
                ) : (
                  <ToggleLeft size={16} className="mr-2 text-red-500" />
                )}
                <span>
                  {category.isProductive
                    ? "Mark as non-productive"
                    : "Mark as productive"}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleArchive(category)}
                disabled={isUpdating}
                className="flex items-center cursor-pointer"
              >
                {category.isArchived ? (
                  <ArchiveRestore size={16} className="mr-2" />
                ) : (
                  <Archive size={16} className="mr-2" />
                )}
                <span>{category.isArchived ? "Unarchive" : "Archive"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(category._id)}
                disabled={isDeleting}
                className="flex items-center cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 size={16} className="mr-2" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}
