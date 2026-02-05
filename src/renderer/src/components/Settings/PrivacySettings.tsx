import { ChevronRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { localApi } from "../../lib/localApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

interface TrackedApp {
  name: string;
  category?: string;
}

export const PrivacySettings = () => {
  const [trackedApps, setTrackedApps] = useState<TrackedApp[]>([]);
  const [nonTrackedApps, setNonTrackedApps] = useState<string[]>([]);
  const [trackedSearch, setTrackedSearch] = useState("");
  const [nonTrackedSearch, setNonTrackedSearch] = useState("");
  const [showCategories, setShowCategories] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load unique apps from events
      const events = await localApi.events.getAll(1000, 0);
      const uniqueApps = new Map<string, string>();

      events?.forEach(
        (event: {
          ownerName?: string;
          categoryDetails?: { name: string };
        }) => {
          if (event.ownerName && !uniqueApps.has(event.ownerName)) {
            const categoryName =
              event.categoryDetails?.name || "Uncategorized";
            uniqueApps.set(event.ownerName, categoryName);
          }
        },
      );

      const apps: TrackedApp[] = Array.from(uniqueApps.entries())
        .map(([name, category]) => ({ name, category }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Load non-tracked apps from settings
      const savedNonTracked = await localApi.settings.get("non_tracked_apps");
      const nonTrackedList: string[] = savedNonTracked
        ? JSON.parse(savedNonTracked)
        : [];
      setNonTrackedApps(nonTrackedList);

      // Filter non-tracked apps out of the tracked list
      setTrackedApps(
        apps.filter((app) => !nonTrackedList.includes(app.name)),
      );
    } catch (error) {
      console.error("Failed to load privacy settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNonTrackedApps = async (apps: string[]) => {
    try {
      await localApi.settings.set("non_tracked_apps", JSON.stringify(apps));
    } catch (error) {
      console.error("Failed to save non-tracked apps:", error);
    }
  };

  const moveToNonTracked = (appName: string) => {
    setTrackedApps((prev) => prev.filter((app) => app.name !== appName));
    setNonTrackedApps((prev) => {
      const updated = [...prev, appName].sort();
      saveNonTrackedApps(updated);
      return updated;
    });
  };

  const moveToTracked = (appName: string) => {
    setNonTrackedApps((prev) => {
      const updated = prev.filter((name) => name !== appName);
      saveNonTrackedApps(updated);
      return updated;
    });
    setTrackedApps((prev) =>
      [...prev, { name: appName, category: "Uncategorized" }].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
  };

  const filteredTrackedApps = trackedApps.filter((app) =>
    app.name.toLowerCase().includes(trackedSearch.toLowerCase()),
  );

  const filteredNonTrackedApps = nonTrackedApps.filter((name) =>
    name.toLowerCase().includes(nonTrackedSearch.toLowerCase()),
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-1/3 bg-muted rounded animate-pulse mb-2"></div>
          <div className="h-4 w-2/3 bg-muted rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Privacy</CardTitle>
        <CardDescription>
          If you prefer that Cronus does not track certain apps or websites,
          please add them to the non-tracking list. Note that all tracking data
          is stored locally on your device and is never transmitted externally.
          For more accurate tracking, keep the non-tracking list as short as
          possible.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show Categories Toggle */}
        <div className="flex items-center justify-end gap-2">
          <Switch
            id="show-categories"
            checked={showCategories}
            onCheckedChange={setShowCategories}
          />
          <Label htmlFor="show-categories" className="text-sm">
            Show Categories
          </Label>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-4">
          {/* Default Tracking Column */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Default Tracking</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={trackedSearch}
                    onChange={(e) => setTrackedSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>
              {/* List */}
              <div className="h-64 overflow-y-auto">
                {filteredTrackedApps.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No apps found!
                  </div>
                ) : (
                  filteredTrackedApps.map((app) => (
                    <button
                      key={app.name}
                      onClick={() => moveToNonTracked(app.name)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent/50 transition-colors border-b border-border last:border-b-0 text-left"
                    >
                      <div>
                        <div className="text-sm font-medium">{app.name}</div>
                        {showCategories && (
                          <div className="text-xs text-muted-foreground">
                            {app.category}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Non-Tracking Column */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Non-Tracking</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={nonTrackedSearch}
                    onChange={(e) => setNonTrackedSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>
              {/* List */}
              <div className="h-64 overflow-y-auto">
                {filteredNonTrackedApps.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No apps or websites found!
                  </div>
                ) : (
                  filteredNonTrackedApps.map((name) => (
                    <button
                      key={name}
                      onClick={() => moveToTracked(name)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent/50 transition-colors border-b border-border last:border-b-0 text-left"
                    >
                      <div className="text-sm font-medium">{name}</div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground italic">
          Changes to the non-tracking list are saved automatically. Apps in the
          non-tracking list will be excluded from future activity tracking.
        </p>
      </CardContent>
    </Card>
  );
};
