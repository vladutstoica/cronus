import { Loader2 } from "lucide-react";
import { JSX, useEffect, useState } from "react";
import type {
  CategorizationRule,
  ConditionLogic,
  CreateCategorizationRuleInput,
  RuleCondition,
  UpdateCategorizationRuleInput,
} from "@shared/categorizationTypes";
import type { Category } from "@shared/types";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Slider } from "../../ui/slider";
import { Textarea } from "../../ui/textarea";
import { ConditionBuilder } from "./ConditionBuilder";
import { RuleTester } from "./RuleTester";

interface RuleEditorProps {
  rule: CategorizationRule | null;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    rule: CreateCategorizationRuleInput | UpdateCategorizationRuleInput,
  ) => Promise<void>;
  isSaving: boolean;
}

const DEFAULT_CONDITION: RuleCondition = {
  field: "app_name",
  operator: "contains",
  value: "",
};

export function RuleEditor({
  rule,
  categories,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: RuleEditorProps): JSX.Element {
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [conditions, setConditions] = useState<RuleCondition[]>([
    DEFAULT_CONDITION,
  ]);
  const [conditionLogic, setConditionLogic] = useState<ConditionLogic>("AND");
  const [priority, setPriority] = useState(50);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when rule changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      if (rule) {
        setName(rule.name);
        setDescription(rule.description || "");
        setCategoryId(rule.categoryId);
        setConditions(
          rule.conditions.length > 0 ? rule.conditions : [DEFAULT_CONDITION],
        );
        setConditionLogic(rule.conditionLogic);
        setPriority(rule.priority);
      } else {
        // Reset to defaults for new rule
        setName("");
        setDescription("");
        setCategoryId(categories[0]?._id || "");
        setConditions([DEFAULT_CONDITION]);
        setConditionLogic("AND");
        setPriority(50);
      }
      setErrors({});
    }
  }, [isOpen, rule, categories]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Rule name is required";
    }

    if (!categoryId) {
      newErrors.categoryId = "Please select a category";
    }

    const hasEmptyConditions = conditions.some((c) => !c.value.trim());
    if (hasEmptyConditions) {
      newErrors.conditions = "All conditions must have a value";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (rule) {
      // Update existing rule
      const updates: UpdateCategorizationRuleInput = {
        id: rule.id,
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId,
        conditions,
        conditionLogic,
        priority,
      };
      await onSave(updates);
    } else {
      // Create new rule
      const newRule: CreateCategorizationRuleInput = {
        userId: "", // Will be set by the backend/IPC handler
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId,
        conditions,
        conditionLogic,
        priority,
        source: "user",
      };
      await onSave(newRule);
    }
  };

  const activeCategories = categories.filter((c) => !c.isArchived);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {rule ? "Edit Rule" : "Create New Rule"}
          </DialogTitle>
          <DialogDescription>
            {rule
              ? "Update the rule settings and conditions."
              : "Create a rule to automatically categorize your activities."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rule Name */}
          <div className="space-y-2">
            <Label htmlFor="rule-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rule-name"
              type="text"
              placeholder="e.g., Work Email"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p id="name-error" className="text-sm text-destructive">
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="rule-description">Description</Label>
            <Textarea
              id="rule-description"
              placeholder="Optional description for this rule"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Category Selector */}
          <div className="space-y-2">
            <Label htmlFor="rule-category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger
                id="rule-category"
                aria-invalid={!!errors.categoryId}
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {activeCategories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p className="text-sm text-destructive">{errors.categoryId}</p>
            )}
          </div>

          {/* Condition Logic */}
          <div className="space-y-2">
            <Label>Condition Logic</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="conditionLogic"
                  value="AND"
                  checked={conditionLogic === "AND"}
                  onChange={() => setConditionLogic("AND")}
                  className="w-4 h-4 text-primary border-input focus:ring-ring"
                />
                <span className="text-sm">
                  AND{" "}
                  <span className="text-muted-foreground">
                    (all conditions must match)
                  </span>
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="conditionLogic"
                  value="OR"
                  checked={conditionLogic === "OR"}
                  onChange={() => setConditionLogic("OR")}
                  className="w-4 h-4 text-primary border-input focus:ring-ring"
                />
                <span className="text-sm">
                  OR{" "}
                  <span className="text-muted-foreground">
                    (any condition can match)
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Condition Builder */}
          <div>
            <ConditionBuilder
              conditions={conditions}
              onChange={setConditions}
            />
            {errors.conditions && (
              <p className="text-sm text-destructive mt-2">
                {errors.conditions}
              </p>
            )}
          </div>

          {/* Priority Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="rule-priority">Priority</Label>
              <span className="text-sm text-muted-foreground">{priority}</span>
            </div>
            <Slider
              id="rule-priority"
              min={0}
              max={100}
              step={1}
              value={[priority]}
              onValueChange={([value]) => setPriority(value)}
            />
            <p className="text-xs text-muted-foreground">
              Higher priority rules are evaluated first (0-100). Rules with
              matching priority are evaluated by creation order.
            </p>
          </div>

          {/* Rule Tester */}
          <RuleTester conditions={conditions} conditionLogic={conditionLogic} />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : rule ? (
              "Update Rule"
            ) : (
              "Create Rule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
