import { IEventService } from "../service/EventService";

export interface IEventController {
    createEvent(res: Response, content: string): void;
    showEventCreateForm(res: Response): void;
}

class EventController implements IEventController {
    constructor(private readonly eventService: IEventService) {
    }
    createEvent(res: Response, content: string) {
        const { title, description, location, category, status, capacity, startDatetime, endDatetime, organizerId } = JSON.parse(content);
        this.eventService.createEvent(title, description, location, category, status, capacity, new Date(startDatetime), new Date(endDatetime), organizerId);
    }
    showEventCreateForm() {
        console.log("Displaying event creation form...");
    }
}

export const CreateEventController = (eventService: IEventService): IEventController => {
    return new EventController(eventService);
}
