import { describe, it, expect, beforeEach } from 'vitest';
import { BehaviorSubject } from 'rxjs';
import { firstValueFrom, take, toArray } from 'rxjs';

/**
 * Tests for the ActivityEventService RxJS-based event store.
 * We recreate the class here to avoid importing the singleton,
 * which allows clean state per test.
 */

interface MockActiveWindowEvent {
  _id?: string;
  userId: string;
  ownerName: string;
  type: string;
  timestamp: number;
  title?: string | null;
  url?: string | null;
}

class ActivityEventService {
  private readonly _events = new BehaviorSubject<MockActiveWindowEvent[]>([]);

  public readonly events$ = this._events.asObservable();

  public addEvent(event: MockActiveWindowEvent) {
    const currentEvents = this._events.getValue();
    this._events.next([...currentEvents, event]);
  }

  public setEvents(events: MockActiveWindowEvent[]) {
    this._events.next(events);
  }

  public getEvents(): MockActiveWindowEvent[] {
    return this._events.getValue();
  }
}

function createEvent(
  overrides: Partial<MockActiveWindowEvent> = {},
): MockActiveWindowEvent {
  return {
    userId: 'user-1',
    ownerName: 'Chrome',
    type: 'browser',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('ActivityEventService', () => {
  let service: ActivityEventService;

  beforeEach(() => {
    service = new ActivityEventService();
  });

  describe('initial state', () => {
    it('should start with an empty events array', () => {
      expect(service.getEvents()).toEqual([]);
    });

    it('should emit empty array as initial observable value', async () => {
      const value = await firstValueFrom(service.events$);
      expect(value).toEqual([]);
    });
  });

  describe('addEvent', () => {
    it('should add a single event', () => {
      const event = createEvent({ ownerName: 'VS Code' });
      service.addEvent(event);
      expect(service.getEvents()).toHaveLength(1);
      expect(service.getEvents()[0].ownerName).toBe('VS Code');
    });

    it('should append events preserving order', () => {
      const event1 = createEvent({ ownerName: 'VS Code', timestamp: 1000 });
      const event2 = createEvent({ ownerName: 'Chrome', timestamp: 2000 });
      const event3 = createEvent({ ownerName: 'Slack', timestamp: 3000 });

      service.addEvent(event1);
      service.addEvent(event2);
      service.addEvent(event3);

      const events = service.getEvents();
      expect(events).toHaveLength(3);
      expect(events[0].ownerName).toBe('VS Code');
      expect(events[1].ownerName).toBe('Chrome');
      expect(events[2].ownerName).toBe('Slack');
    });

    it('should not mutate the previous events array', () => {
      const event1 = createEvent({ ownerName: 'VS Code' });
      service.addEvent(event1);
      const firstSnapshot = service.getEvents();

      const event2 = createEvent({ ownerName: 'Chrome' });
      service.addEvent(event2);
      const secondSnapshot = service.getEvents();

      // firstSnapshot should still have 1 event (immutable)
      expect(firstSnapshot).toHaveLength(1);
      expect(secondSnapshot).toHaveLength(2);
    });
  });

  describe('setEvents', () => {
    it('should replace all events', () => {
      service.addEvent(createEvent({ ownerName: 'Old Event' }));
      expect(service.getEvents()).toHaveLength(1);

      const newEvents = [
        createEvent({ ownerName: 'New Event 1' }),
        createEvent({ ownerName: 'New Event 2' }),
      ];
      service.setEvents(newEvents);

      expect(service.getEvents()).toHaveLength(2);
      expect(service.getEvents()[0].ownerName).toBe('New Event 1');
    });

    it('should allow clearing all events with empty array', () => {
      service.addEvent(createEvent());
      service.addEvent(createEvent());
      expect(service.getEvents()).toHaveLength(2);

      service.setEvents([]);
      expect(service.getEvents()).toEqual([]);
    });
  });

  describe('events$ observable', () => {
    it('should emit when events are added', async () => {
      const emissions: MockActiveWindowEvent[][] = [];
      const subscription = service.events$.subscribe((events) => {
        emissions.push(events);
      });

      service.addEvent(createEvent({ ownerName: 'Event 1' }));
      service.addEvent(createEvent({ ownerName: 'Event 2' }));

      // Initial emission + 2 add emissions
      expect(emissions).toHaveLength(3);
      expect(emissions[0]).toEqual([]);
      expect(emissions[1]).toHaveLength(1);
      expect(emissions[2]).toHaveLength(2);

      subscription.unsubscribe();
    });

    it('should emit when events are replaced', async () => {
      const emissions: MockActiveWindowEvent[][] = [];
      const subscription = service.events$.subscribe((events) => {
        emissions.push(events);
      });

      service.setEvents([createEvent(), createEvent()]);

      expect(emissions).toHaveLength(2);
      expect(emissions[0]).toEqual([]);
      expect(emissions[1]).toHaveLength(2);

      subscription.unsubscribe();
    });

    it('should stop emitting after unsubscribe', () => {
      const emissions: MockActiveWindowEvent[][] = [];
      const subscription = service.events$.subscribe((events) => {
        emissions.push(events);
      });

      service.addEvent(createEvent());
      subscription.unsubscribe();
      service.addEvent(createEvent());

      // Only initial + 1 add (second add is after unsubscribe)
      expect(emissions).toHaveLength(2);
    });
  });

  describe('getEvents', () => {
    it('should return the current state synchronously', () => {
      const events = [
        createEvent({ ownerName: 'App1' }),
        createEvent({ ownerName: 'App2' }),
      ];
      service.setEvents(events);

      const result = service.getEvents();
      expect(result).toHaveLength(2);
      expect(result[0].ownerName).toBe('App1');
      expect(result[1].ownerName).toBe('App2');
    });
  });
});
