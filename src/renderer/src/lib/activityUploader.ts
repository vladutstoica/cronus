import { ActiveWindowDetails } from "@shared/types";
import { SYSTEM_EVENT_NAMES } from "./constants";
import { deleteLocalFile } from "./s3Uploader";

const CONTENT_CHAR_CUTOFF = 2000;

// Define the type for the mutateAsync function we expect
interface MutateAsyncFunction {
  (variables: any): Promise<any>;
}

// Define the event data type
interface EventData {
  token: string;
  windowId?: number;
  ownerName: string;
  type: "window" | "browser" | "system" | "manual" | "calendar" | "idle";
  browser?: "chrome" | "safari" | "arc" | null;
  title?: string | null;
  url?: string | null;
  content?: string | null;
  timestamp: number;
  screenshotS3Url?: string;
}

export const uploadActiveWindowEvent = async (
  token: string,
  windowDetails: ActiveWindowDetails & { localScreenshotPath?: string },
  mutateEvent: MutateAsyncFunction,
): Promise<void> => {
  // Don't upload browser events that are missing a URL.
  // Use type/browser fields instead of hardcoding specific browser names
  if (
    (windowDetails.type === "browser" || windowDetails.browser) &&
    !windowDetails.url
  ) {
    console.log("Skipping browser event upload: missing URL.", windowDetails);
    return;
  }

  // Token no longer needed in local-first version
  if (!windowDetails) {
    return;
  }

  const isSystemEvent = SYSTEM_EVENT_NAMES.includes(windowDetails.ownerName);

  let redactedContent = windowDetails.content;
  if (redactedContent) {
    try {
      redactedContent =
        await window.api.redactSensitiveContent(redactedContent);
    } catch (error) {
      console.error("❌ Failed to redact content:", error);
      // Continue with original content if redaction fails
    }
  }

  // Map ActiveWindowDetails to the input type expected by the backend
  const eventData: EventData = {
    token,
    windowId: isSystemEvent ? 0 : windowDetails.windowId,
    ownerName: windowDetails.ownerName,
    type: isSystemEvent ? "system" : windowDetails.type,
    browser: windowDetails.browser,
    title: windowDetails.title,
    url: windowDetails.url,
    content: redactedContent?.substring(0, CONTENT_CHAR_CUTOFF),
    timestamp: windowDetails.timestamp || Date.now(),
    screenshotS3Url: windowDetails.screenshotS3Url ?? undefined,
  };

  try {
    if (!isSystemEvent) {
      // Always delete the local screenshot if it exists, since we now rely on OCR content.
      if (windowDetails.localScreenshotPath) {
        // console.log(
        //   `[ActivityUploader] Deleting screenshot for ${windowDetails.ownerName} as we now use OCR.`
        // );
        await deleteLocalFile(windowDetails.localScreenshotPath);
      }
    }

    // console.log(
    //   `[ActivityUploader] Uploading event for ${windowDetails.ownerName} with ${windowDetails.content?.length || 0} chars content`
    // )
    await mutateEvent(eventData);
  } catch (error) {
    console.error("Error in uploadActiveWindowEvent:", error);
  }
};
