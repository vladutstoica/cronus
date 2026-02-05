import { ipcMain } from "electron";
import { getOrCreateLocalUser } from "../database/services/users";
import {
  getActiveSession,
  startSession,
  endSession,
  updateSessionNote,
  getSessionsByDate,
} from "../database/services/workSessions";
import { snakeToCamel } from "../utils/snakeToCamel";
import { WorkSession } from "../database/services/workSessions";

// Convert work session snake_case to camelCase for frontend
const convertWorkSessionToCamelCase = (session: WorkSession | null) =>
  session ? snakeToCamel(session as unknown as Record<string, unknown>) : null;

export function registerWorkSessionHandlers(): void {
  ipcMain.handle("work-session:get-active", () => {
    const user = getOrCreateLocalUser();
    const session = getActiveSession(user.id);
    return convertWorkSessionToCamelCase(session);
  });

  ipcMain.handle("work-session:start", (_event, note: string) => {
    const user = getOrCreateLocalUser();
    const session = startSession(user.id, note);
    return convertWorkSessionToCamelCase(session);
  });

  ipcMain.handle("work-session:end", (_event, sessionId: string) => {
    const session = endSession(sessionId);
    return convertWorkSessionToCamelCase(session);
  });

  ipcMain.handle(
    "work-session:update-note",
    (_event, sessionId: string, note: string) => {
      const session = updateSessionNote(sessionId, note);
      return convertWorkSessionToCamelCase(session);
    },
  );

  ipcMain.handle("work-session:get-by-date", (_event, date: string) => {
    const user = getOrCreateLocalUser();
    const sessions = getSessionsByDate(user.id, date);
    return sessions.map(convertWorkSessionToCamelCase);
  });
}
