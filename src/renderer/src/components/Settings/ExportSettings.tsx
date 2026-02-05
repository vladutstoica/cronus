import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { localApi } from "../../lib/localApi";
import {
  ExportDataType,
  ExportFormat,
  ExportOptions,
  ExportProgress,
  ExportResult,
} from "@shared/exportTypes";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type DateRangeOption = "all" | "last7days" | "last30days" | "last90days" | "thisMonth" | "lastMonth";

interface DateRangeInfo {
  label: string;
  getRange: () => { startDate: string; endDate: string } | undefined;
}

const dateRangeOptions: Record<DateRangeOption, DateRangeInfo> = {
  all: {
    label: "All Time",
    getRange: () => undefined,
  },
  last7days: {
    label: "Last 7 Days",
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    },
  },
  last30days: {
    label: "Last 30 Days",
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    },
  },
  last90days: {
    label: "Last 90 Days",
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    },
  },
  thisMonth: {
    label: "This Month",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date();
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    },
  },
  lastMonth: {
    label: "Last Month",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    },
  },
};

export const ExportSettings = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  // Export options state
  const [format, setFormat] = useState<ExportFormat>(ExportFormat.CSV);
  const [dataType, setDataType] = useState<ExportDataType>(ExportDataType.All);
  const [dateRange, setDateRange] = useState<DateRangeOption>("last30days");
  const [excludeOcrContent, setExcludeOcrContent] = useState(true);
  const [excludeUrls, setExcludeUrls] = useState(false);
  const [excludeScreenshots, setExcludeScreenshots] = useState(true);

  // Estimation state
  const [estimation, setEstimation] = useState<{
    estimatedActivities: number;
    estimatedCategories: number;
  } | null>(null);

  // Subscribe to progress events
  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }
    const unsubscribe = localApi.export.onProgress((progressUpdate) => {
      setProgress(progressUpdate);
    });
    return unsubscribe;
  }, [isDialogOpen]);

  // Fetch estimation when options change
  useEffect(() => {
    if (isDialogOpen && !isExporting) {
      const fetchEstimation = async () => {
        const options = buildExportOptions();
        const est = await localApi.export.estimate(options);
        setEstimation(est);
      };
      fetchEstimation();
    }
  }, [isDialogOpen, format, dataType, dateRange, isExporting]);

  const buildExportOptions = useCallback((): ExportOptions => {
    return {
      format,
      dataType,
      dateRange: dateRangeOptions[dateRange].getRange(),
      privacy: {
        excludeOcrContent,
        excludeUrls,
        excludeScreenshots,
      },
    };
  }, [format, dataType, dateRange, excludeOcrContent, excludeUrls, excludeScreenshots]);

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(null);
    setExportResult(null);

    try {
      const options = buildExportOptions();
      const result = await localApi.export.start(options);
      setExportResult(result);
    } catch (error) {
      setExportResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCloseDialog = () => {
    if (!isExporting) {
      setIsDialogOpen(false);
      setExportResult(null);
      setProgress(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Data
        </CardTitle>
        <CardDescription>
          Export your tracked activities and categories for backup, analysis, or
          migration. All data is stored locally and never leaves your device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Export Options</DialogTitle>
              <DialogDescription>
                Configure your export settings. The export will be saved to a
                location of your choice.
              </DialogDescription>
            </DialogHeader>

            {/* Export result display */}
            {exportResult && (
              <div
                className={`p-4 rounded-lg mb-4 ${
                  exportResult.success
                    ? "bg-green-500/10 border border-green-500/20"
                    : "bg-red-500/10 border border-red-500/20"
                }`}
              >
                {exportResult.success ? (
                  <div className="space-y-2">
                    <p className="font-medium text-green-400">
                      Export completed successfully!
                    </p>
                    {exportResult.stats && (
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          Activities exported: {exportResult.stats.activitiesCount}
                        </p>
                        <p>
                          Categories exported: {exportResult.stats.categoriesCount}
                        </p>
                        <p>
                          File size: {formatFileSize(exportResult.stats.fileSizeBytes)}
                        </p>
                        <p>
                          Duration: {formatDuration(exportResult.stats.durationMs)}
                        </p>
                      </div>
                    )}
                    {exportResult.filePath && (
                      <p className="text-xs text-muted-foreground mt-2 break-all">
                        Saved to: {exportResult.filePath}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-red-400">Export failed</p>
                    <p className="text-sm text-muted-foreground">
                      {exportResult.error}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Progress display */}
            {isExporting && progress && (
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span>{progress.step}</span>
                  <span>{progress.percentage}%</span>
                </div>
                <Progress value={progress.percentage} aria-label="Export progress" />
                {progress.totalItems > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {progress.itemsProcessed} / {progress.totalItems} items
                  </p>
                )}
              </div>
            )}

            {/* Export options form */}
            {!isExporting && !exportResult && (
              <div className="space-y-4">
                {/* Format selection */}
                <div className="space-y-2">
                  <Label htmlFor="format">Export Format</Label>
                  <Select
                    value={format}
                    onValueChange={(value) => setFormat(value as ExportFormat)}
                  >
                    <SelectTrigger id="format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ExportFormat.CSV}>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          CSV (Spreadsheet)
                        </div>
                      </SelectItem>
                      <SelectItem value={ExportFormat.JSON}>
                        <div className="flex items-center gap-2">
                          <FileJson className="h-4 w-4" />
                          JSON (Full Export)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {format === ExportFormat.CSV
                      ? "Best for viewing in Excel/Google Sheets. Includes activities, daily summaries, and category breakdown."
                      : "Best for backup and re-import. Includes all data in a structured format."}
                  </p>
                </div>

                {/* Data type selection */}
                <div className="space-y-2">
                  <Label htmlFor="dataType">Data to Export</Label>
                  <Select
                    value={dataType}
                    onValueChange={(value) =>
                      setDataType(value as ExportDataType)
                    }
                  >
                    <SelectTrigger id="dataType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ExportDataType.All}>
                        All Data (Activities + Categories)
                      </SelectItem>
                      <SelectItem value={ExportDataType.Activities}>
                        Activities Only
                      </SelectItem>
                      <SelectItem value={ExportDataType.Categories}>
                        Categories Only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date range selection */}
                <div className="space-y-2">
                  <Label htmlFor="dateRange">Date Range</Label>
                  <Select
                    value={dateRange}
                    onValueChange={(value) =>
                      setDateRange(value as DateRangeOption)
                    }
                  >
                    <SelectTrigger id="dateRange">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(dateRangeOptions).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          {info.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Privacy options */}
                <div className="space-y-3">
                  <Label>Privacy Options</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="excludeOcr"
                        checked={excludeOcrContent}
                        onCheckedChange={(checked) =>
                          setExcludeOcrContent(checked === true)
                        }
                      />
                      <Label
                        htmlFor="excludeOcr"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Exclude OCR content (screen text)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="excludeUrls"
                        checked={excludeUrls}
                        onCheckedChange={(checked) =>
                          setExcludeUrls(checked === true)
                        }
                      />
                      <Label
                        htmlFor="excludeUrls"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Exclude URLs
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="excludeScreenshots"
                        checked={excludeScreenshots}
                        onCheckedChange={(checked) =>
                          setExcludeScreenshots(checked === true)
                        }
                      />
                      <Label
                        htmlFor="excludeScreenshots"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Exclude screenshot paths
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Estimation */}
                {estimation && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="font-medium mb-1">Export Preview</p>
                    <p className="text-muted-foreground">
                      {dataType !== ExportDataType.Categories && (
                        <>
                          ~{estimation.estimatedActivities.toLocaleString()}{" "}
                          activities
                        </>
                      )}
                      {dataType === ExportDataType.All && " and "}
                      {dataType !== ExportDataType.Activities && (
                        <>
                          ~{estimation.estimatedCategories.toLocaleString()}{" "}
                          categories
                        </>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              {exportResult ? (
                <Button onClick={handleCloseDialog}>Close</Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCloseDialog}
                    disabled={isExporting}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleExport} disabled={isExporting}>
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </>
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <p className="text-xs text-muted-foreground mt-3">
          Exports include activity timestamps, durations, categories, and
          summaries. You can choose to exclude sensitive data like URLs and OCR
          content.
        </p>
      </CardContent>
    </Card>
  );
};
