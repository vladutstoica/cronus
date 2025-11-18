import { useEffect, useRef, useState } from "react";
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
import { Textarea } from "../ui/textarea";

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
  const [userProjectsAndGoals, setUserProjectsAndGoals] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasContent = userProjectsAndGoals.trim().length > 0;

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
        const goals =
          typeof userData.user_projects_and_goals === "string"
            ? userData.user_projects_and_goals
            : JSON.stringify(userData.user_projects_and_goals);
        setUserProjectsAndGoals(goals);
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
        textareaRef.current?.focus();
        textareaRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [shouldFocus]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await localApi.user.update({
        user_projects_and_goals: userProjectsAndGoals,
      });

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
        onComplete(userProjectsAndGoals);
      }
    } catch (error) {
      console.error("Failed to update goals:", error);
      alert("Failed to save goals. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onboardingMode) {
      return;
    } else {
      // Reload goals from server
      loadGoals();
      setIsEditing(false);
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
        <div>
          {isEditing ? (
            <Textarea
              ref={textareaRef}
              id="userProjectsAndGoals"
              value={userProjectsAndGoals}
              onChange={(e) => setUserProjectsAndGoals(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-input text-foreground placeholder-gray-500"
              rows={3}
              placeholder="I'm working on Cronus - The ai time/distraction tracker software. I'm working on improving the app and getting the first few 1000 users. I'll have to post on reddit and other forums etc."
            />
          ) : (
            <p className="px-3 py-2 bg-input/50 rounded-md text-foreground min-h-12 whitespace-pre-wrap">
              {userProjectsAndGoals || (
                <span className="text-muted-foreground italic">
                  No projects or goals set yet.
                </span>
              )}
            </p>
          )}
        </div>

        {isEditing && (
          <div className="flex justify-end gap-3 mt-6">
            {!onboardingMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || (onboardingMode && !hasContent)}
            >
              {isSaving
                ? "Saving..."
                : onboardingMode
                  ? "Save & Continue"
                  : "Save Goals"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoalInputForm;
