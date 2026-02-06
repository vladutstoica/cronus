/**
 * Provider Selection Step
 *
 * First step of the integration wizard where users choose
 * which providers (Jira, Linear, or both) to connect.
 */

import { Check } from "lucide-react";
import type { TaskProvider } from "../../../../shared/taskTypes";
import { cn } from "../../lib/utils";
import { Card } from "../ui/card";
import type { ProviderSelectionState } from "./types";

// SVG icons for providers
const JiraIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-10 h-10"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23 0z" />
  </svg>
);

const LinearIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-10 h-10"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M3.532 12.87a9.194 9.194 0 0 1-.5-2.378L.014 13.51c.1 1.44.465 2.81 1.065 4.066l2.453-4.706zm.638-3.49c.122-.508.28-1.002.473-1.479L1.72 5.078a11.893 11.893 0 0 0-1.24 3.574l3.69.729zM12 2.805c.37 0 .735.02 1.097.058l2.023-3.014A12.03 12.03 0 0 0 12 0c-.98 0-1.936.117-2.848.339l.717 3.933c.7-.303 1.47-.467 2.13-.467zm6.535 1.52a9.17 9.17 0 0 1 1.65 1.49l2.935-2.17a11.944 11.944 0 0 0-2.936-2.618l-1.649 3.298zm3.95 5.198a9.097 9.097 0 0 1 .315 2.377l3.019 2.023c.119-1.05.12-2.115.003-3.167l-3.337-1.233zm-1.45 7.006a9.19 9.19 0 0 1-1.195 1.756l1.825 3.3a11.905 11.905 0 0 0 2.267-3.133l-2.897-1.923zm-4.988 4.05a9.252 9.252 0 0 1-2.147.621l-.32 3.783c1.38-.096 2.72-.413 3.98-.928l-1.513-3.476zm-7.595-1.102a9.118 9.118 0 0 1-1.717-1.193l-2.886 1.967a11.88 11.88 0 0 0 3.096 2.24l1.507-3.014zM12 18.205a6.205 6.205 0 1 1 0-12.41 6.205 6.205 0 0 1 0 12.41z" />
  </svg>
);

interface ProviderCardProps {
  id: TaskProvider;
  name: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onToggle: () => void;
}

function ProviderCard({
  name,
  description,
  icon,
  selected,
  onToggle,
}: ProviderCardProps) {
  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all duration-200 hover:border-primary/50",
        "p-6 flex items-start gap-4",
        selected && "border-primary bg-primary/5",
      )}
      onClick={onToggle}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30",
        )}
      >
        {selected && <Check className="w-4 h-4" />}
      </div>

      {/* Provider icon */}
      <div
        className={cn(
          "flex-shrink-0 p-3 rounded-lg",
          selected
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </div>

      {/* Provider info */}
      <div className="flex-1 min-w-0 pr-8">
        <h3 className="text-lg font-semibold text-foreground">{name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </Card>
  );
}

interface ProviderSelectionProps {
  selectedProviders: ProviderSelectionState;
  onProviderToggle: (provider: TaskProvider) => void;
}

export function ProviderSelection({
  selectedProviders,
  onProviderToggle,
}: ProviderSelectionProps) {
  const providers = [
    {
      id: "jira" as TaskProvider,
      name: "Jira",
      description:
        "Connect your Atlassian Jira account to track time against issues and sync worklogs.",
      icon: <JiraIcon />,
    },
    {
      id: "linear" as TaskProvider,
      name: "Linear",
      description:
        "Connect your Linear workspace to track time against issues and manage your work.",
      icon: <LinearIcon />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Connect Your Tools
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Choose which project management tools you want to integrate with
          Cronus. You can connect multiple tools.
        </p>
      </div>

      <div className="space-y-4 max-w-lg mx-auto">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            {...provider}
            selected={selectedProviders[provider.id]}
            onToggle={() => onProviderToggle(provider.id)}
          />
        ))}
      </div>

      {!selectedProviders.jira && !selectedProviders.linear && (
        <p className="text-center text-sm text-muted-foreground">
          Select at least one provider to continue
        </p>
      )}
    </div>
  );
}
