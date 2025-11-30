import { FolderPlus, MoreHorizontal, PlusCircle, Rows } from "lucide-react";
import { JSX, memo, useEffect, useMemo, useState } from "react";
import { Category } from "@shared/types";
import { useAuth } from "../../contexts/AuthContext";
import { localApi } from "../../lib/localApi";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { CategoryForm } from "./CategoryForm";
import { CategoryListItem } from "./CategoryListItem";
import { CategoryTemplateList } from "./CategoryTemplateList";

export const CategoryManagementSettings = memo(
  function CategoryManagementSettings(): JSX.Element {
    console.log("CategoryManagementSettings re-rendered");
    const { isAuthenticated } = useAuth();

    const [categories, setCategories] = useState<Category[] | undefined>(
      undefined,
    );
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<Error | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Load categories
    const loadCategories = async () => {
      if (!isAuthenticated) return;

      setIsLoading(true);
      try {
        const data = await localApi.categories.getAll();
        setCategories(data as Category[]);
        setFetchError(null);
      } catch (error: any) {
        console.error("Error loading categories:", error);
        setFetchError(error);
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      loadCategories();
    }, [isAuthenticated]);

    // Create mutation
    const createMutation = {
      mutateAsync: async (
        data: Omit<Category, "_id" | "userId" | "createdAt" | "updatedAt">,
      ) => {
        setIsCreating(true);
        try {
          await localApi.categories.create(data);
          await loadCategories();
          setIsFormOpen(false);
          setEditingCategory(null);
          setTemplateData(null);
        } catch (err: any) {
          console.error("Error creating category:", err);
          alert(`Error creating category: ${err.message}`);
          throw err;
        } finally {
          setIsCreating(false);
        }
      },
      isLoading: isCreating,
    };

    // Update mutation
    const updateMutation = {
      mutateAsync: async (data: { id: string; [key: string]: any }) => {
        setIsUpdating(true);
        setUpdatingId(data.id);
        try {
          await localApi.categories.update(data.id, data);
          await loadCategories();
          setIsFormOpen(false);
          setEditingCategory(null);
          setTemplateData(null);
        } catch (err: any) {
          console.error("Error updating category:", err);
          alert(`Error updating category: ${err.message}`);
          throw err;
        } finally {
          setIsUpdating(false);
          setUpdatingId(null);
        }
      },
      isLoading: isUpdating,
      variables: updatingId ? { id: updatingId } : undefined,
    };

    // Delete mutation
    const deleteMutation = {
      mutateAsync: async (data: { id: string }) => {
        setIsDeleting(true);
        setDeletingId(data.id);
        try {
          await localApi.categories.delete(data.id);
          await loadCategories();
        } catch (err: any) {
          console.error("Error deleting category:", err);
          alert(`Error deleting category: ${err.message}`);
          throw err;
        } finally {
          setIsDeleting(false);
          setDeletingId(null);
        }
      },
      isLoading: isDeleting,
      variables: deletingId ? { id: deletingId } : undefined,
    };

    // Delete recent mutation
    const deleteRecentMutation = {
      mutateAsync: async () => {
        try {
          await localApi.categories.deleteRecent();
          await loadCategories();
          alert("Recently created categories have been deleted.");
        } catch (err: any) {
          console.error("Error deleting recent categories:", err);
          alert(`Error deleting recent categories: ${err.message}`);
          throw err;
        }
      },
      isLoading: false,
    };

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isTemplateViewOpen, setIsTemplateViewOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(
      null,
    );
    const [templateData, setTemplateData] = useState<Omit<
      Category,
      "_id" | "userId" | "createdAt" | "updatedAt"
    > | null>(null);

    const handleAddNew = () => {
      setEditingCategory(null);
      setTemplateData(null);
      setIsFormOpen(true);
    };

    const handleOpenTemplateView = () => {
      setIsTemplateViewOpen(true);
    };

    const handleEdit = (category: Category) => {
      setEditingCategory(category);
      setTemplateData(null);
      setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
      if (window.confirm("Are you sure you want to delete this category?")) {
        await deleteMutation.mutateAsync({ id });
      }
    };

    const handleDeleteRecent = async () => {
      if (
        window.confirm(
          "Are you sure you want to delete recently created categories?",
        )
      ) {
        await deleteRecentMutation.mutateAsync();
      }
    };

    const handleSaveCategory = async (
      data: Omit<Category, "_id" | "userId" | "createdAt" | "updatedAt">,
    ) => {
      if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory._id, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }
    };

    const handleAddFromTemplate = async (
      data: Omit<Category, "_id" | "userId" | "createdAt" | "updatedAt">,
    ) => {
      // Instead of directly creating, pass the template data to the form
      setTemplateData(data);
      setEditingCategory(null);
      setIsTemplateViewOpen(false);
      setIsFormOpen(true);
    };

    const handleToggleProductive = async (category: Category) => {
      await updateMutation.mutateAsync({
        id: category._id,
        isProductive: !category.isProductive,
      });
    };

    const handleToggleArchive = async (category: Category) => {
      await updateMutation.mutateAsync({
        id: category._id,
        isArchived: !category.isArchived,
      });
    };

    const handleArchiveAll = async () => {
      if (window.confirm("Are you sure you want to archive all categories?")) {
        // Archive all active categories
        const activeCategories = categories?.filter((c) => !c.isArchived) || [];
        for (const category of activeCategories) {
          await updateMutation.mutateAsync({
            id: category._id,
            isArchived: true,
          });
        }
      }
    };

    const memoizedInitialData = useMemo(() => {
      return editingCategory || templateData || undefined;
    }, [editingCategory, templateData]);

    const activeCategories = categories?.filter((c) => !c.isArchived) || [];
    const archivedCategories = categories?.filter((c) => c.isArchived) || [];

    if (isLoading)
      return (
        <div className="text-center p-4 text-muted-foreground">
          Loading categories...
        </div>
      );
    if (fetchError)
      return (
        <div className="text-center p-4 text-destructive-foreground">
          Error loading categories: {fetchError.message}
        </div>
      );

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">Categories</CardTitle>
              <CardDescription className="text-sm">
                Use categories to help organize and filter sessions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isFormOpen || isTemplateViewOpen}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleOpenTemplateView}>
                    <Rows size={16} className="mr-2" />
                    Add from Templates
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDeleteRecent}
                    disabled={
                      deleteRecentMutation.isLoading ||
                      createMutation.isLoading ||
                      updateMutation.isLoading ||
                      deleteMutation.isLoading
                    }
                    className="text-destructive focus:text-destructive"
                  >
                    Delete Created in last 24 hours
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleArchiveAll}
                    disabled={
                      createMutation.isLoading ||
                      updateMutation.isLoading ||
                      deleteMutation.isLoading ||
                      !categories?.some((c) => !c.isArchived)
                    }
                  >
                    Archive All Categories
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddNew}
                disabled={isFormOpen || isTemplateViewOpen}
                className="flex items-center gap-1.5"
              >
                <PlusCircle size={16} />
                Create Category
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isTemplateViewOpen && (
              <CategoryTemplateList
                onAdd={handleAddFromTemplate}
                onCancel={() => setIsTemplateViewOpen(false)}
                existingCategories={categories || []}
                isSaving={createMutation.isLoading}
              />
            )}

            {isFormOpen && (
              <div className="p-4 border rounded-lg my-4">
                <h3 className="text-lg font-semibold leading-none tracking-tight">
                  {editingCategory ? "Edit Category" : "Create New Category"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  {editingCategory
                    ? "Edit the details of your category."
                    : "Create a new category to organize your activities."}
                </p>
                <CategoryForm
                  initialData={memoizedInitialData}
                  onSave={handleSaveCategory}
                  onCancel={() => {
                    setIsFormOpen(false);
                    setEditingCategory(null);
                    setTemplateData(null);
                  }}
                  isSaving={
                    createMutation.isLoading || updateMutation.isLoading
                  }
                />
              </div>
            )}

            {!isFormOpen &&
              !isTemplateViewOpen &&
              (!categories || categories.length === 0) && (
                <div className="text-center py-8 px-4 bg-muted/50 rounded-lg border border-dashed border-border">
                  <FolderPlus
                    className="mx-auto h-12 w-12 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <h3 className="mt-2 text-sm font-medium text-foreground">
                    No categories yet
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Get started by creating a new category.
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={handleAddNew}
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary"
                    >
                      <PlusCircle size={20} className="-ml-1 mr-2 h-5 w-5" />
                      New Category
                    </Button>
                  </div>
                </div>
              )}

            {!isFormOpen &&
              !isTemplateViewOpen &&
              activeCategories.length > 0 && (
                <div className="flex flex-col gap-2">
                  {activeCategories.map((category) => (
                    <CategoryListItem
                      key={category._id}
                      category={category}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleProductive={handleToggleProductive}
                      onToggleArchive={handleToggleArchive}
                      isDeleting={
                        deleteMutation.isLoading &&
                        deleteMutation.variables?.id === category._id
                      }
                      isUpdating={
                        updateMutation.isLoading &&
                        updateMutation.variables?.id === category._id
                      }
                    />
                  ))}
                </div>
              )}

            {!isFormOpen &&
              !isTemplateViewOpen &&
              archivedCategories.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Archived
                  </h3>
                  <div className="flex flex-col gap-2">
                    {archivedCategories.map((category) => (
                      <CategoryListItem
                        key={category._id}
                        category={category}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggleProductive={handleToggleProductive}
                        onToggleArchive={handleToggleArchive}
                        isDeleting={
                          deleteMutation.isLoading &&
                          deleteMutation.variables?.id === category._id
                        }
                        isUpdating={
                          updateMutation.isLoading &&
                          updateMutation.variables?.id === category._id
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    );
  },
);
