import { Ok, Result, Err } from "../lib/result";
import { IEvent, Event, UpdateEventParams, EventStatus, Category } from "../model/event";
import { EventError, EventNotFound, InvalidInput } from "../lib/errors";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "./dev.db" });
const prisma = new PrismaClient({ adapter });

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
        const event = new Event(this.nextId++, title, description, location, category, status, capacity, startDatetime, endDatetime, organizerId);
        this.events.push(event);
        return Promise.resolve(Ok(undefined));
    }
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
        try {
            await prisma.event.delete({ where: { id } });
            return Ok(undefined);
        } catch (error) {
            return Err(InvalidInput("Failed to delete event."));
        }
    }
    async findAll(): Promise<Result<IEvent[], EventError>> {
        try {
            const events = await prisma.event.findMany();
            return Ok(events.map(e => new Event(e.id, e.title, e.description, e.location,
                e.category as Category, e.status as EventStatus, e.capacity, e.startDatetime, e.endDatetime, e.organizerId)));
            
        } catch (error) {
            return Err(InvalidInput("Failed to retrieve events."));
        }
    }
    async findFiltered(query: string, category?: Category, timeframe?: 'this_week'|'this_weekend' | 'all_upcoming'): Promise<Result<IEvent[], EventError>> {
        try {
            const now = new Date();
            const where: any = {
                status: "published",
                startDatetime: { gt: now }
            };

            if (query !== "") {
                where.OR = [
                    { title: { contains: query } },
                    { description: { contains: query } },
                    { location: { contains: query } },
                ];
            }

            if (category) { where.category = category; }

            if (timeframe === "this_week") {
                const weekEnd = new Date(now);
                weekEnd.setDate(now.getDate() + (7 - now.getDay()));
                where.startDatetime = { gte: now, lte: weekEnd };
            }

            if (timeframe === "this_weekend") {
                const friday = new Date(now);
                const sunday = new Date(now);
                friday.setDate(now.getDate() + (5 - now.getDay()));
                sunday.setDate(friday.getDate() + 2);
                where.startDatetime = { gte: friday, lte: sunday };
            }

            if (timeframe === "all_upcoming") {
                where.startDatetime = { gte: now };
            }

            const events = await prisma.event.findMany({ where });
            return Ok(events.map(e => new Event(e.id, e.title, e.description, e.location,
                e.category as Category, e.status as EventStatus, e.capacity, e.startDatetime, e.endDatetime, e.organizerId)));
        }  catch (error) {
            return Err(InvalidInput("Failed to filter events."));
        }
    }
}

export function CreateEventRepository(): IEventRepository {
    const repo = new EventRepository();

    repo.create("Campus Concert", "Live music performance on the quad featuring student bands", "Student Union Plaza", "music", "published", 50, new Date("2027-04-20T18:00:00"), new Date("2027-04-20T21:00:00"), "seed-user");
    repo.create("Spring Basketball Tournament", "Intramural 3-on-3 basketball tournament open to all students", "Recreation Center", "sports", "published", 60, new Date("2027-04-19T10:00:00"), new Date("2027-04-19T16:00:00"), "seed-user");
    repo.create("CS Research Symposium", "Undergraduate and graduate students present their research projects", "Computer Science Building", "academic", "published", null, new Date("2027-04-25T13:00:00"), new Date("2027-04-25T17:00:00"), "seed-user");
    repo.create("Club Fair", "Meet student organizations and sign up for clubs across campus", "Campus Center", "social", "published", null, new Date("2027-04-22T11:00:00"), new Date("2027-04-22T14:00:00"), "seed-user");
    repo.create("Food Truck Festival", "Dozen local food trucks on campus for a one-day outdoor festival", "Main Quad", "food", "published", null, new Date("2027-04-18T12:00:00"), new Date("2027-04-18T20:00:00"), "seed-user");

    return repo;
}