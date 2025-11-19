// This file is no longer used - calendar integration has been removed
// Keeping as stub to avoid import errors

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

export const GoogleCalendarSettings = () => {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-xl">Google Calendar</CardTitle>
        <CardDescription>
          Google Calendar integration has been disabled in this version.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Calendar features are not available.
        </p>
      </CardContent>
    </Card>
  );
};
