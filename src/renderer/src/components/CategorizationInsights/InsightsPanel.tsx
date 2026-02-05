/**
 * InsightsPanel component
 * Main container for categorization insights including patterns and suggestions
 */

import { memo, useCallback, useEffect, useState } from "react";
import { Brain, Lightbulb, TrendingUp, RefreshCw, Loader2 } from "lucide-react";
import type {
  CategorizationPattern,
  PatternStats,
  RuleSuggestion,
} from "@shared/categorizationTypes";
import type { Category } from "@shared/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { localApi } from "../../lib/localApi";
import { PatternList } from "./PatternList";
import { SuggestionList } from "./SuggestionList";
import { cn } from "../../lib/utils";

interface InsightsPanelProps {
  categories: Category[];
  onCreateRuleFromSuggestion?: (
    suggestion: RuleSuggestion,
    categoryId: string,
  ) => Promise<void>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border",
        className,
      )}
    >
      <div className="p-2 rounded-md bg-background">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        {subValue && (
          <div className="text-xs text-muted-foreground mt-0.5">{subValue}</div>
        )}
      </div>
    </div>
  );
}

export const InsightsPanel = memo(function InsightsPanel({
  categories,
  onCreateRuleFromSuggestion,
}: InsightsPanelProps) {
  const [patterns, setPatterns] = useState<CategorizationPattern[]>([]);
  const [suggestions, setSuggestions] = useState<RuleSuggestion[]>([]);
  const [patternStats, setPatternStats] = useState<PatternStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState("patterns");

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    }
    try {
      const [patternsData, suggestionsData, statsData] = await Promise.all([
        localApi.categorizationInsights.getPatterns({
          orderBy: "confidence",
          orderDirection: "DESC",
        }),
        localApi.categorizationInsights.getSuggestions(10),
        localApi.categorizationInsights.getPatternStats(),
      ]);

      setPatterns(patternsData);
      setSuggestions(suggestionsData);
      setPatternStats(statsData);
      setError(null);
    } catch (err) {
      console.error("Error loading categorization insights:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeletePattern = useCallback(async (id: number) => {
    setIsDeleting(true);
    try {
      await localApi.categorizationInsights.deletePattern(id);
      setPatterns((prev) => prev.filter((p) => p.id !== id));
      // Refresh stats
      const statsData = await localApi.categorizationInsights.getPatternStats();
      setPatternStats(statsData);
    } catch (err) {
      console.error("Error deleting pattern:", err);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const handleResetAllPatterns = useCallback(async () => {
    setIsResetting(true);
    try {
      await localApi.categorizationInsights.deleteAllPatterns();
      setPatterns([]);
      // Refresh stats
      const statsData = await localApi.categorizationInsights.getPatternStats();
      setPatternStats(statsData);
    } catch (err) {
      console.error("Error resetting patterns:", err);
      throw err;
    } finally {
      setIsResetting(false);
    }
  }, []);

  const handleCreateRuleFromSuggestion = useCallback(
    async (suggestion: RuleSuggestion, categoryId: string) => {
      setIsCreatingRule(true);
      try {
        if (onCreateRuleFromSuggestion) {
          await onCreateRuleFromSuggestion(suggestion, categoryId);
        }
        // Remove the suggestion from the list after creating the rule
        setSuggestions((prev) =>
          prev.filter(
            (s) =>
              !(
                s.identifier === suggestion.identifier &&
                s.type === suggestion.type
              ),
          ),
        );
        // Refresh data to update patterns if a new one was created
        await loadData();
      } catch (err) {
        console.error("Error creating rule from suggestion:", err);
        throw err;
      } finally {
        setIsCreatingRule(false);
      }
    },
    [onCreateRuleFromSuggestion, loadData],
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Categorization Insights
          </CardTitle>
          <CardDescription>Loading insights...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Categorization Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">
              Error loading insights: {error.message}
            </p>
            <Button onClick={() => loadData()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Categorization Insights
            </CardTitle>
            <CardDescription>
              View learned patterns and get suggestions to improve
              categorization
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-1.5", isRefreshing && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        {patternStats && (
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={Brain}
              label="Total Patterns"
              value={patternStats.totalPatterns}
              subValue={`${patternStats.trustedPatterns} trusted`}
            />
            <StatCard
              icon={TrendingUp}
              label="Avg Confidence"
              value={`${Math.round(patternStats.averageConfidence * 100)}%`}
            />
            <StatCard
              icon={Lightbulb}
              label="Suggestions"
              value={suggestions.length}
              subValue="from uncategorized"
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="patterns" className="flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              Patterns
              {patterns.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {patterns.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="suggestions"
              className="flex items-center gap-1.5"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Suggestions
              {suggestions.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {suggestions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patterns" className="mt-4">
            <div className="border rounded-lg overflow-hidden min-h-[300px] max-h-[400px] flex flex-col">
              <PatternList
                patterns={patterns}
                categories={categories}
                onDeletePattern={handleDeletePattern}
                onResetAllPatterns={handleResetAllPatterns}
                isDeleting={isDeleting}
                isResetting={isResetting}
              />
            </div>
          </TabsContent>

          <TabsContent value="suggestions" className="mt-4">
            <div className="border rounded-lg overflow-hidden min-h-[300px] max-h-[400px] flex flex-col">
              <SuggestionList
                suggestions={suggestions}
                categories={categories}
                onCreateRule={handleCreateRuleFromSuggestion}
                isCreating={isCreatingRule}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});
