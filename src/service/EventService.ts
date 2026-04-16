import { Category, EventStatus, IEvent, UpdateEventParams } from "../model/event";
import { IRSVP, RSVPStatus } from "../model/rsvp";
import { IEventRepository } from "../repository/EventRepository";
import { IRSVPRepository } from "../repository/RSVPRepository";
import { Ok, Err, type Result } from "../lib/result";

export interface IEventService {
    createEvent(title: string, description: string, location: string, category: Category, status: EventStatus, capacity: number, startDatetime: Date, endDatetime: Date, organizerId: string): Result<void,string>;
    getEventById(eventId: number): Result<IEvent,string>;
    getAllEvents(): Result<IEvent[],string>;
    updateEvent(eventId: number, title?: string, description?: string, location?: string, category?: Category, status?: EventStatus, capacity?: number | null, startDatetime?: Date, endDatetime?: Date): Result<void,string>;
    deleteEvent(eventId: number): Result<void,string>;
    createRSVP(eventId: number, userId: string, status?: RSVPStatus): Result<void,string>;
    toggleRSVP(eventId: number, userId: string): Result<string, string>;    
    getRSVPsForEvent(eventId: number): Result<IRSVP[],string>;
    updateRSVP(eventId: number, userId: string, status: RSVPStatus): Result<void,string>;
    deleteRSVP(eventId: number): Result<void,string>;
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

    createRSVP(eventId: number, userId: string, status?: RSVPStatus) {
        try {
            const finalStatus: RSVPStatus = status ?? "pending";

            this.rsvpRepository.create(eventId, userId, finalStatus);

            return Ok(undefined);
        } catch (error) {
            return Err(error instanceof Error ? error.message : "Unable to create RSVP");
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

    toggleRSVP(eventId: number, userId: string): Result<string, string> {

        const event = this.eventRepository.findById(eventId);

        if (!event) {
            return Err("Event not found");
        }

        const allRSVPs = this.rsvpRepository.findByEventId(eventId);

        const existing = allRSVPs.find(r => r.userId === userId);

        if (!existing) {

            let status: RSVPStatus = "going";

            if (event.capacity !== null) {

                const goingCount = allRSVPs.filter(r => r.status === "going").length;

                if (goingCount >= event.capacity) {
                    status = "waitlisted";
                }
            }

            this.rsvpRepository.create(eventId, userId, status);

            return Ok(status);
        }

        if (existing.status === "going" || existing.status === "waitlisted") {

            this.rsvpRepository.update(existing.id, "cancelled");

            return Ok("cancelled");
        }

        if (existing.status === "cancelled") {

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