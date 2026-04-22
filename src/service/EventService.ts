import { Category, EventStatus, IEvent, UpdateEventParams } from "../model/event";
import { IRSVP, RSVPStatus } from "../model/rsvp";
import { IEventRepository } from "../repository/EventRepository";
import { IRSVPRepository } from "../repository/RSVPRepository";
import { Ok, Err, type Result } from "../lib/result";
import { EventError, EventNotFound, Unauthorized, InvalidInput, InvalidState } from "../lib/errors";

export type EventTimeFrame = "all_upcoming" | "this_week" | "this_weekend"

export interface IEventService {
    createEvent(title: string, description: string, location: string, category: Category, status: EventStatus, capacity: number | null, startDatetime: Date, endDatetime: Date, organizerId: string): Promise<Result<undefined,EventError>>;
    getEventById(eventId: number): Promise<Result<IEvent,EventError>>;
    getAllEvents(): Promise<Result<IEvent[],EventError>>;
    updateEvent(eventId: number, title?: string, description?: string, location?: string, category?: Category, status?: EventStatus, capacity?: number | null, startDatetime?: Date, endDatetime?: Date): Promise<Result<undefined,EventError>>;
    deleteEvent(eventId: number): Promise<Result<undefined,EventError>>;
    createRSVP(eventId: number, userId: string, status: RSVPStatus): Promise<Result<undefined,EventError>>;
    toggleRSVP(eventId: number, userId: string): Promise<Result<undefined, EventError>>;    
    getRSVPsForEvent(eventId: number): Promise<Result<IRSVP[],EventError>>;
    updateRSVP(eventId: number, userId: string, status: RSVPStatus): Promise<Result<undefined,EventError>>;
    deleteRSVP(eventId: number, userId: string): Promise<Result<undefined,EventError>>;
    getUserDashboard(userId: string): Promise<Result<{ upcoming: {rsvp: IRSVP, event: IEvent}[]; past: {rsvp: IRSVP, event: IEvent}[] }, EventError>>;
    getVisibleEventById(eventId: number, userId: string, role: string): Promise<Result<IEvent, EventError>>;
    publishEvent(eventId: number, userId: string, role: string): Promise<Result<undefined, EventError>>;
    cancelEvent(eventId: number, userId: string, role: string): Promise<Result<undefined, EventError>>;
    searchEvents(query: string): Promise<Result<IEvent[], EventError>>;
    getFilteredEvents(category?: Category, timeframe?: EventTimeFrame): Promise<Result<IEvent[], EventError>>;
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
            return Err(Unauthorized("No Permission to view this event"));
        }

        return event;
    }


    
    async publishEvent(eventId: number, userId: string, role: string) {
        const event = await this.eventRepository.findById(eventId);

        if (!event.ok) return Err(event.value as EventError);
        if (event.value.status !== "draft") return Err(InvalidState("Only draft events can be published"));

        const isOwner = event.value.organizerId === userId;
        const isAdmin = role === "admin";

        if (!isOwner && !isAdmin) return Err(Unauthorized("You are not allowed to publish this event"));

        return await this.eventRepository.update(eventId, {status: "published"});
    }

    async cancelEvent(eventId: number, userId: string, role: string) {
        const event = await this.eventRepository.findById(eventId);

        if (!event.ok) return Err(event.value as EventError);
        if (event.value.status !== "published") return Err(InvalidState("Only published events can be cancelled"));

        const isOwner = event.value.organizerId === userId;
        const isAdmin = role === "admin";

        if (!isOwner && !isAdmin) return Err(Unauthorized("You are not allowed to cancel this event"));

        return await this.eventRepository.update(eventId, {status: "cancelled"});
    }

    async searchEvents(query: string){
        if (query !== "" && query.trim() === "") {
            return Err(InvalidInput("Query entered cannot be only whitespace"));
        }
        
        return await this.eventRepository.findFiltered(query);
    }

    async getFilteredEvents(category?: Category, timeframe?: EventTimeFrame) {
        const results = await this.eventRepository.findAll()
        if (results.ok === false) {
            return results;
        }
        let events = results.value.filter(e => e.status === "published");
        
        const validCategories = ["music", "sports", "academic", "social", "food", "arts", "networking", "other"];
        if (category && !validCategories.includes(category)) {
            return Err(InvalidInput("Category entered is not valid."));
        }

        if (category) { events = events.filter(e => e.category === category) }
       
        const validTimeframes = ["all_upcoming", "this_week", "this_weekend"];
        if (timeframe && !validTimeframes.includes(timeframe)) {
            return Err(InvalidInput("Timeframe entered is not valid"));
        }
        
        const today = new Date();
        
        if (timeframe === "this_week") {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());

            const weekEnd = new Date(today);
            weekEnd.setDate(today.getDate() - today.getDay() + 6);

            events = events.filter(e => e.startDatetime >= weekStart && e.startDatetime <= weekEnd);
        }

        else if (timeframe === "this_weekend") {
            events = events.filter(e => [0, 5, 6].includes(e.startDatetime.getDay()));
        }

        else if (timeframe === "all_upcoming") {
            events = events.filter(e => e.startDatetime >= today)
        }

        return Ok(events)
    }

    // handles RSVP behavior (new RSVP, cancel existing RSVP, and reactivate cancelled RSVP)
    async toggleRSVP(eventId: number, userId: string): Promise<Result<undefined,EventError>> {

        let event = await this.eventRepository.findById(eventId);
        if (!event.ok) return Err(event.value as EventError);

        const allRSVPs = await this.rsvpRepository.findByEventId(eventId);
        const goingCount = allRSVPs.ok ? allRSVPs.value.filter(r => r.status === "going").length : 0; 

        const rsvp = await this.rsvpRepository.findByIds(userId, eventId);
        
        if (!rsvp.ok) {//when we have actual errors need to check if its not found or a different error and only do this on not found and return the error otherwise

            let status: RSVPStatus = "going";
            if (event.value.capacity !== null) {;
                if (goingCount >= event.value.capacity) status = "waitlisted"
            }

            return await this.rsvpRepository.create(eventId, userId, status);
        }

        if (rsvp.value.status != 'cancelled') {
            return await this.rsvpRepository.update(rsvp.value.id, "cancelled");
        }

        let status: RSVPStatus = "going";

        if (event.value.capacity !== null) {
            if (goingCount >= event.value.capacity) status = "waitlisted";
        }
        return await this.rsvpRepository.update(rsvp.value.id, status);

    }

    async getUserDashboard(userId: string){
        const allRSVPs = await this.rsvpRepository.findAll();
        if (!allRSVPs.ok) return Err(allRSVPs.value as EventError);

        const userRSVPs = allRSVPs.value.filter(r => r.userId === userId);

        let joined =  await Promise.all(userRSVPs.map(async rsvp => { 
            const event = await this.eventRepository.findById(rsvp.eventId);
            if (!event.ok) return { rsvp, event: null };
            return { rsvp, event: event.value };
        }));
        const filtered = joined.filter((v) => v.event != null) as {rsvp:IRSVP,event:IEvent}[]

        const now = new Date();

        const upcoming = [];
        const past = [];

        for (const item of filtered) {
            const event = item.event!;

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

