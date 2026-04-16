import type { Request, Response } from "express";
import type { ILoggingService } from "../service/LoggingService";
import type { IEventService } from "../service/EventService";
import type { IAppBrowserSession } from "../session/AppSession";

export interface IEventController {
    createEvent(req: Request, res: Response): void;
    showEventCreateForm(res: Response, session: IAppBrowserSession): void;
    showEventEditForm(req: Request, res: Response, session: IAppBrowserSession): void;
    editEvent(req: Request, res: Response): void;
    toggleRSVPFromForm(
        res: Response,
        eventId: number,
        userId: string,
        session: IAppBrowserSession,
    ): Promise<void>;
}

class EventController implements IEventController {
    constructor(
        private readonly eventService: IEventService,
        private readonly logger: ILoggingService,
    ) {}

    createEvent(req: Request, res: Response) {
        const {
            title,
            description,
            location,
            category,
            status,
            capacity,
            startDatetime,
            endDatetime,
            organizerId,
        } = req.body;

        const parsedCapacity = capacity !== undefined && capacity !== "" ? Number(capacity) : null;
        const parsedOrganizerId = organizerId;

        const result = this.eventService.createEvent(
            title,
            description,
            location,
            category,
            status,
            parsedCapacity,
            new Date(startDatetime),
            new Date(endDatetime),
            parsedOrganizerId,
        );

        if (!result.ok) {
            res.status(400).render("partials/error", {
                message: result.value,
                layout: false,
            });
            return;
        }

        res.redirect("/events");
    }

    showEventCreateForm(res: Response, session: IAppBrowserSession) {
        res.render("event/create", {
            pageTitle: "Create Event",
            session: session,
        });
    }

    showEventEditForm(req: Request, res: Response, session: IAppBrowserSession) {
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
        if (session.authenticatedUser?.userId !== result.value.organizerId) {
            res.status(403).render("partials/error", {
                message: "You do not have permission to edit this event",});
            return;
        }

        res.render("event/edit", {
            pageTitle: "Edit Event",
            event: result.value,
            session: session,
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

        res.redirect("/events");
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
