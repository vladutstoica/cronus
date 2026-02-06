import {
  ArrowDown,
  ArrowUp,
  Edit3,
  Filter,
  Loader2,
  MoreHorizontal,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { JSX, memo, useEffect, useState } from "react";
import type {
  CategorizationRule,
  CreateCategorizationRuleInput,
  UpdateCategorizationRuleInput,
} from "@shared/categorizationTypes";
import type { Category } from "@shared/types";
import { useAuth } from "../../../contexts/AuthContext";
import { localApi } from "../../../lib/localApi";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Switch } from "../../ui/switch";
import { RuleEditor } from "./RuleEditor";

// TODO: Add these IPC handlers to localApi
// window.api.getRules() - Get all rules for user
// window.api.createRule(rule) - Create new rule
// window.api.updateRule(id, updates) - Update rule
// window.api.deleteRule(id) - Delete rule

/** Stub API for rules until IPC handlers are implemented */
const rulesApi = {
  getAll: async (): Promise<CategorizationRule[]> => {
    // TODO: Implement IPC handler
    // return window.electron.ipcRenderer.invoke("local:get-rules");
    console.warn("rulesApi.getAll: IPC handler not yet implemented");
    return [];
  },
  create: async (
    rule: CreateCategorizationRuleInput,
  ): Promise<CategorizationRule> => {
    // TODO: Implement IPC handler
    // return window.electron.ipcRenderer.invoke("local:create-rule", rule);
    console.warn("rulesApi.create: IPC handler not yet implemented", rule);
    throw new Error("IPC handler not yet implemented: local:create-rule");
  },
  update: async (
    id: number,
    updates: Partial<UpdateCategorizationRuleInput>,
  ): Promise<CategorizationRule> => {
    // TODO: Implement IPC handler
    // return window.electron.ipcRenderer.invoke("local:update-rule", id, updates);
    console.warn("rulesApi.update: IPC handler not yet implemented", {
      id,
      updates,
    });
    throw new Error("IPC handler not yet implemented: local:update-rule");
  },
  delete: async (id: number): Promise<void> => {
    // TODO: Implement IPC handler
    // return window.electron.ipcRenderer.invoke("local:delete-rule", id);
    console.warn("rulesApi.delete: IPC handler not yet implemented", id);
    throw new Error("IPC handler not yet implemented: local:delete-rule");
  },
};

