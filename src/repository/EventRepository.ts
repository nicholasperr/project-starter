import { IEvent, Event, UpdateEventParams, EventStatus, Category } from "../model/event";

export interface IEventRepository {
    create(
        title: string, 
        description: string, 
        location: string, 
        category: Category,
        status: EventStatus, 
        capacity: number, 
        startDatetime: Date, 
        endDatetime: Date, 
        organizerId: string): void;
    findById(id: number): IEvent | null;
    update(id: number, params: UpdateEventParams): IEvent;
    delete(id: number): void;
    findAll(): IEvent[];
}

class EventRepository implements IEventRepository {
    private events: IEvent[] = [
    new Event(
        1,
        "Campus Concert",
        "A live music event for students.",
        "Student Union",
        "music",
        "published",
        50,
        new Date("2026-04-20T18:00:00"),
        new Date("2026-04-20T21:00:00"),
        "user-staff"
    ),
    new Event(
        2,
        "Draft Planning Meeting",
        "Internal planning event not yet published.",
        "Library Room 101",
        "academic",
        "draft",
        20,
        new Date("2026-04-25T12:00:00"),
        new Date("2026-04-25T13:30:00"),
        "user-staff"
    )
    ];
    private nextId: number = 3;

    create( title: string, description: string, location: string, category: Category, status = 'draft' as EventStatus, capacity: number | null = null , startDatetime: Date, endDatetime: Date, organizerId: string): void {
        const event = new Event(this.nextId++, title, description, location, category, status, capacity, startDatetime, endDatetime, organizerId);
        this.events.push(event);
    }
    findById(id: number): IEvent | null {
        return this.events.find(e => e.id === id) || null;
    }
    update(id: number, params: UpdateEventParams): IEvent {
        const event = this.events.find(e => e.id === id);
        if (event === undefined) {
            throw new Error('Event not found');
        }
        event.updateEvent(params);
        return event;
    }
    delete(id: number): void {
        this.events = this.events.filter(e => e.id !== id);
    }
    findAll(): IEvent[] {
        return this.events;
    }
}

export function CreateEventRepository(): IEventRepository {
    return new EventRepository();
}