import { IEvent } from "../model/event";
import { IEventRepository } from "../repository/EventRepository";

export interface IEventSearchService {
    searchEvents(query: string): IEvent[]
}

class EventSearchService implements IEventSearchService {

    constructor(private readonly eventRepository: IEventRepository) { 
    }

    searchEvents(query: string): IEvent[] {

        const today = new Date();
        let events = this.eventRepository.findAll().filter(e => e.status === "published").filter(e => e.startDatetime > today);

        if (query === "") {
            return events;
        }

        else if (query !== "") {
            events = events.filter(e => e.title.includes(query) || e.description.includes(query) || e.location.includes(query))
            return events;
        }

        return events;
    }
}

export const CreateEventSearchService = (eventRepository: IEventRepository): IEventSearchService => {
    return new EventSearchService(eventRepository);
}