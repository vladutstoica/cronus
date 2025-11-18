import { X } from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface QuitConfirmationModalProps {
  isOpen: boolean;
  onQuit: () => void;
  onKeepRunning: () => void;
  onOpenSettings: () => void;
}

export function QuitConfirmationModal({
  isOpen,
  onQuit,
  onKeepRunning,
  onOpenSettings,
}: QuitConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[9999]" />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <Card className="w-full max-w-md relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={onKeepRunning}
            className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
          <CardHeader>
            <CardTitle>Are you sure you want to quit Cronus?</CardTitle>
            <CardDescription>
              We automatically pause tracking when your computer sleeps. You can
              also pause tracking manually instead of quitting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2">
              <Button
                onClick={onOpenSettings}
                variant="outline"
                className="w-full"
              >
                Pause Tracking
              </Button>
              <Button
                onClick={() =>
                  window.open(
                    "mailto:wallawitsch@gmail.com, arne.strickmann@googlemail.com?subject=Cronus%20Feedback",
                  )
                }
                variant="outline"
                className="w-full"
              >
                Email Feedback
              </Button>
              <Button onClick={onQuit} variant="default" className="w-full">
                Quit App
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
