import { ipcMain } from "electron";
import { getOrCreateLocalUser } from "../database/services/users";
import {
  getTodosByDate,
  getTodosByDateRange,
  getIncompleteTodosBeforeDate,
  createTodo,
  getTodoById,
  updateTodo,
  deleteTodo,
  rolloverTodos,
  getTodoStats,
  clearFocusTodos,
} from "../database/services/todos";
import { snakeToCamel } from "../utils/snakeToCamel";

// Convert todo snake_case to camelCase for frontend
const convertTodoToCamelCase = (todo: any) => ({
  ...snakeToCamel(todo),
  isFocus: todo.is_focus === 1, // Convert integer to boolean
  tags: todo.tags ? JSON.parse(todo.tags) : [], // Parse JSON string
});

export function registerTodoHandlers(): void {
  ipcMain.handle("local:get-todos-by-date", (_event, date: string) => {
    const user = getOrCreateLocalUser();
    const todos = getTodosByDate(user.id, date);
    return todos.map(convertTodoToCamelCase);
  });

  ipcMain.handle(
    "local:get-todos-by-date-range",
    (_event, startDate: string, endDate: string) => {
      const user = getOrCreateLocalUser();
      const todos = getTodosByDateRange(user.id, startDate, endDate);
      return todos.map(convertTodoToCamelCase);
    },
  );

  ipcMain.handle(
    "local:get-incomplete-todos-before-date",
    (_event, beforeDate: string) => {
      const user = getOrCreateLocalUser();
      const todos = getIncompleteTodosBeforeDate(user.id, beforeDate);
      return todos.map(convertTodoToCamelCase);
    },
  );

  ipcMain.handle("local:create-todo", (_event, input: any) => {
    const user = getOrCreateLocalUser();
    const todo = createTodo({
      ...input,
      user_id: user.id,
    });
    return convertTodoToCamelCase(todo);
  });

  ipcMain.handle("local:get-todo-by-id", (_event, id: string) => {
    const todo = getTodoById(id);
    if (!todo) return null;
    return convertTodoToCamelCase(todo);
  });

  ipcMain.handle("local:update-todo", (_event, id: string, updates: any) => {
    const todo = updateTodo(id, updates);
    if (!todo) return null;
    return convertTodoToCamelCase(todo);
  });

  ipcMain.handle("local:delete-todo", (_event, id: string) => {
    return deleteTodo(id);
  });

  ipcMain.handle("local:rollover-todos", (_event, toDate: string) => {
    const user = getOrCreateLocalUser();
    return rolloverTodos(user.id, toDate);
  });

  ipcMain.handle(
    "local:get-todo-stats",
    (_event, startDate: string, endDate: string) => {
      const user = getOrCreateLocalUser();
      return getTodoStats(user.id, startDate, endDate);
    },
  );

  ipcMain.handle("local:clear-focus-todos", (_event, date: string) => {
    const user = getOrCreateLocalUser();
    clearFocusTodos(user.id, date);
    return { success: true };
  });
}
