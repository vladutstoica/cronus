import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "../../hooks/use-toast";
import { localApi } from "../../lib/localApi";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";

interface GoalInputFormProps {
  onboardingMode?: boolean;
  onComplete?: (goals: string) => void;
  shouldFocus?: boolean;
}

const GoalInputForm = ({
  onboardingMode = false,
  onComplete,
  shouldFocus = false,
}: GoalInputFormProps) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasContent = goals.length > 0;

  // Load user goals
  useEffect(() => {
    if (user) {
      loadGoals();
    }
  }, [user]);

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      const userData = await localApi.user.get();
      if (userData && userData.user_projects_and_goals) {
        let parsedGoals: string[] = [];
        if (typeof userData.user_projects_and_goals === "string") {
          try {
            const parsed = JSON.parse(userData.user_projects_and_goals);
            if (Array.isArray(parsed)) {
              parsedGoals = parsed;
            } else if (typeof parsed === "string" && parsed.trim()) {
              // Legacy: single string, convert to array
              parsedGoals = [parsed];
            }
          } catch {
            // Legacy: plain string that's not JSON
            if (userData.user_projects_and_goals.trim()) {
              parsedGoals = [userData.user_projects_and_goals];
            }
          }
        } else if (Array.isArray(userData.user_projects_and_goals)) {
          parsedGoals = userData.user_projects_and_goals;
        }
        setGoals(parsedGoals);
      }
    } catch (error) {
      console.error("Failed to load goals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-edit mode for onboarding
  useEffect(() => {
    if (onboardingMode) {
      setIsEditing(true);
    }
  }, [onboardingMode]);

  useEffect(() => {
    if (shouldFocus) {
      setIsEditing(true);
      setTimeout(() => {
        containerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        const inputs = document.querySelectorAll<HTMLInputElement>(
          '[data-goal-input="true"]'
        );
        if (inputs.length > 0) {
          inputs[0]?.focus();
        }
      }, 100);
    }
  }, [shouldFocus]);

  // Auto-save when clicking outside (non-onboarding mode)
  useEffect(() => {
    if (!isEditing || onboardingMode) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleSave();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, onboardingMode, goals]);

  const handleRemoveGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const handleUpdateGoal = (index: number, value: string) => {
    const updated = [...goals];
    updated[index] = value;
    setGoals(updated);
  };

  const handleSave = async () => {
    // Filter out empty goals
    const filteredGoals = goals.filter((g) => g.trim());
    setIsSaving(true);
    try {
      await localApi.user.update({
        user_projects_and_goals: JSON.stringify(filteredGoals),
      });

      setGoals(filteredGoals);
      setIsEditing(false);

      if (!onboardingMode) {
        toast({
          title: "Goals Updated!",
          duration: 1500,
          description: "Your goals have been successfully updated.",
        });
      }

      // Call onComplete if in onboarding mode
      if (onboardingMode && onComplete) {
        onComplete(JSON.stringify(filteredGoals));
      }
    } catch (error) {
      console.error("Failed to update goals:", error);
      alert("Failed to save goals. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-24 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      ref={containerRef}
      className={`bg-card border-border ${
        onboardingMode ? "" : !isEditing ? "cursor-pointer" : ""
      }`}
      onClick={
        onboardingMode
          ? undefined
          : () => {
              if (!isEditing) setIsEditing(true);
            }
      }
      tabIndex={onboardingMode ? undefined : 0}
      role={onboardingMode ? undefined : "button"}
      aria-label={
        !onboardingMode && !isEditing ? "Click to edit your goals" : undefined
      }
    >
      <CardHeader>
        <CardTitle className="text-xl text-card-foreground">
          Explain your current work & goals
        </CardTitle>
        <CardDescription>
          What is your job? What are your hobbies and projects? Details help our
          AI differentiate between your activities and distractions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            {/* Existing goals list */}
            {goals.map((goal, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  data-goal-input="true"
                  value={goal}
                  onChange={(e) => handleUpdateGoal(index, e.target.value)}
                  className="flex-1"
                  placeholder="Enter a goal or project..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveGoal(index)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* Add new goal button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setGoals([...goals, ""]);
                setTimeout(() => {
                  const inputs = document.querySelectorAll<HTMLInputElement>(
                    '[data-goal-input="true"]'
                  );
                  inputs[inputs.length - 1]?.focus();
                }, 0);
              }}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add goal or project
            </Button>

            {onboardingMode && (
              <div className="flex justify-end mt-4">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save & Continue"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {goals.length > 0 ? (
              <ul className="space-y-2">
                {goals.map((goal, index) => (
                  <li
                    key={index}
                    className="px-3 py-2 bg-input/50 rounded-md text-foreground text-sm"
                  >
                    {goal}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-2 bg-input/50 rounded-md text-muted-foreground italic min-h-12">
                No projects or goals set yet.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoalInputForm;
