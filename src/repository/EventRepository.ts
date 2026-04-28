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
            await this.prisma.event.create({
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
            const events = await this.prisma.event.findMany({
                orderBy: { startDatetime: "asc" },
            });

            return Ok(events.map((e) => this.toEvent(e as PrismaEventRecord)));
        } catch (error) {
            return Err(DatabaseError("Failed to retrieve events"));
        }
    }

    async findFiltered(
        query: string,
        category?: Category,
        timeframe?: "this_week" | "this_weekend" | "all_upcoming"
    ): Promise<Result<IEvent[], EventError>> {
        try {
            const now = new Date();

            const events = await this.prisma.event.findMany({
                where: {
                    status: "published",
                    startDatetime: {
                        gt: now,
                    },
                },
                orderBy: {
                    startDatetime: "asc",
                },
            });

            let filtered = events.map((e) => this.toEvent(e as PrismaEventRecord));

            if (query.trim() !== "") {
                const q = query.toLowerCase();

                filtered = filtered.filter(
                    (e) =>
                        e.title.toLowerCase().includes(q) ||
                        e.description.toLowerCase().includes(q) ||
                        e.location.toLowerCase().includes(q)
                );
            }

            if (category) {
                filtered = filtered.filter((e) => e.category === category);
            }

            if (timeframe === "this_week") {
                const end = new Date(now);
                end.setDate(now.getDate() + 7);

                filtered = filtered.filter(
                    (e) => e.startDatetime >= now && e.startDatetime <= end
                );
            }

            if (timeframe === "this_weekend") {
                filtered = filtered.filter((e) => {
                    const day = e.startDatetime.getDay();
                    return day === 5 || day === 6 || day === 0;
                });
            }

            return Ok(filtered);
        } catch (error) {
            return Err(DatabaseError("Failed to retrieve events"));
        }
    }


}

export function CreateEventRepository(): IEventRepository {
    const repo = new EventRepository(prisma);
    return repo;
}