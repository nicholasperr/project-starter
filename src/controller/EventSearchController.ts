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

        const result = this.eventSearchService.searchEvents(query);
        if (result.ok === false) {
            res.status(400).json({ error: result.value.message});
            return;
        }

        res.json(result.value);
    }
}

export const CreateEventSearchController = (eventSearchService: IEventSearchService): IEventSearchController => {
    return new EventSearchController(eventSearchService);
}