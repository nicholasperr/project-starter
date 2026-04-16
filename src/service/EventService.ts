import { Category, EventStatus, IEvent } from "../model/event";
import { IRSVP, RSVPStatus } from "../model/rsvp";
import { IEventRepository } from "../repository/EventRepository";
import { IRSVPRepository } from "../repository/RSVPRepository";
import { Ok, Err, type Result } from "../lib/result";

export interface IEventService {
    createEvent(title: string, description: string, location: string, category: Category, status: EventStatus, capacity: number, startDatetime: Date, endDatetime: Date, organizerId: number): void;
    getEventById(eventId: number): IEvent | null;
    getAllEvents(): IEvent[] | null;
    updateEvent(eventId: number, title?: string, description?: string, location?: string, category?: Category, status?: EventStatus, capacity?: number, startDatetime?: Date, endDatetime?: Date): void;
    deleteEvent(eventId: number): void;
    createRSVP(eventId: number, userId: string, status: RSVPStatus): void;
    toggleRSVP(eventId: number, userId: string): Result<string, string>;    
    getRSVPsForEvent(eventId: number): IRSVP[];
    updateRSVP(eventId: number, userId: string, status: RSVPStatus): void;
    deleteRSVP(eventId: number): void;
}

class EventService implements IEventService {

    constructor(
        private readonly eventRepository: IEventRepository,
        private readonly rsvpRepository: IRSVPRepository
    ) {}

    createEvent(title: string, description: string, location: string, category: Category, status = 'draft' as EventStatus, capacity: number, startDatetime: Date, endDatetime: Date, organizerId: number) {
        this.eventRepository.create(title, description, location, category, status, capacity, startDatetime, endDatetime, organizerId);
    }

    getEventById(eventId: number) {
        return this.eventRepository.findById(eventId);
    }

    getAllEvents() {
        return this.eventRepository.findAll();
    }

    updateEvent(eventId: number, title?: string, description?: string, location?: string, category?: Category, status?: EventStatus, capacity?: number, startDatetime?: Date, endDatetime?: Date) {
        const params = { title, description, location, category, status, capacity, startDatetime, endDatetime };
        this.eventRepository.update(eventId, params);
    }

    deleteEvent(eventId: number) {
        this.eventRepository.delete(eventId);
    }

    // simple helper, just creates RSVP (no logic here)
    createRSVP(eventId: number, userId: string, status: RSVPStatus) {
        this.rsvpRepository.create(eventId, userId, status);
    }

    getRSVPsForEvent(eventId: number) {
        return this.rsvpRepository.findByEventId(eventId);
    }

    updateRSVP(eventId: number, userId: string, status: RSVPStatus) {
        this.rsvpRepository.update(eventId, status);
    }

    deleteRSVP(eventId: number) {
        this.rsvpRepository.delete(eventId);
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