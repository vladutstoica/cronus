import { Command, Keyboard } from "lucide-react";
import type { ReactElement } from "react";
import { useMemo } from "react";
import type { KeyboardShortcut } from "../hooks/useKeyboardShortcuts";
import { cn } from "../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

type ShortcutCategory = "navigation" | "actions" | "general";

interface ShortcutGroup {
  category: ShortcutCategory;
  label: string;
  shortcuts: KeyboardShortcut[];
}

const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  navigation: "Navigation",
  actions: "Actions",
  general: "General",
};

const CATEGORY_ORDER: ShortcutCategory[] = ["navigation", "actions", "general"];

/**
 * Renders a keyboard shortcut key badge
 */
function KeyBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): ReactElement {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center min-w-[24px] h-6 px-2",
        "bg-muted border border-border rounded",
        "text-xs font-mono text-muted-foreground",
        "shadow-sm",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/**
 * Renders a keyboard shortcut with its keys
 */
function ShortcutDisplay({
  shortcut,
}: {
  shortcut: KeyboardShortcut;
}): ReactElement {
  // Parse the shortcut label to display individual keys
  const parts = shortcut.label.split("+");

  return (
    <div className="flex items-center gap-1">
      {parts.map((part, index) => {
        // Replace Cmd with the Command symbol
        const displayPart =
          part.toLowerCase() === "cmd" ? (
            <Command size={12} aria-hidden="true" />
          ) : (
            part
          );

        return (
          <KeyBadge key={index}>
            {displayPart}
          </KeyBadge>
        );
      })}
    </div>
  );
}

/**
 * Renders a single shortcut row
 */
function ShortcutRow({
  shortcut,
}: {
  shortcut: KeyboardShortcut;
}): ReactElement {
  return (
    <div className="flex items-center justify-between py-2 px-1">
      <span className="text-sm text-foreground">{shortcut.description}</span>
      <ShortcutDisplay shortcut={shortcut} />
    </div>
  );
}

/**
 * Renders a group of shortcuts with a category header
 */
function ShortcutGroupSection({
  group,
}: {
  group: ShortcutGroup;
}): ReactElement {
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
        {group.label}
      </h3>
      <div className="divide-y divide-border rounded-md border border-border bg-card">
        {group.shortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.id} shortcut={shortcut} />
        ))}
      </div>
    </div>
  );
}

/**
 * Dialog component that displays all available keyboard shortcuts.
 * Shows shortcuts grouped by category (Navigation, Actions, General).
 */
export function KeyboardShortcutsHelp({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutsHelpProps): ReactElement {
  // Group shortcuts by category, filtering out duplicates (e.g., ? and Cmd+/)
  const groupedShortcuts = useMemo<ShortcutGroup[]>(() => {
    const groups: ShortcutGroup[] = [];
    const seenDescriptions = new Set<string>();

    for (const category of CATEGORY_ORDER) {
      const categoryShortcuts = shortcuts.filter((s) => {
        if (s.category !== category) return false;
        // Skip duplicate descriptions (e.g., both ? and Cmd+/ open shortcuts help)
        if (seenDescriptions.has(s.description)) return false;
        seenDescriptions.add(s.description);
        return true;
      });

      if (categoryShortcuts.length > 0) {
        groups.push({
          category,
          label: CATEGORY_LABELS[category],
          shortcuts: categoryShortcuts,
        });
      }
    }

    return groups;
  }, [shortcuts]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        aria-describedby="shortcuts-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard size={20} aria-hidden="true" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription id="shortcuts-description">
            Use these keyboard shortcuts to navigate and control Cronus quickly.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="py-2">
            {groupedShortcuts.map((group) => (
              <ShortcutGroupSection key={group.category} group={group} />
            ))}
          </div>
        </ScrollArea>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Press <KeyBadge>Esc</KeyBadge> to close this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
