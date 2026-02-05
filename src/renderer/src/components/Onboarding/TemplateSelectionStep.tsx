import {
  Check,
  Code,
  Layers,
  Palette,
  PenTool,
  Settings,
  Users,
} from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";

interface TemplateOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  sampleCategories: string[];
}

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: "developer",
    name: "Developer",
    description: "For software developers and engineers",
    icon: <Code className="w-6 h-6" />,
    sampleCategories: ["Coding", "Code Review", "Documentation", "DevOps"],
  },
  {
    id: "designer",
    name: "Designer",
    description: "For UI/UX and graphic designers",
    icon: <Palette className="w-6 h-6" />,
    sampleCategories: ["Design", "Prototyping", "Research", "Assets"],
  },
  {
    id: "manager",
    name: "Manager",
    description: "For team leads and project managers",
    icon: <Users className="w-6 h-6" />,
    sampleCategories: ["Meetings", "Planning", "Communication", "Reviews"],
  },
  {
    id: "writer",
    name: "Writer",
    description: "For content creators and journalists",
    icon: <PenTool className="w-6 h-6" />,
    sampleCategories: ["Writing", "Research", "Editing", "Publishing"],
  },
  {
    id: "simple",
    name: "Simple",
    description: "Basic 2-category system",
    icon: <Layers className="w-6 h-6" />,
    sampleCategories: ["Work", "Distraction"],
  },
];

interface TemplateSelectionStepProps {
  onComplete: (templateId: string | null) => void;
  onBack?: () => void;
}

export function TemplateSelectionStep({
  onComplete,
}: TemplateSelectionStepProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleSelectTemplate = (templateId: string | null) => {
    setSelectedTemplate(templateId);
    onComplete(templateId);
  };

  return (
    <div className="text-center space-y-6 flex flex-col items-center w-full max-w-2xl">
      <p className="text-md text-muted-foreground max-w-md mx-auto leading-relaxed">
        Choose a template that matches your profession to get pre-configured
        categories and rules for accurate activity tracking.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
        {TEMPLATE_OPTIONS.map((template) => (
          <button
            key={template.id}
            onClick={() => handleSelectTemplate(template.id)}
            className={cn(
              "relative flex flex-col items-start p-4 rounded-lg border transition-all duration-200",
              "hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              selectedTemplate === template.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500"
                : "border-border bg-muted/30",
            )}
            aria-pressed={selectedTemplate === template.id}
          >
            {selectedTemplate === template.id && (
              <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}

            <div
              className={cn(
                "p-2 rounded-lg mb-3",
                selectedTemplate === template.id
                  ? "bg-blue-500 text-white"
                  : "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
              )}
            >
              {template.icon}
            </div>

            <h3 className="font-semibold text-left text-foreground">
              {template.name}
            </h3>
            <p className="text-xs text-muted-foreground text-left mb-2">
              {template.description}
            </p>

            <div className="flex flex-wrap gap-1 mt-auto">
              {template.sampleCategories.map((category) => (
                <span
                  key={category}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {category}
                </span>
              ))}
            </div>
          </button>
        ))}

        {/* Custom option */}
        <button
          onClick={() => handleSelectTemplate(null)}
          className={cn(
            "relative flex flex-col items-start p-4 rounded-lg border transition-all duration-200",
            "hover:border-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/20",
            "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2",
            selectedTemplate === null
              ? "border-gray-500 bg-gray-50 dark:bg-gray-800/30 ring-2 ring-gray-500"
              : "border-border bg-muted/30",
          )}
          aria-pressed={selectedTemplate === null}
        >
          {selectedTemplate === null && (
            <div className="absolute top-2 right-2 bg-gray-500 rounded-full p-1">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}

          <div
            className={cn(
              "p-2 rounded-lg mb-3",
              selectedTemplate === null
                ? "bg-gray-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
            )}
          >
            <Settings className="w-6 h-6" />
          </div>

          <h3 className="font-semibold text-left text-foreground">Custom</h3>
          <p className="text-xs text-muted-foreground text-left mb-2">
            Set up categories manually later
          </p>

          <div className="flex flex-wrap gap-1 mt-auto">
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Start fresh
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
