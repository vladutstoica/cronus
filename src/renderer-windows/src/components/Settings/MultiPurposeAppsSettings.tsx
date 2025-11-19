import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Input } from "../ui/input";

export const MultiPurposeAppsSettings = () => {
  const { user } = useAuth();
  const [apps, setApps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadApps();
    }
  }, [user]);

  const loadApps = async () => {
    setIsLoading(true);
    try {
      const userData = await localApi.user.get();
      if (userData && userData.multi_purpose_apps) {
        setApps(userData.multi_purpose_apps);
      }
    } catch (error) {
      console.error("Failed to load multi-purpose apps:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (updatedApps: string[]) => {
    const validApps = updatedApps.map((s) => s.trim()).filter(Boolean);
    setApps(validApps);
    try {
      await localApi.user.update({ multi_purpose_apps: validApps });
    } catch (error) {
      console.error("Failed to update multi-purpose apps:", error);
    }
  };

  const handleAppChange = (index: number, value: string) => {
    const newApps = [...apps];
    newApps[index] = value;
    setApps(newApps);
  };

  const handleAddNew = () => {
    setApps([...apps, ""]);
  };

  const handleRemove = (index: number) => {
    const newApps = apps.filter((_, i) => i !== index);
    handleUpdate(newApps);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-1/2 bg-muted rounded animate-pulse mb-2"></div>
          <div className="h-4 w-3/4 bg-muted rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
                <div className="h-10 w-10 bg-muted rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Multi-Purpose Apps</CardTitle>
        <CardDescription>
          Apps listed here will always be re-evaluated by the AI instead of
          using your past history. Add apps that you use for both work and
          personal tasks (e.g., Messages, WhatsApp, Notion).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {apps.map((app, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={app}
                onChange={(e) => handleAppChange(index, e.target.value)}
                onBlur={() => handleUpdate(apps)}
                placeholder="Enter app name (e.g., Notion)"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            onClick={handleAddNew}
            variant="outline"
            className="md:col-span-2"
          >
            Add New App
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
