import {
  Archive,
  ArchiveRestore,
  Edit3,
  MoreHorizontal,
  ToggleLeft,
  ToggleRight,
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
  onToggleProductive,
  onToggleArchive,
  isDeleting,
  isUpdating,
}: CategoryListItemProps): JSX.Element {
  return (
    <CategoryItemDisplay
      name={category.name}
      description={category.description}
      color={category.color}
      emoji={category.emoji}
      isArchived={category.isArchived}
      actions={
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(category)}
            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-background focus:ring-primary"
            title="Edit category"
            disabled={isUpdating}
          >
            <Edit3 size={18} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="p-1.5 text-muted-foreground data-[state=open]:bg-primary/20 data-[state=open]:text-primary"
                disabled={isUpdating || isDeleting}
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onToggleProductive(category)}
                disabled={isUpdating}
                className="flex items-center cursor-pointer"
              >
                {category.isProductive ? (
                  <ToggleRight size={18} className="mr-2 text-green-500" />
                ) : (
                  <ToggleLeft size={18} className="mr-2 text-red-500" />
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
                  <ArchiveRestore size={18} className="mr-2" />
                ) : (
                  <Archive size={18} className="mr-2" />
                )}
                <span>{category.isArchived ? "Unarchive" : "Archive"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}
