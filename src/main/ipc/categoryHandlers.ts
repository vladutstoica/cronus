import { ipcMain } from "electron";
import { getOrCreateLocalUser } from "../database/services/users";
import {
  getCategoriesByUserId,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  deleteRecentlyCreatedCategories,
} from "../database/services/categories";
import { snakeToCamel } from "../utils/snakeToCamel";
import { Category } from "../database/services/categories";

// Convert category snake_case to camelCase for frontend
const convertCategoryToCamelCase = (category: Category) => ({
  ...snakeToCamel(category as unknown as Record<string, unknown>),
  _id: category.id, // frontend expects _id instead of id
});

export function registerCategoryHandlers(): void {
  ipcMain.handle("local:get-categories", () => {
    const user = getOrCreateLocalUser();
    const categories = getCategoriesByUserId(user.id, false);
    return categories.map(convertCategoryToCamelCase);
  });

  ipcMain.handle("local:get-category-by-id", (_event, id: string) => {
    const category = getCategoryById(id);
    if (!category) return category;
    return convertCategoryToCamelCase(category);
  });

  ipcMain.handle(
    "local:create-category",
    (
      _event,
      category: {
        name: string;
        description?: string;
        color?: string;
        isProductive: boolean;
        isDefault: boolean;
        isArchived?: boolean;
      },
    ) => {
      const user = getOrCreateLocalUser();
      const created = createCategory({
        ...category,
        is_productive: category.isProductive,
        is_default: category.isDefault,
        is_archived: category.isArchived ?? false,
        user_id: user.id,
      });
      return convertCategoryToCamelCase(created);
    },
  );

  ipcMain.handle(
    "local:update-category",
    (
      _event,
      id: string,
      updates: Partial<{
        name: string;
        description: string;
        color: string;
        isProductive: boolean;
        isDefault: boolean;
        isArchived: boolean;
      }>,
    ) => {
      const updated = updateCategory(id, {
        ...updates,
        is_productive: updates.isProductive,
        is_default: updates.isDefault,
        is_archived: updates.isArchived,
      });
      if (!updated) return updated;
      return convertCategoryToCamelCase(updated);
    },
  );

  ipcMain.handle("local:delete-category", (_event, id: string) => {
    deleteCategory(id);
    return { success: true };
  });

  ipcMain.handle("local:delete-recent-categories", () => {
    const user = getOrCreateLocalUser();
    return deleteRecentlyCreatedCategories(user.id);
  });
}
