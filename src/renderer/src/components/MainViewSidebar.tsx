import { BarChart3, CheckSquare, LayoutDashboard } from "lucide-react";
import { cn } from "../lib/utils";

export type MainSection = "dashboard" | "todos" | "stats";

interface MainViewSidebarProps {
  activeSection: MainSection;
  onSectionChange: (section: MainSection) => void;
}

const menuItems: {
  id: MainSection;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "todos", label: "Todos", icon: CheckSquare },
  { id: "stats", label: "Stats", icon: BarChart3 },
];

export function MainViewSidebar({
  activeSection,
  onSectionChange,
}: MainViewSidebarProps) {
  return (
    <nav className="flex flex-col gap-1 w-32 flex-shrink-0">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-left",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon size={18} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
