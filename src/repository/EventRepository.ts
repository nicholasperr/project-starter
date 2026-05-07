import { PrismaClient } from "@prisma/client";
import { Ok, Result, Err } from "../lib/result";
import { IEvent, Event, UpdateEventParams, EventStatus, Category } from "../model/event";
import { EventError, EventNotFound, DatabaseError } from "../lib/errors";
import prisma from "../prisma";

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

type PrismaEventRecord = {
    id: number;
    title: string;
    description: string;
    location: string;
    category: Category;
    status: EventStatus;
    capacity: number | null;
    startDatetime: Date;
    endDatetime: Date;
    organizerId: string;
    createdAt: Date;
    updatedAt: Date;
};

class EventRepository implements IEventRepository {
    private events = [] as IEvent[]
    constructor(private readonly prisma: PrismaClient) {}

    private toEvent(record: PrismaEventRecord): IEvent {
        const event = new Event(
            record.id,
            record.title,
            record.description,
            record.location,
            record.category,
            record.status,
            record.capacity,
            record.startDatetime,
            record.endDatetime,
            record.organizerId,
        );
        event.createdAt = record.createdAt;
        event.updatedAt = record.updatedAt;
        return event;
    }

    async create(
        title: string,
        description: string,
        location: string,
        category: Category,
        status = 'draft' as EventStatus,
        capacity: number | null = null,
        startDatetime: Date,
        endDatetime: Date,
        organizerId: string,
    ): Promise<Result<undefined, EventError>> {
        try {
            const event = await this.prisma.event.create({
                data: {
                    title,
                    description,
                    location,
                    category,
                    status,
                    capacity,
                    startDatetime,
                    endDatetime,
                    organizerId,
                },
            });
            return Ok(undefined);
        } catch (error) {
            console.error("Error creating event:", error);
            return Err(DatabaseError('Failed to create event'));
        }
    }

    async findById(id: number): Promise<Result<IEvent, EventError>> {
        try {
            const event = await this.prisma.event.findUnique({ where: { id } });
            if (!event) {
                return Err(EventNotFound('Event not found'));
            }
            return Ok(this.toEvent(event as PrismaEventRecord));
        } catch (error) {
            console.error("Error finding event by ID:", error);
            return Err(DatabaseError('Failed to retrieve event'));
        }
    }

    async update(id: number, params: UpdateEventParams): Promise<Result<undefined, EventError>> {
        try {
            await this.prisma.event.update({
                where: { id },
                data: params,
            });

            return Ok(undefined);
        } catch (error: any) {
            if (error?.code === "P2025") {
                return Err(EventNotFound("Event not found"));
            }

            return Err(DatabaseError("Failed to update event"));
        }
    }


    async delete(id: number): Promise<Result<undefined, EventError>> {
        try {
            await this.prisma.event.delete({
                where: { id },
            });

            return Ok(undefined);
        } catch (error: any) {
            if (error?.code === "P2025") {
                return Err(EventNotFound("Event not found"));
            }

            return Err(DatabaseError("Failed to delete event"));
        }
    }

    async findAll(): Promise<Result<IEvent[], EventError>> {
        try {
            const events = await this.prisma.event.findMany();
            return Ok(events.map(e => this.toEvent(e as PrismaEventRecord)));
        } catch (error) {
            return Err(DatabaseError("Failed to retrieve events."));
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

            const events = await this.prisma.event.findMany({ where });
            return Ok(events.map(e => this.toEvent(e as PrismaEventRecord)));
        } catch (error) {
            return Err(DatabaseError("Failed to filter events."));
        }
    }
}

export function CreateEventRepository(): IEventRepository {
    const repo = new EventRepository(prisma);
    return repo;
}