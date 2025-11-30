import {
  AppWindow,
  Brain,
  Info,
  Palette,
  Settings,
  Tags,
} from "lucide-react";
import { cn } from "../../lib/utils";

export type SettingsSection =
  | "general"
  | "categories"
  | "appearance"
  | "apps"
  | "about";

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const menuItems: {
  id: SettingsSection;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "apps", label: "Apps", icon: AppWindow },
  { id: "about", label: "About", icon: Info },
];

export function SettingsSidebar({
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  return (
    <nav className="flex flex-col gap-1 w-44 flex-shrink-0">
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
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
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
