import { useState, useEffect, useMemo } from "react";
import { Play, Square, Clock, History } from "lucide-react";

interface WorkSession {
  id: string;
  userId: string;
  note: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  createdAt: string;
}

interface SessionsTabProps {
  activeSession: WorkSession | null;
  recentSessions: WorkSession[];
  onStartSession: (note: string) => void;
  onEndSession: () => void;
  onUpdateNote: (note: string) => void;
  isLoading: boolean;
}

export function SessionsTab({
  activeSession,
  recentSessions,
  onStartSession,
  onEndSession,
  isLoading,
}: SessionsTabProps) {
  const [note, setNote] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);

  // Initialize note from active session
  useEffect(() => {
    if (activeSession) {
      setNote(activeSession.note);
    } else {
      setNote("");
    }
  }, [activeSession]);

  // Update elapsed time every second when session is active
  useEffect(() => {
    if (!activeSession || !activeSession.startedAt) {
      setElapsedMs(0);
      return;
    }

    const updateElapsed = () => {
      const startTime = new Date(activeSession.startedAt).getTime();
      if (isNaN(startTime)) {
        setElapsedMs(0);
        return;
      }
      const now = Date.now();
      setElapsedMs(now - startTime);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const formattedTime = useMemo(() => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [elapsedMs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    if (!activeSession) {
      onStartSession(note.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "--:--";
    }
  };

  return (
    <div className="space-y-3">
      {/* Session Timer */}
      <div className="border border-border rounded-lg p-4">
        {/* Timer display */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {activeSession ? "Session Timer" : "Start a Session"}
            </span>
          </div>
          {activeSession && (
            <span className="text-2xl font-mono tabular-nums font-bold text-success">
              {formattedTime}
            </span>
          )}
        </div>

        {/* Note input */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What are you working on? (e.g., JIRA-1234: Fix login bug)"
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-success focus:border-success resize-none"
            rows={2}
            disabled={!!activeSession}
          />

          {/* Action buttons */}
          <div className="flex gap-2">
            {activeSession ? (
              <button
                type="button"
                onClick={onEndSession}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-destructive/20 hover:bg-destructive/30 text-destructive rounded-md text-sm font-medium transition-colors"
              >
                <Square size={14} />
                Stop Session
              </button>
            ) : (
              <button
                type="submit"
                disabled={!note.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-success/20 hover:bg-success/30 text-success rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={14} />
                Start Session
              </button>
            )}
          </div>
        </form>

        {/* Active session indicator */}
        {activeSession && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground truncate">
              Working on:{" "}
              <span className="text-foreground">{activeSession.note}</span>
            </p>
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="border border-border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-3">
          <History size={14} className="text-muted-foreground" />
          <h3 className="text-xs text-muted-foreground">Recent Sessions</h3>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 animate-pulse">
                <div className="h-3 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : recentSessions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            No sessions today
          </p>
        ) : (
          <div className="space-y-2">
            {recentSessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-foreground truncate flex-1 mr-2">
                  {session.note || "Untitled session"}
                </span>
                <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                  <span>{formatTime(session.startedAt)}</span>
                  <span>-</span>
                  <span>
                    {session.durationMs
                      ? formatDuration(session.durationMs)
                      : "In progress"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