interface RuleListItemProps {
  rule: CategorizationRule;
  category: Category | undefined;
  onEdit: (rule: CategorizationRule) => void;
  onDelete: (id: number) => void;
  onToggleEnabled: (rule: CategorizationRule) => void;
  onMovePriority: (rule: CategorizationRule, direction: "up" | "down") => void;
  isFirst: boolean;
  isLast: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

function RuleListItem({
  rule,
  category,
  onEdit,
  onDelete,
  onToggleEnabled,
  onMovePriority,
  isFirst,
  isLast,
  isUpdating,
  isDeleting,
}: RuleListItemProps): JSX.Element {
  const isLoading = isUpdating || isDeleting;

  return (
    <div
      className={`flex items-center justify-between p-4 border rounded-lg ${
        rule.isEnabled ? "bg-background" : "bg-muted/50 opacity-75"
      }`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Enable/Disable Switch */}
        <Switch
          checked={rule.isEnabled}
          onCheckedChange={() => onToggleEnabled(rule)}
          disabled={isLoading}
          aria-label={rule.isEnabled ? "Disable rule" : "Enable rule"}
        />

        {/* Rule Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{rule.name}</span>
            {rule.isSystem && (
              <Badge variant="secondary" className="text-xs">
                System
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {rule.conditionLogic}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {category && (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {category.name}
                </span>
              </div>
            )}
            <span className="text-sm text-muted-foreground">
              {rule.conditions.length} condition
              {rule.conditions.length !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-muted-foreground">
              Priority: {rule.priority}
            </span>
            {rule.matchCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {rule.matchCount} match{rule.matchCount !== 1 ? "es" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Priority arrows */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMovePriority(rule, "up")}
          disabled={isFirst || isLoading}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Increase priority"
          aria-label="Increase priority"
        >
          <ArrowUp size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMovePriority(rule, "down")}
          disabled={isLast || isLoading}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Decrease priority"
          aria-label="Decrease priority"
        >
          <ArrowDown size={16} />
        </Button>

        {/* Edit button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(rule)}
          disabled={isLoading}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Edit rule"
          aria-label="Edit rule"
        >
          <Edit3 size={16} />
        </Button>

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={isLoading}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onDelete(rule.id)}
              disabled={rule.isSystem || isDeleting}
              className="flex items-center cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 size={16} className="mr-2" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export const RuleList = memo(function RuleList(): JSX.Element {
  const { isAuthenticated } = useAuth();

  // Data state
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CategorizationRule | null>(
    null,
  );

  // Operation state
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Load data
  const loadData = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const [rulesData, categoriesData] = await Promise.all([
        rulesApi.getAll(),
        localApi.categories.getAll(),
      ]);
      setRules(rulesData);
      setCategories(categoriesData as Category[]);
      setFetchError(null);
    } catch (error) {
      console.error("Error loading rules:", error);
      setFetchError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  // Handlers
  const handleAddNew = () => {
    setEditingRule(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (rule: CategorizationRule) => {
    setEditingRule(rule);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingRule(null);
  };

  const handleSaveRule = async (
    ruleData: CreateCategorizationRuleInput | UpdateCategorizationRuleInput,
  ) => {
    setIsSaving(true);
    try {
      if ("id" in ruleData && ruleData.id !== undefined) {
        // Update existing rule
        await rulesApi.update(ruleData.id, ruleData);
      } else {
        // Create new rule
        await rulesApi.create(ruleData as CreateCategorizationRuleInput);
      }
      await loadData();
      handleCloseEditor();
    } catch (error) {
      console.error("Error saving rule:", error);
      alert(
        `Error saving rule: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this rule?")) return;

    setDeletingId(id);
    try {
      await rulesApi.delete(id);
      await loadData();
    } catch (error) {
      console.error("Error deleting rule:", error);
      alert(
        `Error deleting rule: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleEnabled = async (rule: CategorizationRule) => {
    setUpdatingId(rule.id);
    try {
      await rulesApi.update(rule.id, { isEnabled: !rule.isEnabled });
      await loadData();
    } catch (error) {
      console.error("Error toggling rule:", error);
      alert(
        `Error toggling rule: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMovePriority = async (
    rule: CategorizationRule,
    direction: "up" | "down",
  ) => {
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
    const currentIndex = sortedRules.findIndex((r) => r.id === rule.id);

    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === sortedRules.length - 1)
    ) {
      return;
    }

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const targetRule = sortedRules[targetIndex];

    // Swap priorities
    setUpdatingId(rule.id);
    try {
      await Promise.all([
        rulesApi.update(rule.id, { priority: targetRule.priority }),
        rulesApi.update(targetRule.id, { priority: rule.priority }),
      ]);
      await loadData();
    } catch (error) {
      console.error("Error reordering rules:", error);
      alert(
        `Error reordering rules: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter rules
  const filteredRules = rules
    .filter((rule) => {
      if (categoryFilter === "all") return true;
      return rule.categoryId === categoryFilter;
    })
    .sort((a, b) => b.priority - a.priority);

  // Category lookup
  const categoryMap = new Map(categories.map((c) => [c._id, c]));
  const activeCategories = categories.filter((c) => !c.isArchived);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="mr-2 animate-spin" />
            Loading rules...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fetchError) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-destructive">
            Error loading rules: {fetchError.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">Categorization Rules</CardTitle>
            <CardDescription className="text-sm">
              Create rules to automatically categorize your activities
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter size={14} className="mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {activeCategories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddNew}
              className="flex items-center gap-1.5"
            >
              <PlusCircle size={16} />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRules.length === 0 ? (
            <div className="text-center py-8 px-4 bg-muted/50 rounded-lg border border-dashed border-border">
              <Filter
                className="mx-auto h-12 w-12 text-muted-foreground"
                aria-hidden="true"
              />
              <h3 className="mt-2 text-sm font-medium text-foreground">
                {rules.length === 0 ? "No rules yet" : "No matching rules"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {rules.length === 0
                  ? "Create a rule to automatically categorize your activities."
                  : "Try adjusting your filter to see more rules."}
              </p>
              {rules.length === 0 && (
                <div className="mt-6">
                  <Button onClick={handleAddNew} type="button">
                    <PlusCircle size={20} className="-ml-1 mr-2 h-5 w-5" />
                    Create Rule
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredRules.map((rule, index) => (
                <RuleListItem
                  key={rule.id}
                  rule={rule}
                  category={categoryMap.get(rule.categoryId)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleEnabled={handleToggleEnabled}
                  onMovePriority={handleMovePriority}
                  isFirst={index === 0}
                  isLast={index === filteredRules.length - 1}
                  isUpdating={updatingId === rule.id}
                  isDeleting={deletingId === rule.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RuleEditor
        rule={editingRule}
        categories={categories}
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        onSave={handleSaveRule}
        isSaving={isSaving}
      />
    </>
  );
});
