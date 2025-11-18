import { CheckCircle, Shield } from "lucide-react";

interface AccessibilityStepProps {
  permissionStatus: number | null;
  hasRequestedPermission: boolean;
}

export function AccessibilityStep({
  permissionStatus,
  hasRequestedPermission,
}: AccessibilityStepProps) {
  return (
    <div className="text-center space-y-4 flex flex-col items-center">
      <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full">
        <Shield className="w-12 h-12 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="bg-muted/30 rounded-lg p-4 border border-border/50 max-w-md w-full">
        <h3 className="font-semibold mb-2 text-left text-md">
          Why We Need This Permission
        </h3>
        <ul className="space-y-4 text-left text-muted-foreground">
          <li className="flex items-baseline">
            <span className="text-blue-500 mr-3">&#x2022;</span>
            <span>
              Automatically track application and website usage to categorize
              your activities.
            </span>
          </li>
          <li className="flex items-baseline">
            <span className="text-blue-500 mr-3">&#x2022;</span>
            <span>Provide detailed insights into your productivity.</span>
          </li>
        </ul>
      </div>
      {hasRequestedPermission && permissionStatus !== 1 && (
        <div className="bg-blue-50 w-full dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-left text-blue-800 dark:text-blue-200">
            <div className="font-semibold pb-1">Next steps:</div>
            <ul className="list-disc list-inside">
              <li>Go to System Preferences → Security & Privacy → Privacy</li>
              <li>Click &quot;Accessibility&quot; on the left</li>
              <li>Check the box next to &quot;Cronus&quot; to enable access</li>
            </ul>
          </div>
        </div>
      )}
      {hasRequestedPermission && permissionStatus === 1 && (
        <div className="w-full bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mt-4 border border-green-200 dark:border-green-800">
          <div className="text-sm text-green-800 dark:text-green-200 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            <div className="font-medium">
              Permission granted! You can now continue.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
