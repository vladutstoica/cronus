/**
 * SuggestionList component
 * Displays rule suggestions based on uncategorized activities
 */

import { memo, useState } from "react";
import { Lightbulb, Plus, Clock, Hash, Globe, AppWindow } from "lucide-react";
import type { Category } from "@shared/types";
import type { RuleSuggestion } from "@shared/categorizationTypes";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export type { RuleSuggestion };

interface SuggestionListProps {
  suggestions: RuleSuggestion[];
  categories: Category[];
  onCreateRule: (
    suggestion: RuleSuggestion,
    categoryId: string,
  ) => Promise<void>;
  isCreating: boolean;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return "yesterday";
  }
  return `${diffDays}d ago`;
}

function SuggestionItem({
  suggestion,
  categories,
  onCreateRule,
  isCreating,
}: {
  suggestion: RuleSuggestion;
  categories: Category[];
  onCreateRule: (categoryId: string) => void;
  isCreating: boolean;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  const handleCreateRule = () => {
    if (selectedCategoryId) {
      onCreateRule(selectedCategoryId);
      setIsDialogOpen(false);
      setSelectedCategoryId("");
    }
  };

  const activeCategories = categories.filter((c) => !c.isArchived);

  return (
    <>
      <div className="flex items-center justify-between py-3 px-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {suggestion.type === "app" ? (
              <AppWindow className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className="font-medium truncate">
              {suggestion.identifier}
            </span>
            <Badge variant="outline" className="text-xs capitalize">
              {suggestion.type}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Hash className="h-3.5 w-3.5" />
              {suggestion.occurrences} occurrences
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(suggestion.totalDurationMs)} total
            </span>
            <span className="text-xs">
              Last seen {formatRelativeTime(suggestion.lastSeen)}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          disabled={isCreating}
          className="ml-4 flex-shrink-0"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Create Rule
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Create Rule for &quot;{suggestion.identifier}&quot;
            </DialogTitle>
            <DialogDescription>
              Select a category to automatically assign to activities from{" "}
              {suggestion.type === "app" ? "this application" : "this domain"}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Assign to Category
            </label>
            <Select
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {activeCategories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color || "#888" }}
                      />
                      <span>{category.name}</span>
                      {category.isProductive && (
                        <Badge variant="secondary" className="text-xs ml-auto">
                          Productive
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              This will create a rule that matches all activities with{" "}
              {suggestion.type === "app"
                ? `app name "${suggestion.identifier}"`
                : `domain "${suggestion.identifier}"`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRule}
              disabled={!selectedCategoryId || isCreating}
            >
              {isCreating ? "Creating..." : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const SuggestionList = memo(function SuggestionList({
  suggestions,
  categories,
  onCreateRule,
  isCreating,
}: SuggestionListProps) {
  const [creatingIdentifier, setCreatingIdentifier] = useState<string | null>(
    null,
  );

  const handleCreateRule = async (
    suggestion: RuleSuggestion,
    categoryId: string,
  ) => {
    setCreatingIdentifier(suggestion.identifier);
    try {
      await onCreateRule(suggestion, categoryId);
    } finally {
      setCreatingIdentifier(null);
    }
  };

  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <Lightbulb className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-sm font-medium text-foreground mb-1">
          No suggestions available
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Suggestions appear when there are uncategorized activities with at
          least 3 occurrences. Keep using the app to generate suggestions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <span className="text-sm text-muted-foreground">
            {suggestions.length}{" "}
            {suggestions.length === 1 ? "suggestion" : "suggestions"} based on
            uncategorized activities
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {suggestions.map((suggestion) => (
            <SuggestionItem
              key={`${suggestion.type}-${suggestion.identifier}`}
              suggestion={suggestion}
              categories={categories}
              onCreateRule={(categoryId) =>
                handleCreateRule(suggestion, categoryId)
              }
              isCreating={
                isCreating && creatingIdentifier === suggestion.identifier
              }
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});
