import { IEventFilterService } from "../service/EventFilterService";
import { Category } from "../model/event";
import { EventTimeFrame } from "../service/EventFilterService";
import { Response, Request } from "express";

export interface IEventFilterController {
    getFilteredEvents(req: Request, res: Response): void
}

class EventFilterController implements IEventFilterController {
    constructor(private readonly eventFilterService: IEventFilterService) {}

    getFilteredEvents(req: Request, res: Response): void {

        const category = req.query.category as Category | undefined;
        const timeframe = req.query.timeframe as EventTimeFrame | undefined;

        let events = this.eventFilterService.getFilteredEvents(category, timeframe)
        res.json(events);
    }
}

export const CreateEventFilterController = (eventFilterService: IEventFilterService): IEventFilterController => {
    return new EventFilterController(eventFilterService);
}