import { Category, EventStatus, IEvent, UpdateEventParams } from "../model/event";
import { IRSVP, RSVPStatus } from "../model/rsvp";
import { IEventRepository } from "../repository/EventRepository";
import { IRSVPRepository } from "../repository/RSVPRepository";
import { Ok, Err, type Result } from "../lib/result";

export type EventTimeFrame = "all_upcoming" | "this_week" | "this_weekend"

export interface IEventService {
    createEvent(title: string, description: string, location: string, category: Category, status: EventStatus, capacity: number | null, startDatetime: Date, endDatetime: Date, organizerId: string): Promise<Result<undefined,string>>;
    getEventById(eventId: number): Promise<Result<IEvent,string>>;
    getAllEvents(): Promise<Result<IEvent[],string>>;
    updateEvent(eventId: number, title?: string, description?: string, location?: string, category?: Category, status?: EventStatus, capacity?: number | null, startDatetime?: Date, endDatetime?: Date): Promise<Result<undefined,string>>;
    deleteEvent(eventId: number): Promise<Result<undefined,string>>;
    createRSVP(eventId: number, userId: string, status: RSVPStatus): Promise<Result<undefined,string>>;
    toggleRSVP(eventId: number, userId: string): Promise<Result<undefined, string>>;    
    getRSVPsForEvent(eventId: number): Promise<Result<IRSVP[],string>>;
    updateRSVP(eventId: number, userId: string, status: RSVPStatus): Promise<Result<undefined,string>>;
    deleteRSVP(eventId: number): Promise<Result<undefined,string>>;
    getUserDashboard(userId: string): Promise<Result<{ upcoming: any[]; past: any[] }, string>>;
    getVisibleEventById(eventId: number, userId: string, role: string): Promise<Result<IEvent, string>>;
    publishEvent(eventId: number, userId: string, role: string): Promise<Result<undefined, string>>;
    cancelEvent(eventId: number, userId: string, role: string): Promise<Result<undefined, string>>;
    searchEvents(query: string): Promise<Result<IEvent[], string>>;
}

class EventService implements IEventService {
    constructor(private readonly eventRepository: IEventRepository, private readonly rsvpRepository: IRSVPRepository) {}

    async createEvent(title: string, description: string, location: string, category: Category, status = 'draft' as EventStatus, capacity: number, startDatetime: Date, endDatetime: Date, organizerId: string) {
        return await this.eventRepository.create(title, description, location, category, status, capacity, startDatetime, endDatetime, organizerId);
  
    }

    async getEventById(eventId: number) {
        return await this.eventRepository.findById(eventId);
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

    // handles RSVP behavior (new RSVP, cancel existing RSVP, and reactivate cancelled RSVP)
    async toggleRSVP(eventId: number, userId: string){

        let event = await this.eventRepository.findById(eventId);
        if (!event.ok) return event;

        const allRSVPs = await this.rsvpRepository.findByEventId(eventId);
        if (!allRSVPs.ok) return allRSVPs;

        const rsvp = await this.rsvpRepository.findByIds(userId, eventId);
        
        if (!rsvp.ok) {//when we have actual errors need to check if its not found or a different error and only do this on not found and return the error otherwise

            let status: RSVPStatus = "going";
            if (event.value.capacity !== null) {
                const goingCount = allRSVPs.value.filter(r => r.status === "going").length;
                if (goingCount >= event.value.capacity) status = "waitlisted"
            }

            return await this.rsvpRepository.create(eventId, userId, status);
        }

        if (rsvp.value.status != 'cancelled') {
            return await this.rsvpRepository.update(rsvp.value.id, "cancelled");
        }

        let status: RSVPStatus = "going";

        if (event.value.capacity !== null) {

            const goingCount = allRSVPs.value.filter(r => r.status === "going").length;
            if (goingCount >= event.value.capacity) status = "waitlisted";
        }
        return await this.rsvpRepository.update(rsvp.value.id, status);

    }

    async getUserDashboard(userId: string){
        const allRSVPs = await this.rsvpRepository.findAll();
        if (!allRSVPs.ok) return allRSVPs;

        const userRSVPs = allRSVPs.value.filter(r => r.userId === userId);

        const joined =  userRSVPs.map(async rsvp => { // we might have to redo this with a promise all or a reducer to build a big promise so that the fetches happen in parallel
            const event = await this.eventRepository.findById(rsvp.eventId);
            if (!event.ok) return { rsvp, event: null };
            return { rsvp, event: event.value };
        }).filter(async item => (await item).event !== null);

        const now = new Date();

        const upcoming: any[] = [];
        const past: any[] = [];

        for (const item of joined) {
            const event = (await item).event!;

            if (
                event.status === "cancelled" ||
                event.status === "past" ||
                (await item).rsvp.status === "cancelled" ||
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

