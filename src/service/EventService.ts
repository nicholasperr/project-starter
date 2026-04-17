import { Category, EventStatus, IEvent, UpdateEventParams } from "../model/event";
import { IRSVP, RSVPStatus } from "../model/rsvp";
import { IEventRepository } from "../repository/EventRepository";
import { IRSVPRepository } from "../repository/RSVPRepository";
import { Ok, Err, type Result } from "../lib/result";
import { EventError } from "./errors";

export type EventTimeFrame = "all_upcoming" | "this_week" | "this_weekend"

export interface IEventService {
    createEvent(title: string, description: string, location: string, category: Category, status: EventStatus, capacity: number | null, startDatetime: Date, endDatetime: Date, organizerId: string): Result<void,string>;
    getEventById(eventId: number): Result<IEvent,string>;
    getAllEvents(): Result<IEvent[],string>;
    updateEvent(eventId: number, title?: string, description?: string, location?: string, category?: Category, status?: EventStatus, capacity?: number | null, startDatetime?: Date, endDatetime?: Date): Result<void,string>;
    deleteEvent(eventId: number): Result<void,string>;
    createRSVP(eventId: number, userId: string, status?: RSVPStatus): Result<void,string>;
    toggleRSVP(eventId: number, userId: string): Result<string, string>;    
    getRSVPsForEvent(eventId: number): Result<IRSVP[],string>;
    updateRSVP(eventId: number, userId: string, status: RSVPStatus): Result<void,string>;
    deleteRSVP(eventId: number): Result<void,string>;

    searchEvents(query: string): Result<IEvent[], EventError>;
    getFilteredEvents(category?: Category, timeframe?: EventTimeFrame): Result<IEvent[], EventError>;

    getVisibleEventById(eventId: number, userId: string, role: string): Result<IEvent, string>;
    publishEvent(eventId: number, userId: string, role: string): Result<IEvent, string>;
    cancelEvent(eventId: number, userId: string, role: string): Result<IEvent, string>;
}

class EventService implements IEventService {
    constructor(private readonly eventRepository: IEventRepository, private readonly rsvpRepository: IRSVPRepository) {}

    createEvent(title: string, description: string, location: string, category: Category, status = 'draft' as EventStatus, capacity: number, startDatetime: Date, endDatetime: Date, organizerId: string) {
        try {
            this.eventRepository.create(title, description, location, category, status, capacity, startDatetime, endDatetime, organizerId);
            return Ok(undefined);
        } catch (error) {
            return Err(error instanceof Error ? error.message : 'Unable to create event');
        }
    }

    getEventById(eventId: number) {
        const event = this.eventRepository.findById(eventId);
        if (!event) {
            return Err('Event not found');
        }
        return Ok(event);
    }

    getAllEvents() {
        try {
            return Ok(this.eventRepository.findAll());
        } catch (error) {
            return Err(error instanceof Error ? error.message : 'Unable to retrieve events');
        }
    }

    updateEvent(eventId: number, title?: string, description?: string, location?: string, category?: Category, status?: EventStatus, capacity?: number | null, startDatetime?: Date, endDatetime?: Date) {
        const params: UpdateEventParams = { title, description, location, category, status, capacity, startDatetime, endDatetime };
        try {
            this.eventRepository.update(eventId, params);
            return Ok(undefined);
        } catch (error) {
            return Err(error instanceof Error ? error.message : 'Unable to update event');
        }
    }

    deleteEvent(eventId: number) {
        try {
            this.eventRepository.delete(eventId);
            return Ok(undefined);
        } catch (error) {
            return Err(error instanceof Error ? error.message : 'Unable to delete event');
        }
    }

    createRSVP(eventId: number, userId: string, status: RSVPStatus) {
        try {
            this.rsvpRepository.create(eventId, userId, status);
            return Ok(undefined);
        } catch (error) {
            return Err(error instanceof Error ? error.message : 'Unable to create RSVP');
        }
    }
    
    getRSVPsForEvent(eventId: number) {
        try {
            return Ok(this.rsvpRepository.findByEventId(eventId));
        } catch (error) {
            return Err(error instanceof Error ? error.message : 'Unable to retrieve RSVPs');
        }
    }

    updateRSVP(eventId: number, userId: string, status: RSVPStatus) {
        try {
            this.rsvpRepository.update(eventId, status);
            return Ok(undefined);
        } catch (error) {
            return Err(error instanceof Error ? error.message : 'Unable to update RSVP');
        }
    }

