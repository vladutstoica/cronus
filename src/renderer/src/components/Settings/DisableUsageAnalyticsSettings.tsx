// This file is no longer used - analytics have been removed
// Keeping as stub to avoid import errors

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

export const DisableUsageAnalyticsSettings = () => {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-xl">Usage Analytics</CardTitle>
        <CardDescription>
          Analytics tracking has been removed from this version.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center space-x-2">
        <p className="text-sm text-muted-foreground">
          No usage data is being collected.
        </p>
      </CardContent>
    </Card>
  );
};
