/**
 * Export Service for Cronus Time Tracker
 *
 * Handles exporting activity data to CSV and JSON formats.
 * Supports date range filtering and privacy options.
 */

import { app } from "electron";
import { writeFile } from "fs/promises";
import { getEventsByUserAndTimeRange } from "../database/services/activeWindowEvents";
import {
  getCategoriesByUserId,
  Category,
} from "../database/services/categories";
import { getOrCreateLocalUser } from "../database/services/users";
import { getAllSettings } from "../database/services/settings";
import {
  ExportOptions,
  ExportFormat,
  ExportDataType,
  ExportResult,
  ExportProgress,
  ExportedActivity,
  ExportedCategory,
  FullExportData,
  DailySummary,
  CategoryBreakdown,
  ExportStats,
} from "../../shared/exportTypes";
import type { ActiveWindowEvent } from "../database/services/activeWindowEvents";

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: ExportProgress) => void;

/**
 * Convert database category to exported category
 */
function categoryToExported(category: Category): ExportedCategory {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    color: category.color,
    isProductive: category.is_productive,
    isDefault: category.is_default,
    createdAt: category.created_at,
    updatedAt: category.updated_at,
  };
}

/**
 * Convert database event to exported activity with privacy filtering
 */
function eventToExported(
  event: ActiveWindowEvent,
  categoryMap: Map<string, Category>,
  options: ExportOptions,
): ExportedActivity {
  const category = event.category_id
    ? categoryMap.get(event.category_id)
    : undefined;

  const exported: ExportedActivity = {
    id: event.id,
    timestamp: event.timestamp,
    ownerName: event.owner_name || "",
    type: event.type || "",
    browser: event.browser || undefined,
    title: event.title || undefined,
    durationMs: event.duration_ms,
    categoryId: event.category_id || undefined,
    categoryName: category?.name,
    categoryColor: category?.color,
    isProductive: category?.is_productive,
    llmSummary: event.llm_summary || undefined,
    generatedTitle: event.generated_title || undefined,
  };

  // Apply privacy filters
  if (!options.privacy.excludeUrls) {
    exported.url = event.url || undefined;
  }

  if (!options.privacy.excludeOcrContent) {
    exported.content = event.content || undefined;
  }

  return exported;
}

/**
 * Generate CSV content from activities
 */
