import type { ReactNode } from "react";

export type CommandCategory = "navigation" | "action" | "category";

export interface CommandItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  category: CommandCategory;
  keywords?: string[];
  onSelect: () => void;
}

export interface CommandGroup {
  category: CommandCategory;
  label: string;
  items: CommandItem[];
}
