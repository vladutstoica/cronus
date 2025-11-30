import { PlusCircle } from "lucide-react";
import { ComparableCategory } from "@shared/categories";
import { Category } from "@shared/types";
import { Button } from "../ui/button";
import { CategoryItemDisplay } from "./CategoryItemDisplay";

type CategoryTemplateListProps = {
  onAdd: (
    category: Omit<Category, "_id" | "userId" | "createdAt" | "updatedAt">,
  ) => void;
  onCancel: () => void;
  existingCategories: Category[];
  isSaving: boolean;
};

export const templateCategories: ComparableCategory[] = [
  {
    name: "Contracting for XYZ",
    description:
      "Working on a project for Contractor work for XYZ including meetings, emails, etc. related to that project",
    color: "#22C55E",
    isProductive: true,
    isDefault: false,
  },
  {
    name: "Coding",
    description:
      "Writing or reviewing code, debugging, working in IDEs or terminals",
    color: "#3B82F6",
    isProductive: true,
    isDefault: false,
  },
  {
    name: "Design",
    description:
      "Working in design tools like Figma or Illustrator on UX/UI or visual assets",
    color: "#8B5CF6",
    isProductive: true,
    isDefault: false,
  },
  {
    name: "Product Management",
    description:
      "Planning features, writing specs, managing tickets, reviewing user feedback",
    color: "#10B981",
    isProductive: true,
    isDefault: false,
  },
  {
    name: "Fundraising",
    description:
      "Pitching to investors, refining decks, writing emails or grant applications",
    color: "#F97316",
    isProductive: true,
    isDefault: false,
  },
  {
    name: "Growth & Marketing",
    description:
      "Working on campaigns, analytics, user acquisition, SEO or outreach",
    color: "#EAB308",
    isProductive: true,
    isDefault: false,
  },
  {
    name: "Work Communication",
    description:
      "Responding to emails, Slack, Notion, meetings or async updates",
    color: "#0EA5E9",
    isProductive: true,
    isDefault: false,
  },
  {
    name: "Distraction",
    description:
      "Scrolling social media, browsing unrelated content, or idle clicking",
    color: "#EC4899",
    isProductive: false,
    isDefault: false,
  },
  {
    name: "Dating",
    description:
      "Using dating apps, messaging, browsing profiles, or going on dates",
    color: "#F43F5E",
    isProductive: false,
    isDefault: false,
  },
  {
    name: "Eating & Shopping",
    description:
      "Eating meals, cooking, groceries, or online/in-person shopping",
    color: "#D97706",
    isProductive: false,
    isDefault: false,
  },
  {
    name: "Sport & Health",
    description: "Exercising, walking, gym, sports, wellness, etc.",
    color: "#6366F1",
    isProductive: true,
    isDefault: false,
  },
  {
    name: "Friends & Social",
    description:
      "Spending time with friends or socializing in person or online",
    color: "#A855F7",
    isProductive: false,
    isDefault: false,
  },
  {
    name: "Planning & Reflection",
    description: "Journaling, reflecting on goals, or reviewing personal plans",
    color: "#84CC16",
    isProductive: true,
    isDefault: false,
  },
  {
    name: "Commuting",
    description: "Traveling to or from work, errands, or social events",
    color: "#6B7280",
    isProductive: false,
    isDefault: false,
  },
];

export function CategoryTemplateList({
  onAdd,
  onCancel,
  existingCategories,
  isSaving,
}: CategoryTemplateListProps) {
  const existingCategoryNames = new Set(
    existingCategories.map((c) => c.name.toLowerCase()),
  );

  const availableTemplates = templateCategories.filter(
    (template) => !existingCategoryNames.has(template.name.toLowerCase()),
  );

  return (
    <div>
      <div className="flex justify-end">
        <Button onClick={onCancel} variant="outline" size="sm">
          Back to Categories
        </Button>
      </div>
      <div className="space-y-2 mt-4">
        {availableTemplates.map((template) => {
          return (
            <CategoryItemDisplay
              key={template.name}
              name={template.name}
              color={template.color}
              actions={
                <Button
                  variant="ghost"
                  onClick={() => onAdd(template)}
                  size="icon"
                  className="h-8 w-8"
                  disabled={isSaving}
                >
                  <PlusCircle size={16} />
                </Button>
              }
            />
          );
        })}
        {availableTemplates.length === 0 && (
          <div className="text-center py-8 px-4 bg-muted/50 rounded-lg border border-dashed border-border">
            <h3 className="text-sm font-medium text-foreground">
              All templates already added
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;ve already added all available templates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
