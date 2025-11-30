import { JSX } from "react";

interface CategoryDisplayProps {
  name: string;
  description?: string | null;
  color?: string | null;
  isArchived?: boolean;
  actions: React.ReactNode;
}

export function CategoryItemDisplay({
  name,
  color,
  isArchived,
  actions,
}: CategoryDisplayProps): JSX.Element {
  return (
    <div className="flex items-center justify-between py-3 px-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color || "#6b7280" }}
        />
        <span
          className={`text-sm font-medium truncate ${isArchived ? "text-muted-foreground" : ""}`}
        >
          {name}
        </span>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1">
        {actions}
      </div>
    </div>
  );
}
