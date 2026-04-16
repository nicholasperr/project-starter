import { Category, EventStatus, IEvent } from "../model/event";
import { IRSVP, RSVPStatus } from "../model/rsvp";
import { IEventRepository } from "../repository/EventRepository";
import { IRSVPRepository } from "../repository/RSVPRepository";
import { Ok, Err, type Result } from "../lib/result";

export interface IEventService {
    createEvent( title: string, description: string, location: string, category: Category, status: EventStatus, capacity: number, startDatetime: Date, endDatetime: Date, organizerId: number): void;
    getEventById(eventId: number): IEvent | null;
    getAllEvents(): IEvent[] | null;
    updateEvent(eventId: number, title?: string, description?: string, location?: string, category?: Category, status?: EventStatus, capacity?: number, startDatetime?: Date, endDatetime?: Date): void;
    deleteEvent(eventId: number): void;
    createRSVP(eventId: number, userId: number, status: RSVPStatus): void;
    getRSVPsForEvent(eventId: number): IRSVP[];
    updateRSVP(eventId: number, userId: string, status: RSVPStatus): void;
    deleteRSVP(eventId: number, userId: string): void;
    toggleRSVP(eventId: number, userId: number): Result<string, string>;
}

class EventService implements IEventService {

    constructor(private readonly eventRepository: IEventRepository, private readonly rsvpRepository: IRSVPRepository) {
    }
    createEvent( title: string, description: string, location: string, category: Category, status = 'draft' as EventStatus, capacity: number, startDatetime: Date, endDatetime: Date, organizerId: number) {
        this.eventRepository.create(title, description, location, category, status, capacity, startDatetime, endDatetime, organizerId)
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
    createRSVP(eventId: number, userId: number, status: RSVPStatus) {
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

    // handles RSVP behavior ()
    // covers: new RSVP, cancel existing, and reactivating cancelled
    toggleRSVP(eventId: number, userId: number): Result<string, string> {

        // first get the event to make sure it exists
        const event = this.eventRepository.findById(eventId);

        if (!event) {
            // if event doesn't exist, return an error
            return Err("Event not found");
        }

        // get all RSVPs for this event
        const allRSVPs = this.rsvpRepository.findByEventId(eventId);

        // check if this user already has an RSVP
        const existing = allRSVPs.find(r => r.userId === userId);

        // CASE 1: user has no RSVP yet → create one
        if (!existing) {

            // default to going
            let status: RSVPStatus = "going";

            // if event has a capacity, check if it's full
            if (event.capacity !== null) {

                // count how many people are currently going
                const goingCount = allRSVPs.filter(r => r.status === "going").length;

                // if full, put user on waitlist instead
                if (goingCount >= event.capacity) {
                    status = "waitlisted";
                }
            }

            // create the RSVP with the correct status
            this.rsvpRepository.create(eventId, userId, status);

            return Ok(status);
        }

        // CASE 2: user is already going or waitlisted → cancel it
        if (existing.status === "going" || existing.status === "waitlisted") {

            // update status to cancelled
            this.rsvpRepository.update(existing.id, "cancelled");

            return Ok("cancelled");
        }

        // CASE 3: RSVP is cancelled → reactivate it
        if (existing.status === "cancelled") {

            // default to going again
            let status: RSVPStatus = "going";

            // check capacity again before reactivating
            if (event.capacity !== null) {

                const goingCount = allRSVPs.filter(r => r.status === "going").length;

                // if full, user goes back to waitlist
                if (goingCount >= event.capacity) {
                    status = "waitlisted";
                }
            }

            // update the existing RSVP with the new status
            this.rsvpRepository.update(existing.id, status);

            return Ok(status);
        }

        // fallback (should not really happen)
        return Err("Invalid state");
    }

}

export const CreateEventService = (eventRepository: IEventRepository, rsvpRepository : IRSVPRepository): IEventService => {
    return new EventService(eventRepository, rsvpRepository);
}
