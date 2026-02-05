import { FlaskConical, Loader2 } from "lucide-react";
import { JSX, useState } from "react";
import type { RuleCondition, ConditionLogic } from "@shared/categorizationTypes";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";

interface RuleTesterProps {
  conditions: RuleCondition[];
  conditionLogic: ConditionLogic;
}

export function RuleTester({
  conditions,
  conditionLogic,
}: RuleTesterProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestRule = async () => {
    // Validate conditions have values
    const hasEmptyConditions = conditions.some((c) => !c.value.trim());
    if (hasEmptyConditions) {
      setError("Please fill in all condition values before testing");
      setMatchCount(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement IPC handler for testing rules
      // const count = await window.api.testRule({ conditions, conditionLogic });
      // setMatchCount(count);

      // Simulated response for now
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Show a placeholder message since we can't actually test yet
      setMatchCount(0);
      setError(
        "Rule testing not yet implemented. IPC handler needed: window.api.testRule()",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to test rule",
      );
      setMatchCount(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-dashed">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <FlaskConical size={16} className="text-muted-foreground" />
          Rule Tester
        </Label>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleTestRule}
          disabled={isLoading || conditions.length === 0}
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            "Test Rule"
          )}
        </Button>
      </div>

      {matchCount !== null && !error && (
        <div className="text-sm">
          <span className="text-muted-foreground">Matching activities: </span>
          <span className="font-semibold text-foreground">{matchCount}</span>
        </div>
      )}

      {error && (
        <div className="text-sm text-amber-600 dark:text-amber-400">
          {error}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Test how many of your recent activities would match this rule.
        Logic: <span className="font-medium">{conditionLogic}</span> (
        {conditionLogic === "AND"
          ? "all conditions must match"
          : "any condition can match"}
        )
      </p>
    </div>
  );
}
