import {
  AppWindow,
  Info,
  Palette,
  Settings,
  Shield,
  Tags,
} from "lucide-react";
import { cn } from "../../lib/utils";

export type SettingsSection =
  | "general"
  | "categories"
  | "appearance"
  | "apps"
  | "privacy"
  | "about";

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const menuItems: {
  id: SettingsSection;
  label: string;
  icon: React.ElementType;
  badge?: string;
}[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "apps", label: "Apps", icon: AppWindow },
  { id: "privacy", label: "Privacy", icon: Shield, badge: "Beta" },
  { id: "about", label: "About", icon: Info, badge: "Beta" },
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
            {item.badge && (
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
