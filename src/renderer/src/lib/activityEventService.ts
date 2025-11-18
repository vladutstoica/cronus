import { BehaviorSubject } from "rxjs";
import { ActiveWindowEvent } from "@shared/types";

class ActivityEventService {
  private readonly _events = new BehaviorSubject<ActiveWindowEvent[]>([]);

  public readonly events$ = this._events.asObservable();

  public addEvent(event: ActiveWindowEvent) {
    const currentEvents = this._events.getValue();
    this._events.next([...currentEvents, event]);
  }

  public setEvents(events: ActiveWindowEvent[]) {
    this._events.next(events);
  }

  public getEvents(): ActiveWindowEvent[] {
    return this._events.getValue();
  }
}

export const activityEventService = new ActivityEventService();
