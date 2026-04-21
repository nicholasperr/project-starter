import { Category, EventStatus, IEvent, UpdateEventParams } from "../model/event";
import { IRSVP, RSVPStatus } from "../model/rsvp";
import { IEventRepository } from "../repository/EventRepository";
import { IRSVPRepository } from "../repository/RSVPRepository";
import { Ok, Err, type Result } from "../lib/result";
import { DashboardAccessError, DashboardDataError, EventClosedError, type EventError } from "./errors";

export type EventTimeFrame = "all_upcoming" | "this_week" | "this_weekend"

export interface IEventService {
    createEvent(title: string, description: string, location: string, category: Category, status: EventStatus, capacity: number | null, startDatetime: Date, endDatetime: Date, organizerId: string): Promise<Result<undefined,string>>;
    getEventById(eventId: number): Promise<Result<IEvent,string>>;
    getAllEvents(): Promise<Result<IEvent[],string>>;
    updateEvent(eventId: number, title?: string, description?: string, location?: string, category?: Category, status?: EventStatus, capacity?: number | null, startDatetime?: Date, endDatetime?: Date): Promise<Result<undefined,string>>;
    deleteEvent(eventId: number): Promise<Result<undefined,string>>;
    createRSVP(eventId: number, userId: string, status: RSVPStatus): Promise<Result<undefined,string>>;
    toggleRSVP(eventId: number, userId: string): Promise<Result<undefined, { name: string; message: string }>>  
    getRSVPsForEvent(eventId: number): Promise<Result<IRSVP[],string>>;
    updateRSVP(eventId: number, userId: string, status: RSVPStatus): Promise<Result<undefined,string>>;
    deleteRSVP(eventId: number): Promise<Result<undefined,string>>;
    getUserDashboard(userId: string, role: string): Promise<Result<{ upcoming: {rsvp: IRSVP, event: IEvent}[]; past: {rsvp: IRSVP, event: IEvent}[] }, EventError>>;
    getVisibleEventById(eventId: number, userId: string, role: string): Promise<Result<IEvent, string>>;
    publishEvent(eventId: number, userId: string, role: string): Promise<Result<undefined, string>>;
    cancelEvent(eventId: number, userId: string, role: string): Promise<Result<undefined, string>>;
    searchEvents(query: string, category?: Category, timeframe?: EventTimeFrame): Promise<Result<IEvent[], string>>;
}

class EventService implements IEventService {
    constructor(private readonly eventRepository: IEventRepository, private readonly rsvpRepository: IRSVPRepository) {}

    async createEvent(title: string, description: string, location: string, category: Category, status = 'draft' as EventStatus, capacity: number, startDatetime: Date, endDatetime: Date, organizerId: string) {
        return await this.eventRepository.create(title, description, location, category, status, capacity, startDatetime, endDatetime, organizerId);
    }

    async getEventById(eventId: number) {
       return await this.eventRepository.findById(eventId)
    }

    async getAllEvents() {
       return await this.eventRepository.findAll();
    }

    async updateEvent(eventId: number, title?: string, description?: string, location?: string, category?: Category, status?: EventStatus, capacity?: number | null, startDatetime?: Date, endDatetime?: Date) {
       const params: UpdateEventParams = { title, description, location, category, status, capacity, startDatetime, endDatetime };
       return await this.eventRepository.update(eventId, params);
    }

    async deleteEvent(eventId: number) {
       return await this.eventRepository.delete(eventId);
    }

    async createRSVP(eventId: number, userId: string, status: RSVPStatus) {
       return await this.rsvpRepository.create(eventId, userId, status);
    }
  
    async getRSVPsForEvent(eventId: number) {
       return await this.rsvpRepository.findByEventId(eventId)
    }

    async updateRSVP(eventId: number, userId: string, status: RSVPStatus) {
       return await this.rsvpRepository.update(eventId, status);
    }
 
    async deleteRSVP(eventId: number) {
       return await this.rsvpRepository.delete(eventId);
    }

    async getVisibleEventById(eventId: number, userId: string, role: string) {
        const event = await this.eventRepository.findById(eventId);

        if (!event.ok) {
           return event;
        }
        const canViewDraft = role === "admin" || event.value.organizerId === userId;

        if (!canViewDraft && event.value.status === 'draft') {
            return Err("No Permission to view this event");
        }

        return event;
    }   

    async publishEvent(eventId: number, userId: string, role: string) {
        const event = await this.eventRepository.findById(eventId);

        if (!event.ok) return Err("Event not found");
        if (event.value.status !== "draft") return Err("Only draft events can be published");

        const isOwner = event.value.organizerId === userId;
        const isAdmin = role === "admin";
 
        if (!isOwner && !isAdmin) return Err("You are not allowed to publish this event");

        return await this.eventRepository.update(eventId, {status: "published"});
   }

