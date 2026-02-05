/**
 * Export Types for Cronus Time Tracker
 *
 * Types and interfaces for data export functionality.
 */

/**
 * Supported export formats
 */
export enum ExportFormat {
  CSV = "csv",
  JSON = "json",
}

/**
 * Types of data that can be exported
 */
export enum ExportDataType {
  Activities = "activities",
  Categories = "categories",
  All = "all",
}

/**
 * Privacy options for export
 */
export interface ExportPrivacyOptions {
  /** Exclude OCR content from export */
  excludeOcrContent: boolean;
  /** Exclude URLs from export */
  excludeUrls: boolean;
  /** Exclude screenshot paths from export */
  excludeScreenshots: boolean;
}

/**
 * Date range for export filtering
 */
export interface ExportDateRange {
  /** Start date (ISO string) */
  startDate: string;
  /** End date (ISO string) */
  endDate: string;
}

/**
 * Options for export operation
 */
export interface ExportOptions {
  /** Export format (CSV or JSON) */
  format: ExportFormat;
  /** Type of data to export */
  dataType: ExportDataType;
  /** Optional date range filter */
  dateRange?: ExportDateRange;
  /** Privacy options */
  privacy: ExportPrivacyOptions;
}

/**
 * Progress update during export
 */
export interface ExportProgress {
  /** Current step description */
  step: string;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Number of items processed */
  itemsProcessed: number;
  /** Total number of items to process */
  totalItems: number;
}

/**
 * Result of export operation
 */
export interface ExportResult {
  /** Whether export was successful */
  success: boolean;
  /** Path where file was saved (if successful) */
  filePath?: string;
  /** Error message (if failed) */
  error?: string;
  /** Export statistics */
  stats?: ExportStats;
}

/**
 * Statistics about the export
 */
export interface ExportStats {
  /** Number of activities exported */
  activitiesCount: number;
  /** Number of categories exported */
  categoriesCount: number;
  /** File size in bytes */
  fileSizeBytes: number;
  /** Export duration in milliseconds */
  durationMs: number;
}

/**
 * Activity data structure for export (sanitized)
 */
export interface ExportedActivity {
  id: string;
  timestamp: string;
  ownerName: string;
  type: string;
  browser?: string;
  title?: string;
  url?: string;
  content?: string;
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  isProductive?: boolean;
  durationMs: number;
  llmSummary?: string;
  generatedTitle?: string;
}

/**
 * Category data structure for export
 */
export interface ExportedCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isProductive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Full export structure for JSON format
 */
export interface FullExportData {
  /** Export metadata */
  metadata: {
    exportedAt: string;
    appVersion: string;
    format: ExportFormat;
    dateRange?: ExportDateRange;
    privacyOptions: ExportPrivacyOptions;
  };
  /** Categories data */
  categories: ExportedCategory[];
  /** Activities data */
  activities: ExportedActivity[];
  /** App settings (non-sensitive) */
  settings?: Record<string, string | number | boolean>;
}

/**
 * Daily summary structure for CSV export
 */
export interface DailySummary {
  date: string;
  totalDurationMs: number;
  productiveDurationMs: number;
  unproductiveDurationMs: number;
  activityCount: number;
  topCategory?: string;
}

/**
 * Category breakdown for CSV export
 */
export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  isProductive: boolean;
  totalDurationMs: number;
  activityCount: number;
  percentage: number;
}
