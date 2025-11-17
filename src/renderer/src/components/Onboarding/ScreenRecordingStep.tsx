import { CheckCircle, ShieldCheck } from 'lucide-react'

interface ScreenRecordingStepProps {
  screenRecordingStatus: number | null
  hasRequestedScreenRecording: boolean
}

export function ScreenRecordingStep({
  screenRecordingStatus,
  hasRequestedScreenRecording
}: ScreenRecordingStepProps) {
  return (
    <div className="text-center space-y-6 flex flex-col items-center">
      <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full">
        <ShieldCheck className="w-12 h-12 text-blue-600 dark:text-blue-400" />
      </div>

      <div className="bg-muted/30 rounded-lg p-4 border border-border/50 max-w-md w-full">
        <h3 className="font-semibold mb-2 text-left text-md">Improve Time Tracking Accuracy</h3>
        <ul className="space-y-4 text-left text-muted-foreground">
          <li className="flex items-baseline">
            <span className="text-blue-500 mr-3">&#x2022;</span>
            <span>
              We use on-device Optical Character Recognition (OCR) to analyze temporary screenshots
              of your active window, allowing for automatic activity categorization.
            </span>
          </li>
          <li className="flex items-baseline">
            <span className="text-blue-500 mr-3">&#x2022;</span>
            <span>
              Screenshots are <div className="inline-block font-semibold">deleted immediately</div>{' '}
              after processing and are{' '}
              <div className="inline-block font-semibold">never stored or uploaded</div>.
            </span>
          </li>
          <li className="flex items-baseline">
            <span className="text-blue-500 mr-3">&#x2022;</span>
            <span>This step is optional but highly recommended for accuracy.</span>
          </li>
        </ul>
      </div>
      {/* TODO: screenRecordingStatus !== 1 is not working I think but we could make this open when the user clicks on "Grant Access" as additional instructions */}
      {hasRequestedScreenRecording && screenRecordingStatus !== 1 && (
        <div className="bg-blue-50 w-full dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-left text-blue-800 dark:text-blue-200">
            <div className="font-semibold pb-1">Next steps:</div>
            <ul className="list-disc list-inside">
              <li>Go to System Preferences → Security & Privacy → Privacy</li>
              <li>Click &quot;Screen & System Audio Recording&quot; on the left</li>
              <li>Check the box next to &quot;Cronus&quot; to enable access</li>
            </ul>
          </div>
        </div>
      )}
      {hasRequestedScreenRecording && screenRecordingStatus === 1 && (
        <div className="bg-green-50 w-full dark:bg-green-900/20 rounded-lg p-4 mt-4 border border-green-200 dark:border-green-800">
          <div className="text-sm text-green-800 dark:text-green-200 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            <div className="font-medium">Permission granted! You can now continue.</div>
          </div>
        </div>
      )}
    </div>
  )
}