   async cancelEvent(eventId: number, userId: string, role: string) {
       const event = await this.eventRepository.findById(eventId);

       if (!event.ok) return Err("Event not found");
       if (event.value.status !== "published") return Err("Only published events can be cancelled");

       const isOwner = event.value.organizerId === userId;
       const isAdmin = role === "admin";

       if (!isOwner && !isAdmin) return Err("You are not allowed to cancel this event");

       return await this.eventRepository.update(eventId, {status: "cancelled"});
   }

    async searchEvents(query: string, category?: Category, timeframe?: EventTimeFrame){
        return await this.eventRepository.findFiltered(query, category, timeframe);
   }

    async toggleRSVP(eventId: number, userId: string): Promise<Result<undefined, { name: string; message: string }>> {
        const eventResult = await this.eventRepository.findById(eventId);
        if (eventResult.ok === false) {
            return Err({
                name: "EventNotFoundError",
                message: eventResult.value,
            });
        }

        const event = eventResult.value;

        if (event.status === "cancelled") {
            return Err(EventClosedError("This event has been cancelled"));
        }

        if (event.status === "past") {
            return Err(EventClosedError("This event has already ended"));
        }
        
        const now = new Date();
        if (event.startDatetime < now) {
            return Err(EventClosedError("Event already started"));
        }

        const allRSVPs = await this.rsvpRepository.findByEventId(eventId);
        const goingCount = allRSVPs.ok
            ? allRSVPs.value.filter((r) => r.status === "going").length
            : 0;

        const rsvp = await this.rsvpRepository.findByIds(userId, eventId);

        if (!rsvp.ok) {
            let status: RSVPStatus = "going";
            if (event.capacity !== null) {
                if (goingCount >= event.capacity) status = "waitlisted";
            }

            const createResult = await this.rsvpRepository.create(eventId, userId, status);
            if (!createResult.ok) {
                return Err({
                    name: "RSVPRepositoryError",
                    message: createResult.value,
                });
            }

            return Ok(undefined);
        }

        if (rsvp.value.status != "cancelled") {
            const updateResult = await this.rsvpRepository.update(rsvp.value.id, "cancelled");
            if (!updateResult.ok) {
                return Err({
                    name: "RSVPRepositoryError",
                    message: updateResult.value,
                });
            }

            return Ok(undefined);
        }

        let status: RSVPStatus = "going";

        if (event.capacity !== null) {
            if (goingCount >= event.capacity) status = "waitlisted";
        }

        const reactivateResult = await this.rsvpRepository.update(rsvp.value.id, status);
        if (!reactivateResult.ok) {
            return Err({
                name: "RSVPRepositoryError",
                message: reactivateResult.value,
            });
        }

        return Ok(undefined);
        }

    async getUserDashboard(userId: string, role: string): Promise<Result<{ upcoming: { rsvp: IRSVP, event: IEvent }[]; past: { rsvp: IRSVP, event: IEvent }[] }, EventError>> {
        if (role !== "user") {
            return Err(DashboardAccessError("Dashboard only available to members"));
        }

        const allRSVPs = await this.rsvpRepository.findAll();
        if (!allRSVPs.ok) {
            return Err(DashboardDataError(allRSVPs.value));
        }

        const userRSVPs = allRSVPs.value.filter((r) => r.userId === userId);

        const joined = await Promise.all(
            userRSVPs.map(async (rsvp) => {
                const event = await this.eventRepository.findById(rsvp.eventId);
                if (!event.ok) return { rsvp, event: null };
                return { rsvp, event: event.value };
            })
        );

        const filtered = joined.filter((v) => v.event != null) as { rsvp: IRSVP, event: IEvent }[];

        const now = new Date();

        const upcoming: { rsvp: IRSVP, event: IEvent }[] = [];
        const past: { rsvp: IRSVP, event: IEvent }[] = [];

        for (const item of filtered) {
            const event = item.event;

            if (
                event.status === "cancelled" ||
                event.status === "past" ||
                item.rsvp.status === "cancelled" ||
                event.startDatetime < now
            ) {
                past.push(item);
            } else {
                upcoming.push(item);
            }
        }

        upcoming.sort((a, b) =>
            a.event.startDatetime.getTime() - b.event.startDatetime.getTime()
        );

        past.sort((a, b) =>
            b.event.startDatetime.getTime() - a.event.startDatetime.getTime()
        );

        return Ok({ upcoming, past });
    }
}

export const CreateEventService = (
   eventRepository: IEventRepository,
   rsvpRepository: IRSVPRepository
): IEventService => {
   return new EventService(eventRepository, rsvpRepository);
};