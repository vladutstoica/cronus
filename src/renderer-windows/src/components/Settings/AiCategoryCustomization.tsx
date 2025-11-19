import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { defaultCategoriesData } from "../../../../shared/categories";
import { useAuth } from "../../contexts/AuthContext";
import { localApi } from "../../lib/localApi";
import { CategoryBadge } from "../CategoryBadge";
import { Button } from "../ui/button";

interface AiCategoryCustomizationProps {
  onComplete: (categories: any[]) => void;
  goals: string;
  onLoadingChange?: (loading: boolean) => void;
}

export function AiCategoryCustomization({
  onComplete,
  goals,
  onLoadingChange,
}: AiCategoryCustomizationProps) {
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [suggestedCategories, setSuggestedCategories] = useState<any[]>([]);
  const [selectedOption, setSelectedOption] = useState<"ai" | "simple">("ai");
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchCategories = async () => {
      if (isAuthenticated && goals) {
        setLoading(true);
        setCountdown(5);
        onLoadingChange?.(true);

        // Start countdown timer
        const countdownInterval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        try {
          const result = await localApi.categories.generateAiCategories(goals);
          if (result) {
            setSuggestedCategories(result.categories);
          }
        } catch (error) {
          console.error("Failed to generate categories:", error);
        } finally {
          setLoading(false);
          setCountdown(0);
          onLoadingChange?.(false);
          clearInterval(countdownInterval);
        }
      }
    };

    fetchCategories();
  }, [isAuthenticated]);

  const handleComplete = () => {
    if (selectedOption === "ai") {
      onComplete(suggestedCategories);
    } else {
      const defaultCategories = defaultCategoriesData(user!.id);
      console.log("defaultCategories", defaultCategories);
      onComplete(defaultCategories);
    }
  };

  return (
    <div className="text-center">
      <p className="text-muted-foreground mb-6">
        These categories help our ai categorize your activities and how you
        spend your time. You can modify and improve them later in the settings.
      </p>

      <div className="space-x-4 flex justify-center h-[350px]">
        <Button
          variant="outline"
          className={`w-64 h-full p-4 text-left flex flex-col items-start justify-start transition-all duration-200 ${
            selectedOption === "ai"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-400"
              : ""
          }`}
          onClick={() => setSelectedOption("ai")}
          disabled={loading}
        >
          <span className="font-semibold">AI Customized Categories</span>
          {loading ? (
            <div className="flex text-sm m-auto justify-center items-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Ready in {countdown} seconds
            </div>
          ) : (
            <div className="flex flex-col gap-2 mt-2">
              {suggestedCategories.map((c) => (
                <CategoryBadge key={c.name} category={c} />
              ))}
            </div>
          )}
        </Button>
        <Button
          variant="outline"
          className={`w-64 h-full p-4 text-left flex flex-col justify-start items-start transition-all duration-200 ${
            selectedOption === "simple"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-400"
              : ""
          }`}
          onClick={() => setSelectedOption("simple")}
          disabled={loading}
        >
          <span className="font-semibold">Simple Categories</span>
          <div className="flex flex-wrap gap-2 mt-2">
            <CategoryBadge
              category={{ name: "Work", color: "#22C55E", emoji: "💼" }}
            />
            <CategoryBadge
              category={{ name: "Distraction", color: "#EC4899", emoji: "🎮" }}
            />
          </div>
        </Button>
      </div>

      <div className="mt-6">
        <Button
          onClick={handleComplete}
          disabled={loading}
          variant="default"
          size="default"
          className="min-w-[140px]"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
