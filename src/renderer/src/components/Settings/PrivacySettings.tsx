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

      events?.forEach((event: any) => {
        if (event.ownerName && !uniqueApps.has(event.ownerName)) {
          const categoryName = event.categoryDetails?.name || "Uncategorized";
          uniqueApps.set(event.ownerName, categoryName);
        }
      });

      const apps: TrackedApp[] = Array.from(uniqueApps.entries())
        .map(([name, category]) => ({ name, category }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setTrackedApps(apps);

      // Load non-tracked apps from user settings (placeholder for now)
      // In a full implementation, this would load from a database table
      setNonTrackedApps([]);
    } catch (error) {
      console.error("Failed to load privacy settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const moveToNonTracked = (appName: string) => {
    setTrackedApps((prev) => prev.filter((app) => app.name !== appName));
    setNonTrackedApps((prev) => [...prev, appName].sort());
    // TODO: Save to database when feature is complete
  };

  const moveToTracked = (appName: string) => {
    setNonTrackedApps((prev) => prev.filter((name) => name !== appName));
    setTrackedApps((prev) =>
      [...prev, { name: appName, category: "Uncategorized" }].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    // TODO: Save to database when feature is complete
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
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl">Privacy</CardTitle>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">
            Beta
          </span>
        </div>
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

        {/* Beta Notice */}
        <p className="text-xs text-muted-foreground italic">
          This feature is in beta. Changes made here are not yet persisted and
          will not affect tracking until the feature is complete.
        </p>
      </CardContent>
    </Card>
  );
};
