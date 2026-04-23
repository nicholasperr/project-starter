import { Ok, Result, Err } from "../lib/result";
import { IEvent, Event, UpdateEventParams, EventStatus, Category } from "../model/event";
import { EventError, EventNotFound } from "../lib/errors";

export interface IEventRepository {
    create(
        title: string, 
        description: string, 
        location: string, 
        category: Category,
        status: EventStatus, 
        capacity: number | null, 
        startDatetime: Date, 
        endDatetime: Date, 
        organizerId: string): Promise<Result<undefined, EventError>>;
    findById(id: number): Promise<Result<IEvent, EventError>>;
    update(id: number, params: UpdateEventParams): Promise<Result<undefined,EventError>>;
    delete(id: number): Promise<Result<undefined, EventError>>;
    findAll(): Promise<Result<IEvent[], EventError>>;
    findFiltered(query: string, category?: Category, timeframe?: 'this_week'|'this_weekend' | 'all_upcoming'): Promise<Result<IEvent[], EventError>>;
}

class EventRepository implements IEventRepository {
    private events: IEvent[] = [];
    private nextId: number = 1;

    async create( title: string, description: string, location: string, category: Category, status = 'draft' as EventStatus, capacity: number | null = null , startDatetime: Date, endDatetime: Date, organizerId: string): Promise<Result<undefined, EventError>> {
    async create( title: string, description: string, location: string, category: Category, status = 'draft' as EventStatus, capacity: number | null = null , startDatetime: Date, endDatetime: Date, organizerId: string): Promise<Result<undefined, EventError>> {
        const event = new Event(this.nextId++, title, description, location, category, status, capacity, startDatetime, endDatetime, organizerId);
        this.events.push(event);
        return Promise.resolve(Ok(undefined));
    }
    async findById(id: number): Promise<Result<IEvent, EventError>> {
    async findById(id: number): Promise<Result<IEvent, EventError>> {
        console.log(`Finding event by ID: ${id}`);
        const result = this.events.find(e => e.id === id);
        if (result === undefined) {
            return Promise.resolve(Err(EventNotFound('Event not found')));
        }
        return Promise.resolve(Ok(result));
    }
     async update(id: number, params: UpdateEventParams): Promise<Result<undefined, EventError>> {
        const event = this.events.find(e => e.id === id);
        if (event === undefined) {
            return Promise.resolve(Err(EventNotFound('Event not found')));
        }
        event.updateEvent(params);
        return Promise.resolve(Ok(undefined));
    }
    async delete(id: number): Promise<Result<undefined, EventError>> {
    async delete(id: number): Promise<Result<undefined, EventError>> {
        this.events = this.events.filter(e => e.id !== id);
        return Promise.resolve(Ok(undefined));
    }
    async findAll(): Promise<Result<IEvent[], EventError>> {
        return Promise.resolve(Ok(this.events));
    }
    async findFiltered(query: string, category?: Category, timeframe?: 'this_week'|'this_weekend' | 'all_upcoming'): Promise<Result<IEvent[], EventError>> {
    async findFiltered(query: string, category?: Category, timeframe?: 'this_week'|'this_weekend' | 'all_upcoming'): Promise<Result<IEvent[], EventError>> {
        const now = new Date();
        let filtered = this.events.filter(e => e.status === "published" && e.startDatetime > now);
        
        if (query != '') {
            const lowerQuery = query.toLowerCase();
            filtered = filtered.filter(e => e.title.toLowerCase().includes(lowerQuery) || 
                                            e.description.toLowerCase().includes(lowerQuery));
        }

        if (category) {
            filtered = filtered.filter(e => e.category === category);
        }

        if (timeframe) {
            const now = new Date();
            const endOfWeek = new Date(now);
            endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
            const endOfWeekend = new Date(endOfWeek);
            endOfWeekend.setDate(endOfWeek.getDate() + 2);

            if (timeframe === 'this_week') {
                filtered = filtered.filter(e => e.startDatetime <= endOfWeek);
            } else if (timeframe === 'this_weekend') {
                filtered = filtered.filter(e => e.startDatetime >= endOfWeek && e.startDatetime <= endOfWeekend);
            }
            // all_upcoming is already filtered
        }

        return Promise.resolve(Ok(filtered));
    }
}

export function CreateEventRepository(): IEventRepository {
    const repo = new EventRepository();

    repo.create("Campus Concert", "Live music performance on the quad featuring student bands", "Student Union Plaza", "music", "published", 200, new Date("2027-04-20T18:00:00"), new Date("2027-04-20T21:00:00"), "seed-user");
    repo.create("Spring Basketball Tournament", "Intramural 3-on-3 basketball tournament open to all students", "Recreation Center", "sports", "published", 60, new Date("2027-04-19T10:00:00"), new Date("2027-04-19T16:00:00"), "seed-user");
    repo.create("CS Research Symposium", "Undergraduate and graduate students present their research projects", "Computer Science Building", "academic", "published", null, new Date("2027-04-25T13:00:00"), new Date("2027-04-25T17:00:00"), "seed-user");
    repo.create("Club Fair", "Meet student organizations and sign up for clubs across campus", "Campus Center", "social", "published", null, new Date("2027-04-22T11:00:00"), new Date("2027-04-22T14:00:00"), "seed-user");
    repo.create("Food Truck Festival", "Dozen local food trucks on campus for a one-day outdoor festival", "Main Quad", "food", "published", null, new Date("2027-04-18T12:00:00"), new Date("2027-04-18T20:00:00"), "seed-user");

    return repo;
}