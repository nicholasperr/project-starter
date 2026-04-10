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
        organizerId: number): void;
    findById(id: number): IEvent | null;
    update(id: number, params: UpdateEventParams): IEvent;
    delete(id: number): void;
    findAll(): IEvent[];
}

class EventRepository implements IEventRepository {
    private events: IEvent[] = [];
    private nextId: number = 1;

    create( title: string, description: string, location: string, category: Category, status = 'draft' as EventStatus, capacity: number, startDatetime: Date, endDatetime: Date, organizerId: number): void {
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