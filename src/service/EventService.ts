import { Category, EventStatus } from "../model/event";
import { RSVP, RSVPStatus } from "../model/rsvp";
import { IEventRepository } from "../repository/EventRepository";
import { IRSVPRepository } from "../repository/RSVPRepository";

export interface IEventService {
    createEvent( title: string, description: string, location: string, category: Category, status?: EventStatus, capacity: number, startDatetime: Date, endDatetime: Date, organizerId: number): Promise<void>;
    getEventById(eventId: string): Promise<Event | null>;
    getAllEvents(): Promise<Event[]>;
    updateEvent(eventId: string, name?: string, date?: Date, location?: string): Promise<void>;
    deleteEvent(eventId: string): Promise<void>;
    createRSVP(eventId: string, userId: string, status: RSVPStatus): Promise<void>;
    getRSVPsForEvent(eventId: string): Promise<RSVP[]>;
    updateRSVP(eventId: string, userId: string, status: RSVPStatus): Promise<void>;
    deleteRSVP(eventId: string, userId: string): Promise<void>;

}

class EventService implements IEventService {

    constructor(private readonly eventRepository: IEventRepository, private readonly rsvpRepository: IRSVPRepository) {
        createEvent( title: string, description: string, location: string, category: Category, status = 'draft' as EventStatus, capacity: number, startDatetime: Date, endDatetime: Date, organizerId: number)
    }
}

export const CreateEventService = (eventRepository: IEventRepository, rsvpRepository : IRSVPRepository): IEventService => {
    return new EventService(eventRepository, rsvpRepository);
