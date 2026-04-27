import { PrismaClient } from "@prisma/client";
import { Err, Ok, Result } from "../lib/result";
import { IEvent, Event, Category, EventStatus } from "../model/event";
import { IRSVP, RSVP, RSVPStatus } from "../model/rsvp";
import { DatabaseError, EventError, EventNotFound } from "../lib/errors";
import prisma from "../prisma";

export type DashboardRSVPItem = {
    rsvp: IRSVP;
    event: IEvent;
};

export interface IRSVPRepository {
    create(eventId: number, userId: string, status: string): Promise<Result<undefined, EventError>>;
    findByIds(userId: string, eventId: number): Promise<Result<IRSVP, EventError>>;
    findByEventId(eventId: number): Promise<Result<IRSVP[], EventError>>;
    findByUserIdWithEvents(userId: string): Promise<Result<DashboardRSVPItem[], EventError>>;
    update(id: number, status: string): Promise<Result<undefined, EventError>>;
    delete(id: number): Promise<Result<undefined, EventError>>;
    findAll(): Promise<Result<IRSVP[], EventError>>;
}

type PrismaRSVPRecord = {
    id: number;
    eventId: number;
    userId: string;
    status: string;
    createdAt: Date;
};

type PrismaEventRecord = {
    id: number;
    title: string;
    description: string;
    location: string;
    category: string;
    status: string;
    capacity: number | null;
    startDatetime: Date;
    endDatetime: Date;
    organizerId: string;
    createdAt: Date;
    updatedAt: Date;
};

class RSVPRepository implements IRSVPRepository {
    constructor(private readonly prisma: PrismaClient) {}

    private toRSVP(record: PrismaRSVPRecord): IRSVP {
        const rsvp = new RSVP(
            record.id,
            record.eventId,
            record.userId,
            record.status as RSVPStatus,
        );

        rsvp.createdAt = record.createdAt;
        return rsvp;
    }

    private toEvent(record: PrismaEventRecord): IEvent {
        const event = new Event(
            record.id,
            record.title,
            record.description,
            record.location,
            record.category as Category,
            record.status as EventStatus,
            record.capacity,
            record.startDatetime,
            record.endDatetime,
            record.organizerId,
        );

        event.createdAt = record.createdAt;
        event.updatedAt = record.updatedAt;
        return event;
    }

    async create(eventId: number, userId: string, status: RSVPStatus): Promise<Result<undefined, EventError>> {
        try {
            await this.prisma.rSVP.create({
                data: {
                    eventId,
                    userId,
                    status,
                },
            });

            return Ok(undefined);
        } catch (error) {
            console.error("Error creating RSVP:", error);
            return Err(DatabaseError("Failed to create RSVP"));
        }
    }

    async findByIds(userId: string, eventId: number): Promise<Result<IRSVP, EventError>> {
        try {
            const rsvp = await this.prisma.rSVP.findUnique({
                where: {
                    eventId_userId: {
                        eventId,
                        userId,
                    },
                },
            });

            if (!rsvp) {
                return Err(EventNotFound("RSVP not found"));
            }

            return Ok(this.toRSVP(rsvp));
        } catch (error) {
            console.error("Error finding RSVP:", error);
            return Err(DatabaseError("Failed to retrieve RSVP"));
        }
    }

    async findByEventId(eventId: number): Promise<Result<IRSVP[], EventError>> {
        try {
            const rsvps = await this.prisma.rSVP.findMany({
                where: {
                    eventId,
                },
                orderBy: {
                    createdAt: "asc",
                },
            });

            return Ok(rsvps.map((rsvp) => this.toRSVP(rsvp)));
        } catch (error) {
            console.error("Error finding RSVPs for event:", error);
            return Err(DatabaseError("Failed to retrieve RSVPs"));
        }
    }

    async findByUserIdWithEvents(userId: string): Promise<Result<DashboardRSVPItem[], EventError>> {
        try {
            const rsvps = await this.prisma.rSVP.findMany({
                where: {
                    userId,
                },
                include: {
                    event: true,
                },
                orderBy: {
                    createdAt: "asc",
                },
            });

            const items = rsvps.map((record) => ({
                rsvp: this.toRSVP(record),
                event: this.toEvent(record.event),
            }));

            return Ok(items);
        } catch (error) {
            console.error("Error finding dashboard RSVPs:", error);
            return Err(DatabaseError("Failed to retrieve dashboard RSVPs"));
        }
    }

    async update(id: number, status: RSVPStatus): Promise<Result<undefined, EventError>> {
        try {
            await this.prisma.rSVP.update({
                where: {
                    id,
                },
                data: {
                    status,
                },
            });

            return Ok(undefined);
        } catch (error) {
            console.error("Error updating RSVP:", error);
            return Err(DatabaseError("Failed to update RSVP"));
        }
    }

    async delete(id: number): Promise<Result<undefined, EventError>> {
        try {
            await this.prisma.rSVP.delete({
                where: {
                    id,
                },
            });

            return Ok(undefined);
        } catch (error) {
            console.error("Error deleting RSVP:", error);
            return Err(DatabaseError("Failed to delete RSVP"));
        }
    }

    async findAll(): Promise<Result<IRSVP[], EventError>> {
        try {
            const rsvps = await this.prisma.rSVP.findMany({
                orderBy: {
                    createdAt: "asc",
                },
            });

            return Ok(rsvps.map((rsvp) => this.toRSVP(rsvp)));
        } catch (error) {
            console.error("Error finding all RSVPs:", error);
            return Err(DatabaseError("Failed to retrieve RSVPs"));
        }
    }
}

export function CreateRSVPRepository(): IRSVPRepository {
    return new RSVPRepository(prisma);
}