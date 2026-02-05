/**
 * PatternList component
 * Displays learned categorization patterns with management capabilities
 */

import { memo, useState } from "react";
import { Trash2, AlertCircle, RefreshCw } from "lucide-react";
import type {
  CategorizationPattern,
  PatternType,
  PatternSource,
} from "@shared/categorizationTypes";
import type { Category } from "@shared/types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { cn } from "../../lib/utils";

interface PatternListProps {
  patterns: CategorizationPattern[];
  categories: Category[];
  onDeletePattern: (id: number) => Promise<void>;
  onResetAllPatterns: () => Promise<void>;
  isDeleting: boolean;
  isResetting: boolean;
}

const patternTypeLabels: Record<PatternType, string> = {
  app: "App",
  domain: "Domain",
  url_path: "URL Path",
  title_keyword: "Title Keyword",
};

const patternSourceLabels: Record<PatternSource, string> = {
  user_correction: "Learned",
  manual: "Manual",
  template: "Template",
};

const patternSourceColors: Record<PatternSource, string> = {
  user_correction:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  manual: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  template:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  let colorClass = "bg-red-500";

  if (confidence >= 0.8) {
    colorClass = "bg-green-500";
  } else if (confidence >= 0.5) {
    colorClass = "bg-yellow-500";
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", colorClass)}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-8">
              {percentage}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Confidence: {percentage}%</p>
          <p className="text-xs text-muted-foreground">
            {confidence >= 0.8
              ? "High confidence"
              : confidence >= 0.5
                ? "Medium confidence"
                : "Low confidence"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function PatternItem({
  pattern,
  category,
  onDelete,
  isDeleting,
}: {
  pattern: CategorizationPattern;
  category: Category | undefined;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">{pattern.patternValue}</span>
          <Badge
            variant="outline"
            className={cn("text-xs", patternSourceColors[pattern.source])}
          >
            {patternSourceLabels[pattern.source]}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="px-1.5 py-0.5 bg-muted rounded text-xs">
            {patternTypeLabels[pattern.patternType]}
          </span>
          {category && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: category.color || "#888" }}
              />
              <span className="truncate max-w-[150px]">{category.name}</span>
            </div>
          )}
          <span>
            {pattern.matchCount}{" "}
            {pattern.matchCount === 1 ? "match" : "matches"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <ConfidenceIndicator confidence={pattern.confidence} />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="2xs"
                onClick={onDelete}
                disabled={isDeleting}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Delete pattern"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete pattern</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export const PatternList = memo(function PatternList({
  patterns,
  categories,
  onDeletePattern,
  onResetAllPatterns,
  isDeleting,
  isResetting,
}: PatternListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await onDeletePattern(id);
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryById = (categoryId: string) => {
    return categories.find((c) => c._id === categoryId);
  };

  if (patterns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-sm font-medium text-foreground mb-1">
          No learned patterns yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Patterns are learned when you correct activity categorizations. Start
          recategorizing activities to build your patterns.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <span className="text-sm text-muted-foreground">
          {patterns.length} {patterns.length === 1 ? "pattern" : "patterns"}
        </span>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isResetting || patterns.length === 0}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Reset All
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all patterns?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all {patterns.length} learned
                patterns. The system will need to re-learn your categorization
                preferences. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onResetAllPatterns}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Reset All Patterns
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {patterns.map((pattern) => (
            <PatternItem
              key={pattern.id}
              pattern={pattern}
              category={getCategoryById(pattern.categoryId)}
              onDelete={() => handleDelete(pattern.id)}
              isDeleting={isDeleting && deletingId === pattern.id}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});
