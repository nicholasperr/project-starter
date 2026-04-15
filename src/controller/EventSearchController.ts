import { IEventSearchService } from "../service/EventSearchService";
import { Request, Response} from "express";

export interface IEventSearchController {
    searchEvents(req: Request, res: Response): void
}

class EventSearchController implements IEventSearchController {
    constructor(private readonly eventSearchService: IEventSearchService) {
    }

    searchEvents(req: Request, res: Response): void {
        
        const query = (req.query.query as string ?? "")

        let events = this.eventSearchService.searchEvents(query)
        res.json(events);
    }
}

export const CreateEventSearchController = (eventSearchService: IEventSearchService): IEventSearchController => {
    return new EventSearchController(eventSearchService);
}