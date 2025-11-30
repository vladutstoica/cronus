import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, Star } from "lucide-react";
import { localApi } from "../../lib/localApi";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { TodoItem, Todo } from "./TodoItem";
import { TodoStats } from "./TodoStats";
import { TooltipProvider } from "../ui/tooltip";

interface TodoViewProps {
  selectedDate: Date;
}

export function TodoView({ selectedDate }: TodoViewProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [incompleteTodos, setIncompleteTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [stats, setStats] = useState<{ date: string; created: number; completed: number }[]>([]);

  const dateString = useMemo(() => {
    return selectedDate.toISOString().split("T")[0];
  }, [selectedDate]);

  const isToday = useMemo(() => {
    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  }, [selectedDate]);

  // Load todos for the selected date
  const loadTodos = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      const data = await localApi.todos.getByDate(dateString);
      setTodos(data);

      // If viewing today, also load incomplete todos from past days
      if (isToday) {
        const incomplete = await localApi.todos.getIncompleteBeforeDate(dateString);
        setIncompleteTodos(incomplete);
      } else {
        setIncompleteTodos([]);
      }

      // Load stats for the past 7 days
      const startDate = new Date(selectedDate);
      startDate.setDate(startDate.getDate() - 6);
      const statsData = await localApi.todos.getStats(
        startDate.toISOString().split("T")[0],
        dateString
      );
      setStats(statsData);
    } catch (error) {
      console.error("Error loading todos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [dateString, isToday, selectedDate]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // Create a new todo
  const handleCreateTodo = async () => {
    if (!newTodoTitle.trim()) return;

    try {
      await localApi.todos.create({
        title: newTodoTitle.trim(),
        scheduled_date: dateString,
        priority: "medium",
      });
      setNewTodoTitle("");
      loadTodos();
    } catch (error) {
      console.error("Error creating todo:", error);
    }
  };

  // Handle keyboard shortcut for creating todo
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreateTodo();
    }
  };

  // Toggle todo completion
  const handleToggleComplete = async (id: string) => {
    const todo = [...todos, ...incompleteTodos].find((t) => t.id === id);
    if (!todo) return;

    try {
      await localApi.todos.update(id, {
        status: todo.status === "completed" ? "pending" : "completed",
      });
      loadTodos(false);
    } catch (error) {
      console.error("Error toggling todo:", error);
    }
  };

  // Toggle focus status
  const handleToggleFocus = async (id: string) => {
    const todo = [...todos, ...incompleteTodos].find((t) => t.id === id);
    if (!todo) return;

    try {
      // If setting as focus, clear other focus items first
      if (!todo.isFocus) {
        await localApi.todos.clearFocus(dateString);
      }
      await localApi.todos.update(id, { is_focus: !todo.isFocus });
      loadTodos(false);
    } catch (error) {
      console.error("Error toggling focus:", error);
    }
  };

  // Delete todo
  const handleDelete = async (id: string) => {
    try {
      await localApi.todos.delete(id);
      loadTodos(false);
    } catch (error) {
      console.error("Error deleting todo:", error);
    }
  };

  // Update priority
  const handleUpdatePriority = async (
    id: string,
    priority: "low" | "medium" | "high"
  ) => {
    try {
      await localApi.todos.update(id, { priority });
      loadTodos(false);
    } catch (error) {
      console.error("Error updating priority:", error);
    }
  };

  // Rollover incomplete todos
  const handleRollover = async () => {
    try {
      await localApi.todos.rollover(dateString);
      loadTodos(false);
    } catch (error) {
      console.error("Error rolling over todos:", error);
    }
  };

  // Priority order for sorting (high = 0, medium = 1, low = 2)
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  // Separate focus and regular todos, sorted by priority
  const focusTodos = todos.filter((t) => t.isFocus && t.status === "pending");
  const pendingTodos = todos
    .filter((t) => !t.isFocus && t.status === "pending")
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  const completedTodos = todos.filter((t) => t.status === "completed");
  const sortedIncompleteTodos = [...incompleteTodos].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  const formattedDate = selectedDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <TooltipProvider>
      <div className="p-4 space-y-4 overflow-y-auto h-full scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Daily Notes</h1>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
          </div>
          {isToday && incompleteTodos.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleRollover}>
              <RotateCcw size={16} className="mr-2" />
              Roll over {incompleteTodos.length} task
              {incompleteTodos.length > 1 ? "s" : ""}
            </Button>
          )}
        </div>

        {/* Quick Add */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a new task..."
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button onClick={handleCreateTodo} disabled={!newTodoTitle.trim()}>
                <Plus size={16} className="mr-1" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Incomplete todos from previous days */}
        {isToday && incompleteTodos.length > 0 && (
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-500">
                <RotateCcw size={16} />
                Overdue Tasks ({incompleteTodos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sortedIncompleteTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggleComplete={handleToggleComplete}
                  onToggleFocus={handleToggleFocus}
                  onDelete={handleDelete}
                  onUpdatePriority={handleUpdatePriority}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Focus Section */}
        {focusTodos.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star size={16} className="fill-yellow-500 text-yellow-500" />
                My Main Focus Today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {focusTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggleComplete={handleToggleComplete}
                  onToggleFocus={handleToggleFocus}
                  onDelete={handleDelete}
                  onUpdatePriority={handleUpdatePriority}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Pending Todos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Tasks ({pendingTodos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 bg-muted rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : pendingTodos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tasks for this day. Add one above!
              </p>
            ) : (
              pendingTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggleComplete={handleToggleComplete}
                  onToggleFocus={handleToggleFocus}
                  onDelete={handleDelete}
                  onUpdatePriority={handleUpdatePriority}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Completed Todos */}
        {completedTodos.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed ({completedTodos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {completedTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggleComplete={handleToggleComplete}
                  onToggleFocus={handleToggleFocus}
                  onDelete={handleDelete}
                  onUpdatePriority={handleUpdatePriority}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <TodoStats stats={stats} selectedDate={selectedDate} />
      </div>
    </TooltipProvider>
  );
}
