import type { Request, Response } from "express";
import type { ILoggingService } from "../service/LoggingService";
import type { IEventService } from "../service/EventService";
import type { IAppBrowserSession } from "../session/AppSession";
import { Category } from "../model/event";
import { EventTimeFrame } from "../service/EventService";

export interface IEventController {
    createEvent(res: Response, content: string): void;
    showEventCreateForm(res: Response): void;
    showEventEditForm(req: Request, res: Response): void;
    editEvent(req: Request, res: Response): void;
    toggleRSVPFromForm(
        res: Response,
        eventId: number,
        userId: string,
        session: IAppBrowserSession,
    ): Promise<void>;
    searchEvents(req: Request, res: Response): void;
    getFilteredEvents(req: Request, res: Response): void;
}

class EventController implements IEventController {
    constructor(
        private readonly eventService: IEventService,
        private readonly logger: ILoggingService,
    ) {}

    createEvent(res: Response, content: string) {
        const { title, description, location, category, status, capacity, startDatetime, endDatetime, organizerId } = JSON.parse(content);
        const result = this.eventService.createEvent(
            title,
            description,
            location,
            category,
            status,
            capacity,
            new Date(startDatetime),
            new Date(endDatetime),
            organizerId,
        );

        if (!result.ok) {
            res.status(400).render("partials/error", {
                message: result.value,
                layout: false,
            });
            return;
        }

        res.status(201).json({ ok: true, value: "Event created" });
        res.redirect("/events");
    }

    showEventCreateForm(res: Response) {
        res.render("event/create", {
            pageTitle: "Create Event",
        });
    }

    showEventEditForm(req: Request, res: Response) {
        const eventId = Number(req.params.id);
        if (Number.isNaN(eventId)) {
            res.status(400).render("partials/error", {
                message: "Invalid event id",
                layout: false,
            });
            return;
        }

        const result = this.eventService.getEventById(eventId);
        if (!result.ok) {
            res.status(404).render("partials/error", {
                message: result.value,
                layout: false,
            });
            return;
        }

        res.render("event/edit", {
            pageTitle: "Edit Event",
            event: result.value,
        });
    }

    editEvent(req: Request, res: Response) {
        const eventId = Number(req.params.id);
        if (Number.isNaN(eventId)) {
            res.status(400).render("partials/error", {
                message: "Invalid event id",
                layout: false,
            });
            return;
        }

        const {
            title,
            description,
            location,
            category,
            status,
            capacity,
            startDatetime,
            endDatetime,
        } = req.body;

        const parsedCapacity = capacity !== undefined && capacity !== "" ? Number(capacity) : null;
        const result = this.eventService.updateEvent(
            eventId,
            title,
            description,
            location,
            category,
            status,
            parsedCapacity,
            startDatetime ? new Date(startDatetime) : undefined,
            endDatetime ? new Date(endDatetime) : undefined,
        );

        if (!result.ok) {
            res.status(400).render("partials/error", {
                message: result.value,
                layout: false,
            });
            return;
        }

        res.redirect(`/events/${eventId}`);
    }

    searchEvents(req: Request, res: Response): void {
        
        const query = (req.query.query as string ?? "")

        const result = this.eventService.searchEvents(query);
        if (result.ok === false) {
            res.status(400).json({ error: result.value.message});
            return;
        }

        res.render("events/index", {
            events: result.value,
            category: null,
            timeframe: null,
            query: query,
            session: (req as any).session,
            pageError: null
        });
    }

    getFilteredEvents(req: Request, res: Response): void {

        const category = req.query.category as Category | undefined;
        const timeframe = req.query.timeframe as EventTimeFrame | undefined;

        const result = this.eventService.getFilteredEvents(category, timeframe)
        if (result.ok === false) {
            res.status(400).json({ error: result.value.message });
            return;
        }
        
        res.render("events/index", {
            events: result.value,
            category: category ?? null,
            timeframe: timeframe ?? null, 
            query: null,
            session: (req as any).session,
            pageError: null
        });
        
    }

    
    async toggleRSVPFromForm(
        res: Response,
        eventId: number,
        userId: string,
        session: IAppBrowserSession,
    ): Promise<void> {

        // call service to handle RSVP logic
        const result = this.eventService.toggleRSVP(eventId, userId);

        if (result.ok === false) {
            // log error if something failed
            this.logger.warn(`RSVP toggle failed: ${result.value}`);

            // return small error partial for HTMX later
            res.status(400).render("partials/error", {
                message: result.value,
                layout: false,
            });
            return;
        }

        // log success
        this.logger.info(`RSVP toggled: user ${userId}, event ${eventId}, status ${result.value}`);

        // reload home page 
        res.render("home", {
            session,
            pageError: null,
        });
    }
}

export const CreateEventController = (eventService: IEventService, logger: ILoggingService): IEventController => {
    return new EventController(eventService, logger);
};
