import { Category, EventStatus, IEvent } from "../model/event";
import { IRSVP, RSVPStatus } from "../model/rsvp";
import { IEventRepository } from "../repository/EventRepository";
import { IRSVPRepository } from "../repository/RSVPRepository";

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

}

export const CreateEventService = (eventRepository: IEventRepository, rsvpRepository : IRSVPRepository): IEventService => {
    return new EventService(eventRepository, rsvpRepository);
}