    deleteRSVP(eventId: number) {
        try {
            this.rsvpRepository.delete(eventId);
            return Ok(undefined);
        } catch (error) {
            return Err(error instanceof Error ? error.message : 'Unable to delete RSVP');
        }
    }
    getVisibleEventById(eventId: number, userId: string, role: string): Result<IEvent, string> {
        const event = this.eventRepository.findById(eventId);

        if (!event) {
            return Err("Event not found");
        }

        if (event.status === "published" || event.status === "cancelled" || event.status === "past") {
            return Ok(event);
        }

        const canViewDraft = role === "admin" || event.organizerId === userId;

        if (!canViewDraft) {
            return Err("Event not found");
        }

        return Ok(event);
    }


    
    publishEvent(eventId: number, userId: string, role: string): Result<IEvent, string> {
        const event = this.eventRepository.findById(eventId);

        if (!event) {
            return Err("Event not found");
        }

        const isOwner = event.organizerId === userId;
        const isAdmin = role === "admin";

        if (!isOwner && !isAdmin) {
            return Err("You are not allowed to publish this event");
        }

        if (event.status !== "draft") {
            return Err("Only draft events can be published");
        }

        const updated = this.eventRepository.update(eventId, {
            status: "published",
        });

        return Ok(updated);
    }

    cancelEvent(eventId: number, userId: string, role: string): Result<IEvent, string> {
        const event = this.eventRepository.findById(eventId);

        if (!event) {
            return Err("Event not found");
        }

        const isOwner = event.organizerId === userId;
        const isAdmin = role === "admin";

        if (!isOwner && !isAdmin) {
            return Err("You are not allowed to cancel this event");
        }

        if (event.status !== "published") {
            return Err("Only published events can be cancelled");
        }

        const updated = this.eventRepository.update(eventId, {
            status: "cancelled",
        });

        return Ok(updated);
    }

    searchEvents(query: string): Result<IEvent[], EventError> {

        const today = new Date();
        let events = this.eventRepository.findAll().filter(e => e.status === "published").filter(e => e.startDatetime > today);

        if (query === "") {
            return Ok(events);
        }

        else {
            events = events.filter(e => e.title.toLowerCase().includes(query.toLowerCase()) || e.description.toLowerCase().includes(query.toLowerCase()) || e.location.toLowerCase().includes(query.toLowerCase()))
            return Ok(events);
        }
    }

    getFilteredEvents(category?: Category, timeframe?: EventTimeFrame): Result<IEvent[], EventError> {
        let events = this.eventRepository.findAll().filter(e => e.status === "published");
        
        if (category) { events = events.filter(e => e.categrory === category) }
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
    toggleRSVP(eventId: number, userId: string): Result<string, string> {

        // make sure event exists first
        const event = this.eventRepository.findById(eventId);

        if (!event) {
            return Err("Event not found");
        }

        // get all RSVPs for this event
        const allRSVPs = this.rsvpRepository.findByEventId(eventId);

        // check if this user already has one
        const existing = allRSVPs.find(r => r.userId === userId);

        // #1: no RSVP yet → create one
        if (!existing) {

            // default is going
            let status: RSVPStatus = "going";

            // if event has a set capacity, check if it's full
            if (event.capacity !== null) {

                const goingCount = allRSVPs.filter(r => r.status === "going").length;

                if (goingCount >= event.capacity) {
                    status = "waitlisted";
                }
            }

            this.rsvpRepository.create(eventId, userId, status);

            return Ok(status);
        }

        // #2: RSVP already active, cancel
        if (existing.status === "going" || existing.status === "waitlisted") {

            this.rsvpRepository.update(existing.id, "cancelled");

            return Ok("cancelled");
        }

        // #3: RSVP cancelled, reactivate
        if (existing.status === "cancelled") {

            // default is going again
            let status: RSVPStatus = "going";

            if (event.capacity !== null) {

                const goingCount = allRSVPs.filter(r => r.status === "going").length;

                if (goingCount >= event.capacity) {
                    status = "waitlisted";
                }
            }

            this.rsvpRepository.update(existing.id, status);

            return Ok(status);
        }

        return Err("Invalid state");
    }
}

export const CreateEventService = (
    eventRepository: IEventRepository,
    rsvpRepository: IRSVPRepository
): IEventService => {
    return new EventService(eventRepository, rsvpRepository);
};