function activitiesToCsv(activities: ExportedActivity[]): string {
  const headers = [
    "id",
    "timestamp",
    "ownerName",
    "type",
    "browser",
    "title",
    "url",
    "categoryId",
    "categoryName",
    "categoryColor",
    "isProductive",
    "durationMs",
    "durationMinutes",
    "llmSummary",
    "generatedTitle",
  ];

  const escapeCell = (value: unknown): string => {
    if (value === null || value === undefined) {
      return "";
    }
    const str = String(value);
    // Escape quotes and wrap in quotes if contains comma, newline, or quote
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = activities.map((activity) => [
    escapeCell(activity.id),
    escapeCell(activity.timestamp),
    escapeCell(activity.ownerName),
    escapeCell(activity.type),
    escapeCell(activity.browser),
    escapeCell(activity.title),
    escapeCell(activity.url),
    escapeCell(activity.categoryId),
    escapeCell(activity.categoryName),
    escapeCell(activity.categoryColor),
    escapeCell(activity.isProductive),
    escapeCell(activity.durationMs),
    escapeCell(Math.round((activity.durationMs / 60000) * 100) / 100),
    escapeCell(activity.llmSummary),
    escapeCell(activity.generatedTitle),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Generate CSV content from categories
 */
function categoriesToCsv(categories: ExportedCategory[]): string {
  const headers = [
    "id",
    "name",
    "description",
    "color",
    "isProductive",
    "isDefault",
    "createdAt",
    "updatedAt",
  ];

  const escapeCell = (value: unknown): string => {
    if (value === null || value === undefined) {
      return "";
    }
    const str = String(value);
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = categories.map((category) => [
    escapeCell(category.id),
    escapeCell(category.name),
    escapeCell(category.description),
    escapeCell(category.color),
    escapeCell(category.isProductive),
    escapeCell(category.isDefault),
    escapeCell(category.createdAt),
    escapeCell(category.updatedAt),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Generate daily summaries from activities
 */
function generateDailySummaries(
  activities: ExportedActivity[],
): DailySummary[] {
  const dailyMap = new Map<
    string,
    {
      totalDurationMs: number;
      productiveDurationMs: number;
      unproductiveDurationMs: number;
      activityCount: number;
      categoryDurations: Map<string, number>;
    }
  >();

  for (const activity of activities) {
    const date = activity.timestamp.substring(0, 10);
    const existing = dailyMap.get(date) || {
      totalDurationMs: 0,
      productiveDurationMs: 0,
      unproductiveDurationMs: 0,
      activityCount: 0,
      categoryDurations: new Map<string, number>(),
    };

    existing.totalDurationMs += activity.durationMs;
    existing.activityCount += 1;

    if (activity.isProductive === true) {
      existing.productiveDurationMs += activity.durationMs;
    } else if (activity.isProductive === false) {
      existing.unproductiveDurationMs += activity.durationMs;
    }

    if (activity.categoryName) {
      const catDuration = existing.categoryDurations.get(activity.categoryName) || 0;
      existing.categoryDurations.set(
        activity.categoryName,
        catDuration + activity.durationMs,
      );
    }

    dailyMap.set(date, existing);
  }

  const summaries: DailySummary[] = [];
  for (const [date, data] of dailyMap) {
    let topCategory: string | undefined;
    let topCategoryDuration = 0;

    for (const [categoryName, duration] of data.categoryDurations) {
      if (duration > topCategoryDuration) {
        topCategoryDuration = duration;
        topCategory = categoryName;
      }
    }

    summaries.push({
      date,
      totalDurationMs: data.totalDurationMs,
      productiveDurationMs: data.productiveDurationMs,
      unproductiveDurationMs: data.unproductiveDurationMs,
      activityCount: data.activityCount,
      topCategory,
    });
  }

  return summaries.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generate category breakdown from activities
 */
function generateCategoryBreakdown(
  activities: ExportedActivity[],
): CategoryBreakdown[] {
  const totalDuration = activities.reduce((sum, a) => sum + a.durationMs, 0);
  const categoryMap = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      categoryColor: string;
      isProductive: boolean;
      totalDurationMs: number;
      activityCount: number;
    }
  >();

  for (const activity of activities) {
    const categoryId = activity.categoryId || "uncategorized";
    const existing = categoryMap.get(categoryId) || {
      categoryId,
      categoryName: activity.categoryName || "Uncategorized",
      categoryColor: activity.categoryColor || "#6b7280",
      isProductive: activity.isProductive || false,
      totalDurationMs: 0,
      activityCount: 0,
    };

    existing.totalDurationMs += activity.durationMs;
    existing.activityCount += 1;
    categoryMap.set(categoryId, existing);
  }

  const breakdowns: CategoryBreakdown[] = [];
  for (const data of categoryMap.values()) {
    breakdowns.push({
      ...data,
      percentage: totalDuration > 0 ? (data.totalDurationMs / totalDuration) * 100 : 0,
    });
  }

  return breakdowns.sort((a, b) => b.totalDurationMs - a.totalDurationMs);
}

/**
 * Generate daily summaries CSV
 */
function dailySummariesToCsv(summaries: DailySummary[]): string {
  const headers = [
    "date",
    "totalDurationMs",
    "totalDurationHours",
    "productiveDurationMs",
    "productiveDurationHours",
    "unproductiveDurationMs",
    "unproductiveDurationHours",
    "activityCount",
    "topCategory",
  ];

  const rows = summaries.map((summary) => [
    summary.date,
    summary.totalDurationMs,
    (summary.totalDurationMs / 3600000).toFixed(2),
    summary.productiveDurationMs,
    (summary.productiveDurationMs / 3600000).toFixed(2),
    summary.unproductiveDurationMs,
    (summary.unproductiveDurationMs / 3600000).toFixed(2),
    summary.activityCount,
    summary.topCategory || "",
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Generate category breakdown CSV
 */
function categoryBreakdownToCsv(breakdowns: CategoryBreakdown[]): string {
  const headers = [
    "categoryId",
    "categoryName",
    "categoryColor",
    "isProductive",
    "totalDurationMs",
    "totalDurationHours",
    "activityCount",
    "percentageOfTotal",
  ];

  const rows = breakdowns.map((breakdown) => [
    breakdown.categoryId,
    breakdown.categoryName,
    breakdown.categoryColor,
    breakdown.isProductive,
    breakdown.totalDurationMs,
    (breakdown.totalDurationMs / 3600000).toFixed(2),
    breakdown.activityCount,
    breakdown.percentage.toFixed(2),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Export data to CSV format
 */
export async function exportToCSV(
  options: ExportOptions,
  filePath: string,
  onProgress?: ProgressCallback,
): Promise<ExportResult> {
  const startTime = Date.now();

  try {
    const user = getOrCreateLocalUser();

    onProgress?.({
      step: "Loading categories...",
      percentage: 10,
      itemsProcessed: 0,
      totalItems: 0,
    });

    // Get categories
    const categories = getCategoriesByUserId(user.id, true);
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const exportedCategories = categories.map(categoryToExported);

    let exportedActivities: ExportedActivity[] = [];
    let totalEvents = 0;

    if (
      options.dataType === ExportDataType.Activities ||
      options.dataType === ExportDataType.All
    ) {
      onProgress?.({
        step: "Loading activities...",
        percentage: 30,
        itemsProcessed: 0,
        totalItems: 0,
      });

      // Get activities within date range
      const startDate = options.dateRange
        ? new Date(options.dateRange.startDate)
        : new Date(0);
      const endDate = options.dateRange
        ? new Date(options.dateRange.endDate)
        : new Date();

      const events = getEventsByUserAndTimeRange(user.id, startDate, endDate);
      totalEvents = events.length;

      onProgress?.({
        step: "Processing activities...",
        percentage: 50,
        itemsProcessed: 0,
        totalItems: totalEvents,
      });

      exportedActivities = events.map((event, index) => {
        if (index % 100 === 0) {
          onProgress?.({
            step: "Processing activities...",
            percentage: 50 + Math.round((index / totalEvents) * 30),
            itemsProcessed: index,
            totalItems: totalEvents,
          });
        }
        return eventToExported(event, categoryMap, options);
      });
    }

    onProgress?.({
      step: "Generating CSV files...",
      percentage: 85,
      itemsProcessed: totalEvents,
      totalItems: totalEvents,
    });

    // Generate CSV content based on data type
    let csvContent = "";

    if (options.dataType === ExportDataType.Categories) {
      csvContent = categoriesToCsv(exportedCategories);
    } else if (options.dataType === ExportDataType.Activities) {
      // For activities, create a combined CSV with activities, daily summaries, and category breakdown
      const activitiesCsv = activitiesToCsv(exportedActivities);
      const dailySummaries = generateDailySummaries(exportedActivities);
      const dailySummariesCsv = dailySummariesToCsv(dailySummaries);
      const categoryBreakdown = generateCategoryBreakdown(exportedActivities);
      const categoryBreakdownCsv = categoryBreakdownToCsv(categoryBreakdown);

      csvContent = [
        "=== ACTIVITIES ===",
        activitiesCsv,
        "",
        "=== DAILY SUMMARIES ===",
        dailySummariesCsv,
        "",
        "=== CATEGORY BREAKDOWN ===",
        categoryBreakdownCsv,
      ].join("\n");
    } else {
      // ExportDataType.All - export everything
      const activitiesCsv = activitiesToCsv(exportedActivities);
      const categoriesCsv = categoriesToCsv(exportedCategories);
      const dailySummaries = generateDailySummaries(exportedActivities);
      const dailySummariesCsv = dailySummariesToCsv(dailySummaries);
      const categoryBreakdown = generateCategoryBreakdown(exportedActivities);
      const categoryBreakdownCsv = categoryBreakdownToCsv(categoryBreakdown);

      csvContent = [
        "=== CATEGORIES ===",
        categoriesCsv,
        "",
        "=== ACTIVITIES ===",
        activitiesCsv,
        "",
        "=== DAILY SUMMARIES ===",
        dailySummariesCsv,
        "",
        "=== CATEGORY BREAKDOWN ===",
        categoryBreakdownCsv,
      ].join("\n");
    }

    onProgress?.({
      step: "Writing file...",
      percentage: 95,
      itemsProcessed: totalEvents,
      totalItems: totalEvents,
    });

    // Write file
    await writeFile(filePath, csvContent, "utf-8");

    const fileSizeBytes = Buffer.byteLength(csvContent, "utf-8");
    const durationMs = Date.now() - startTime;

    onProgress?.({
      step: "Export complete!",
      percentage: 100,
      itemsProcessed: totalEvents,
      totalItems: totalEvents,
    });

    return {
      success: true,
      filePath,
      stats: {
        activitiesCount: exportedActivities.length,
        categoriesCount: exportedCategories.length,
        fileSizeBytes,
        durationMs,
      },
    };
  } catch (error) {
    console.error("[ExportService] CSV export failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Export data to JSON format
 */
export async function exportToJSON(
  options: ExportOptions,
  filePath: string,
  onProgress?: ProgressCallback,
): Promise<ExportResult> {
  const startTime = Date.now();

  try {
    const user = getOrCreateLocalUser();

    onProgress?.({
      step: "Loading categories...",
      percentage: 10,
      itemsProcessed: 0,
      totalItems: 0,
    });

    // Get categories
    const categories = getCategoriesByUserId(user.id, true);
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const exportedCategories = categories.map(categoryToExported);

    let exportedActivities: ExportedActivity[] = [];
    let totalEvents = 0;

    if (
      options.dataType === ExportDataType.Activities ||
      options.dataType === ExportDataType.All
    ) {
      onProgress?.({
        step: "Loading activities...",
        percentage: 30,
        itemsProcessed: 0,
        totalItems: 0,
      });

      // Get activities within date range
      const startDate = options.dateRange
        ? new Date(options.dateRange.startDate)
        : new Date(0);
      const endDate = options.dateRange
        ? new Date(options.dateRange.endDate)
        : new Date();

      const events = getEventsByUserAndTimeRange(user.id, startDate, endDate);
      totalEvents = events.length;

      onProgress?.({
        step: "Processing activities...",
        percentage: 50,
        itemsProcessed: 0,
        totalItems: totalEvents,
      });

      exportedActivities = events.map((event, index) => {
        if (index % 100 === 0) {
          onProgress?.({
            step: "Processing activities...",
            percentage: 50 + Math.round((index / totalEvents) * 30),
            itemsProcessed: index,
            totalItems: totalEvents,
          });
        }
        return eventToExported(event, categoryMap, options);
      });
    }

    onProgress?.({
      step: "Generating JSON...",
      percentage: 85,
      itemsProcessed: totalEvents,
      totalItems: totalEvents,
    });

    // Get settings (non-sensitive only)
    let settings: Record<string, string | number | boolean> | undefined;
    if (options.dataType === ExportDataType.All) {
      const allSettings = getAllSettings();
      // Filter out any potentially sensitive settings
      const sensitiveKeys = [
        "auth_token",
        "api_key",
        "password",
        "secret",
        "credential",
      ];
      settings = Object.fromEntries(
        Object.entries(allSettings).filter(
          ([key]) =>
            !sensitiveKeys.some((sensitive) =>
              key.toLowerCase().includes(sensitive),
            ),
        ),
      );
    }

    // Build export data structure
    const exportData: FullExportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        appVersion: app.getVersion(),
        format: ExportFormat.JSON,
        dateRange: options.dateRange,
        privacyOptions: options.privacy,
      },
      categories:
        options.dataType === ExportDataType.Activities
          ? []
          : exportedCategories,
      activities:
        options.dataType === ExportDataType.Categories
          ? []
          : exportedActivities,
      settings,
    };

    onProgress?.({
      step: "Writing file...",
      percentage: 95,
      itemsProcessed: totalEvents,
      totalItems: totalEvents,
    });

    // Write file with pretty formatting
    const jsonContent = JSON.stringify(exportData, null, 2);
    await writeFile(filePath, jsonContent, "utf-8");

    const fileSizeBytes = Buffer.byteLength(jsonContent, "utf-8");
    const durationMs = Date.now() - startTime;

    onProgress?.({
      step: "Export complete!",
      percentage: 100,
      itemsProcessed: totalEvents,
      totalItems: totalEvents,
    });

    return {
      success: true,
      filePath,
      stats: {
        activitiesCount: exportedActivities.length,
        categoriesCount: exportedCategories.length,
        fileSizeBytes,
        durationMs,
      },
    };
  } catch (error) {
    console.error("[ExportService] JSON export failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate a default filename for export
 */
export function generateExportFilename(
  format: ExportFormat,
  dataType: ExportDataType,
): string {
  const date = new Date().toISOString().substring(0, 10);
  const extension = format === ExportFormat.CSV ? "csv" : "json";
  return `cronus-export-${dataType}-${date}.${extension}`;
}
