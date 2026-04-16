import { IEvent } from "../model/event";
import { IEventRepository } from "../repository/EventRepository";
import { Ok, Result } from "../lib/result"
import { EventError } from "./errors"

export interface IEventSearchService {
    searchEvents(query: string): Result<IEvent[], EventError>
}

class EventSearchService implements IEventSearchService {

    constructor(private readonly eventRepository: IEventRepository) { 
    }

    searchEvents(query: string): Result<IEvent[], EventError> {

        const today = new Date();
        let events = this.eventRepository.findAll().filter(e => e.status === "published").filter(e => e.startDatetime > today);

        if (query === "") {
            return Ok(events);
        }

        else {
            events = events.filter(e => e.title.includes(query) || e.description.includes(query) || e.location.includes(query))
            return Ok(events);
        }
    }
}

export const CreateEventSearchService = (eventRepository: IEventRepository): IEventSearchService => {
    return new EventSearchService(eventRepository);
}