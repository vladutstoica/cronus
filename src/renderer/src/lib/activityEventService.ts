import { BehaviorSubject } from "rxjs";
import { ActiveWindowEvent } from "@shared/types";

/** Cap to prevent unbounded array growth (~8h at ~15 events/hour with generous headroom). */
const MAX_EVENTS_IN_MEMORY = 500;

class ActivityEventService {
  private readonly _events = new BehaviorSubject<ActiveWindowEvent[]>([]);

  public readonly events$ = this._events.asObservable();

  public addEvent(event: ActiveWindowEvent) {
    const currentEvents = this._events.getValue();
    currentEvents.push(event);

    // Trim oldest events if exceeding the memory cap
    if (currentEvents.length > MAX_EVENTS_IN_MEMORY) {
      const trimmed = currentEvents.slice(-MAX_EVENTS_IN_MEMORY);
      this._events.next(trimmed);
    } else {
      this._events.next(currentEvents);
    }
  }

  public setEvents(events: ActiveWindowEvent[]) {
    this._events.next(events);
  }

  public getEvents(): ActiveWindowEvent[] {
    return this._events.getValue();
  }
}

export const activityEventService = new ActivityEventService();
