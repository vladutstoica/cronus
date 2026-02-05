import { Plus, X } from "lucide-react";
import { JSX } from "react";
import type {
  ConditionField,
  ConditionOperator,
  RuleCondition,
} from "@shared/categorizationTypes";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

/** Available field types for conditions */
const FIELD_OPTIONS: { value: ConditionField; label: string }[] = [
  { value: "app_name", label: "App Name" },
  { value: "domain", label: "Domain" },
  { value: "url", label: "URL" },
  { value: "url_path", label: "URL Path" },
  { value: "title", label: "Window Title" },
  { value: "browser", label: "Browser" },
];

/** Available operators for conditions */
const OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does not contain" },
  { value: "starts_with", label: "Starts with" },
  { value: "ends_with", label: "Ends with" },
  { value: "matches_regex", label: "Matches regex" },
];

interface ConditionRowProps {
  condition: RuleCondition;
  index: number;
  onChange: (index: number, condition: RuleCondition) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

function ConditionRow({
  condition,
  index,
  onChange,
  onRemove,
  canRemove,
}: ConditionRowProps): JSX.Element {
  const handleFieldChange = (value: string) => {
    onChange(index, { ...condition, field: value as ConditionField });
  };

  const handleOperatorChange = (value: string) => {
    onChange(index, { ...condition, operator: value as ConditionOperator });
  };

  const handleValueChange = (value: string) => {
    onChange(index, { ...condition, value });
  };

  return (
    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
      <div className="flex-1 grid grid-cols-3 gap-2">
        {/* Field selector */}
        <div>
          <Label htmlFor={`field-${index}`} className="sr-only">
            Field
          </Label>
          <Select value={condition.field} onValueChange={handleFieldChange}>
            <SelectTrigger id={`field-${index}`} className="w-full">
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              {FIELD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Operator selector */}
        <div>
          <Label htmlFor={`operator-${index}`} className="sr-only">
            Operator
          </Label>
          <Select
            value={condition.operator}
            onValueChange={handleOperatorChange}
          >
            <SelectTrigger id={`operator-${index}`} className="w-full">
              <SelectValue placeholder="Select operator" />
            </SelectTrigger>
            <SelectContent>
              {OPERATOR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Value input */}
        <div>
          <Label htmlFor={`value-${index}`} className="sr-only">
            Value
          </Label>
          <Input
            id={`value-${index}`}
            type="text"
            placeholder="Enter value"
            value={condition.value}
            onChange={(e) => handleValueChange(e.target.value)}
          />
        </div>
      </div>

      {/* Remove button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        className="h-10 w-10 text-muted-foreground hover:text-destructive shrink-0"
        title="Remove condition"
        aria-label="Remove condition"
      >
        <X size={16} />
      </Button>
    </div>
  );
}

interface ConditionBuilderProps {
  conditions: RuleCondition[];
  onChange: (conditions: RuleCondition[]) => void;
}

export function ConditionBuilder({
  conditions,
  onChange,
}: ConditionBuilderProps): JSX.Element {
  const handleConditionChange = (index: number, condition: RuleCondition) => {
    const newConditions = [...conditions];
    newConditions[index] = condition;
    onChange(newConditions);
  };

  const handleRemoveCondition = (index: number) => {
    if (conditions.length <= 1) return;
    const newConditions = conditions.filter((_, i) => i !== index);
    onChange(newConditions);
  };

  const handleAddCondition = () => {
    const newCondition: RuleCondition = {
      field: "app_name",
      operator: "contains",
      value: "",
    };
    onChange([...conditions, newCondition]);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Conditions</Label>

      <div className="space-y-2">
        {conditions.map((condition, index) => (
          <ConditionRow
            key={index}
            condition={condition}
            index={index}
            onChange={handleConditionChange}
            onRemove={handleRemoveCondition}
            canRemove={conditions.length > 1}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddCondition}
        className="w-full"
      >
        <Plus size={16} className="mr-2" />
        Add Condition
      </Button>
    </div>
  );
}
