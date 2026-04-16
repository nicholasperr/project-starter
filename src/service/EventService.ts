import { Category, EventStatus, IEvent, UpdateEventParams } from "../model/event";
import { IRSVP, RSVPStatus } from "../model/rsvp";
import { IEventRepository } from "../repository/EventRepository";
import { IRSVPRepository } from "../repository/RSVPRepository";

export type ServiceResult<T> =
    | { ok: true; value: T }
    | { ok: false; error: string };

const OkResult = <T>(value: T): ServiceResult<T> => ({ ok: true, value });
const ErrResult = <T>(error: string): ServiceResult<T> => ({ ok: false, error });

export interface IEventService {
    createEvent(title: string, description: string, location: string, category: Category, status: EventStatus, capacity: number, startDatetime: Date, endDatetime: Date, organizerId: number): ServiceResult<void>;
    getEventById(eventId: number): ServiceResult<IEvent>;
    getAllEvents(): ServiceResult<IEvent[]>;
    updateEvent(eventId: number, title?: string, description?: string, location?: string, category?: Category, status?: EventStatus, capacity?: number | null, startDatetime?: Date, endDatetime?: Date): ServiceResult<void>;
    deleteEvent(eventId: number): ServiceResult<void>;
    createRSVP(eventId: number, userId: number, status: RSVPStatus): ServiceResult<void>;
    getRSVPsForEvent(eventId: number): ServiceResult<IRSVP[]>;
    updateRSVP(eventId: number, userId: string, status: RSVPStatus): ServiceResult<void>;
    deleteRSVP(eventId: number): ServiceResult<void>;
}

class EventService implements IEventService {
    constructor(private readonly eventRepository: IEventRepository, private readonly rsvpRepository: IRSVPRepository) {}

    createEvent(title: string, description: string, location: string, category: Category, status = 'draft' as EventStatus, capacity: number, startDatetime: Date, endDatetime: Date, organizerId: number) {
        try {
            this.eventRepository.create(title, description, location, category, status, capacity, startDatetime, endDatetime, organizerId);
            return OkResult<void>(undefined);
        } catch (error) {
            return ErrResult<void>(error instanceof Error ? error.message : 'Unable to create event');
        }
    }

    getEventById(eventId: number) {
        const event = this.eventRepository.findById(eventId);
        if (!event) {
            return ErrResult<IEvent>('Event not found');
        }
        return OkResult(event);
    }

    getAllEvents() {
        try {
            return OkResult(this.eventRepository.findAll());
        } catch (error) {
            return ErrResult<IEvent[]>(error instanceof Error ? error.message : 'Unable to retrieve events');
        }
    }

    updateEvent(eventId: number, title?: string, description?: string, location?: string, category?: Category, status?: EventStatus, capacity?: number | null, startDatetime?: Date, endDatetime?: Date) {
        const params: UpdateEventParams = { title, description, location, category, status, capacity, startDatetime, endDatetime };
        try {
            this.eventRepository.update(eventId, params);
            return OkResult<void>(undefined);
        } catch (error) {
            return ErrResult<void>(error instanceof Error ? error.message : 'Unable to update event');
        }
    }

    deleteEvent(eventId: number) {
        try {
            this.eventRepository.delete(eventId);
            return OkResult<void>(undefined);
        } catch (error) {
            return ErrResult<void>(error instanceof Error ? error.message : 'Unable to delete event');
        }
    }

    createRSVP(eventId: number, userId: number, status: RSVPStatus) {
        try {
            this.rsvpRepository.create(eventId, userId, status);
            return OkResult<void>(undefined);
        } catch (error) {
            return ErrResult<void>(error instanceof Error ? error.message : 'Unable to create RSVP');
        }
    }

    getRSVPsForEvent(eventId: number) {
        try {
            return OkResult(this.rsvpRepository.findByEventId(eventId));
        } catch (error) {
            return ErrResult<IRSVP[]>(error instanceof Error ? error.message : 'Unable to retrieve RSVPs');
        }
    }

    updateRSVP(eventId: number, userId: string, status: RSVPStatus) {
        try {
            this.rsvpRepository.update(eventId, status);
            return OkResult<void>(undefined);
        } catch (error) {
            return ErrResult<void>(error instanceof Error ? error.message : 'Unable to update RSVP');
        }
    }

    deleteRSVP(eventId: number) {
        try {
            this.rsvpRepository.delete(eventId);
            return OkResult<void>(undefined);
        } catch (error) {
            return ErrResult<void>(error instanceof Error ? error.message : 'Unable to delete RSVP');
        }
    }
}

export const CreateEventService = (eventRepository: IEventRepository, rsvpRepository : IRSVPRepository): IEventService => {
    return new EventService(eventRepository, rsvpRepository);
};
