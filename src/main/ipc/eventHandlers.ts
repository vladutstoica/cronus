import { ipcMain } from "electron";
import { getOrCreateLocalUser } from "../database/services/users";
import {
  getEventsByUserId,
  getEventsByUserAndTimeRange,
  getEventById,
  getUserStatistics,
  updateActiveWindowEvent,
} from "../database/services/activeWindowEvents";
import {
  processWindowEvent,
  updateEventDuration,
  endWindowEvent,
  recategorizeEvent,
  recategorizeEventsByIdentifierService,
} from "../services/windowTracking";
import { snakeToCamel } from "../utils/snakeToCamel";

// Convert event snake_case to camelCase for frontend
const convertEventToCamelCase = (event: any): Record<string, unknown> => ({
  ...snakeToCamel(event),
  _id: event.id, // frontend expects _id instead of id
  timestamp: new Date(event.timestamp).getTime(), // Convert to number
});

export function registerEventHandlers(): void {
  ipcMain.handle(
    "local:get-events",
    (_event, limit?: number, offset?: number) => {
      const user = getOrCreateLocalUser();
      const events = getEventsByUserId(user.id, limit, offset);
      return events.map(convertEventToCamelCase);
    },
  );

  ipcMain.handle(
    "local:get-events-by-date-range",
    (_event, startDate: string, endDate: string) => {
      const user = getOrCreateLocalUser();
      const events = getEventsByUserAndTimeRange(
        user.id,
        new Date(startDate),
        new Date(endDate),
      );

      console.log(
        `[IPC] Loaded ${events.length} events for range ${startDate} to ${endDate}`,
      );

      const convertedEvents = events.map(convertEventToCamelCase);

      if (convertedEvents.length > 0) {
        console.log("[IPC] Sample event:", {
          owner: convertedEvents[0].ownerName,
          timestamp: convertedEvents[0].timestamp,
          categoryId: convertedEvents[0].categoryId,
        });
      }

      return convertedEvents;
    },
  );

  ipcMain.handle("local:get-event-by-id", (_event, id: string) => {
    const event = getEventById(id);
    if (!event) return event;
    return convertEventToCamelCase(event);
  });

  ipcMain.handle("local:update-event", (_event, id: string, updates: any) => {
    return updateActiveWindowEvent(id, updates);
  });

  ipcMain.handle(
    "local:get-user-statistics",
    (_event, startDate: string, endDate: string) => {
      const user = getOrCreateLocalUser();
      return getUserStatistics(user.id, new Date(startDate), new Date(endDate));
    },
  );

  ipcMain.handle(
    "local:recategorize-event",
    (_event, eventId: string, categoryId: string) => {
      return recategorizeEvent(eventId, categoryId);
    },
  );

  ipcMain.handle(
    "local:recategorize-events-by-identifier",
    (
      _event,
      identifier: string,
      itemType: "app" | "website",
      startDateMs: number,
      endDateMs: number,
      newCategoryId: string,
    ) => {
      return recategorizeEventsByIdentifierService(
        identifier,
        itemType,
        startDateMs,
        endDateMs,
        newCategoryId,
      );
    },
  );

  // Window tracking handlers
  ipcMain.handle("local:process-window-event", (_event, eventDetails: any) => {
    return processWindowEvent({
      ...eventDetails,
      timestamp: new Date(eventDetails.timestamp),
    });
  });

  ipcMain.handle(
    "local:update-event-duration",
    (_event, windowId: string, durationMs: number) => {
      return updateEventDuration(windowId, durationMs);
    },
  );

  ipcMain.handle("local:end-window-event", (_event, windowId: string) => {
    return endWindowEvent(windowId);
  });
}
