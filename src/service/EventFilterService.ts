import { IEvent, Category } from "../model/event"
import { IEventRepository } from "../repository/EventRepository"
import { Ok, Result } from "../lib/result"
import { EventError } from "./errors"

export type EventTimeFrame = "all_upcoming" | "this_week" | "this_weekend"

export interface IEventFilterService {
    getFilteredEvents(category?: Category, timeframe?: EventTimeFrame): Result<IEvent[], EventError>
}

class EventFilterService implements IEventFilterService {
    
    constructor(private readonly eventRepository: IEventRepository) {
    }
    
    getFilteredEvents(category?: Category, timeframe?: EventTimeFrame): Result<IEvent[], EventError> {
        let events = this.eventRepository.findAll().filter(e => e.status === "published");
        
        if (category) { events = events.filter(e => e.category === category) }
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
}

export const CreateEventFilterService = (eventRepository: IEventRepository): IEventFilterService => {
    return new EventFilterService(eventRepository)
}