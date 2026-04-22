import type { Request, Response } from "express";
import type { ILoggingService } from "../service/LoggingService";
import type { IEventService } from "../service/EventService";
import type { IAppBrowserSession } from "../session/AppSession";
import { Category } from "../model/event";
import { EventTimeFrame } from "../service/EventService";
import { time } from "node:console";
import { EventError } from "../event/errors";


export interface IEventController {
    createEvent(req: Request, res: Response): Promise<void>;
    showEventCreateForm(res: Response, session: IAppBrowserSession):  Promise<void>;
    showEventEditForm(req: Request, res: Response, session: IAppBrowserSession):  Promise<void>;
    editEvent(req: Request, res: Response):  Promise<void>;
    toggleRSVPFromForm(
        res: Response,
        eventId: number,
        userId: string,
        session: IAppBrowserSession,
    ): Promise<void>;
    showEventDetail(req: Request, res: Response, session: IAppBrowserSession):  Promise<void>;
    publishEventFromForm(req: Request, res: Response, session: IAppBrowserSession): Promise<void>;
    cancelEventFromForm(req: Request, res: Response, session: IAppBrowserSession):  Promise<void>;
    showRSVPDashboard(res: Response, session: IAppBrowserSession):  Promise<void>;
    searchEvents(req: Request, res: Response): Promise<void>;
}

class EventController implements IEventController {
    constructor(
        private readonly eventService: IEventService,
        private readonly logger: ILoggingService,
    ) {}

    private mapEventErrorStatus(error: EventError): number {
    if (error.name === "EventNotFoundError") return 404;
    if (error.name === "UnauthorizedError") return 403;
    if (error.name === "InvalidTransitionError") return 409;
    return 400;
}

    private isHtmxRequest(req: Request): boolean {
    return req.get("HX-Request") === "true";
}

    async showEventDetail(req: Request, res: Response, session: IAppBrowserSession){
        this.logger.info(`Showing event detail for event ID: ${req.params.id}`);
        const eventId = Number(req.params.id);
        console.log("Event ID from params:", req.params.id, "Parsed event ID:", eventId);

        if (Number.isNaN(eventId)) {
            res.status(400).render("partials/error", {
                message: "Invalid event id",
                layout: false,
            });
            return;
        }

        const user = session.authenticatedUser;

        if (!user) {
            res.status(401).render("partials/error", {
                message: "Please log in to continue.",
                layout: false,
            });
            return;
        }

        const result = await this.eventService.getVisibleEventById(
            eventId,
            user.userId,
            user.role,
        );

        if (!result.ok) {
            const error = result.value;

            const status =
                error.name === "EventNotFoundError" ? 404 : 403;

            res.status(status).render("partials/error", {
                message: error.message,
                layout: false,
            });
            return;
}
        res.render("event/show", {
            session,
            pageError: null,
            event: result.value,
        });
    }

async publishEventFromForm(req: Request, res: Response, session: IAppBrowserSession) {
    const eventId = Number(req.params.id);

    if (Number.isNaN(eventId)) {
        res.status(400).render("partials/error", {
            message: "Invalid event id",
            layout: false,
        });
        return;
    }

    const user = session.authenticatedUser;

    if (!user) {
        res.status(401).render("partials/error", {
            message: "Please log in to continue.",
            layout: false,
        });
        return;
    }

    const result = await this.eventService.publishEvent(eventId, user.userId, user.role);

    if (!result.ok) {
        const status = this.mapEventErrorStatus(result.value);
        res.status(status).render("partials/error", {
            message: result.value.message,
            layout: false,
        });
        return;
    }

    const refreshed = await this.eventService.getVisibleEventById(eventId, user.userId, user.role);

    if (!refreshed.ok) {
        const status = this.mapEventErrorStatus(refreshed.value as EventError);
        res.status(status).render("partials/error", {
            message: refreshed.value.message,
            layout: false,
        });
        return;
    }

    if (this.isHtmxRequest(req)) {
        res.render("event/partials/lifecycle-controls", {
            event: refreshed.value,
            session,
            layout: false,
        });
        return;
    }

    res.redirect(`/events/${eventId}`);
}

async cancelEventFromForm(req: Request, res: Response, session: IAppBrowserSession) {
    const eventId = Number(req.params.id);

    if (Number.isNaN(eventId)) {
        res.status(400).render("partials/error", {
            message: "Invalid event id",
            layout: false,
        });
        return;
    }

    const user = session.authenticatedUser;

    if (!user) {
        res.status(401).render("partials/error", {
            message: "Please log in to continue.",
            layout: false,
        });
        return;
    }

    const result = await this.eventService.cancelEvent(eventId, user.userId, user.role);

    if (!result.ok) {
        const status = this.mapEventErrorStatus(result.value);
        res.status(status).render("partials/error", {
            message: result.value.message,
            layout: false,
        });
        return;
    }

    const refreshed = await this.eventService.getVisibleEventById(eventId, user.userId, user.role);

    if (!refreshed.ok) {
        const status = this.mapEventErrorStatus(refreshed.value as EventError);
        res.status(status).render("partials/error", {
            message: refreshed.value.message,
            layout: false,
        });
        return;
    }

    if (this.isHtmxRequest(req)) {
        res.render("event/partials/lifecycle-controls", {
            event: refreshed.value,
            session,
            layout: false,
        });
        return;
    }

    res.redirect(`/events/${eventId}`);
}

    async createEvent(req: Request, res: Response) {
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

        const result = await this.eventService.createEvent(
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

    async showEventCreateForm(res: Response, session: IAppBrowserSession) {
        res.render("event/create", {
            pageTitle: "Create Event",
            session: session,
        });
    }

    async showEventEditForm(req: Request, res: Response, session: IAppBrowserSession) {
        const eventId = Number(req.params.id);
        if (Number.isNaN(eventId)) {
            res.status(400).render("partials/error", {
                message: "Invalid event id",
                layout: false,
            });
            return;
        }

        const result = await this.eventService.getEventById(eventId);
        if (!result.ok) {
            res.status(404).render("partials/error", {
                message: result.value,
                layout: false,
            });
            return;
        }
        if (session.authenticatedUser?.userId !== result.value.organizerId && session.authenticatedUser?.role !== "admin") {
            res.status(403).render("partials/error", {
                message: "You do not have permission to edit this event",
                layout: false,
            });
            return;
        }

        res.render("event/edit", {
            pageTitle: "Edit Event",
            event: result.value,
            session: session,
        });
    }

    async editEvent(req: Request, res: Response) {
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
        const result = await this.eventService.updateEvent(
            eventId,
            title,
            description,
            location,
            category,
            status,
            parsedCapacity,
            new Date(startDatetime),
            new Date(endDatetime),
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

    async searchEvents(req: Request, res: Response){
        
        const query = (req.query.query as string ?? "")
        const category = req.query.category as Category | undefined;
        const timeframe = req.query.timeframe as EventTimeFrame | undefined;

        const result = await this.eventService.searchEvents(query, category, timeframe);
        if (result.ok === false) {
            res.status(400).json({ error: result.value});
            return;
        }

        res.render("events/index", {
            events: result.value,
            query: query,
            category: category,
            timeframe: timeframe,
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
        const result = await this.eventService.toggleRSVP(eventId, userId);

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

    async showRSVPDashboard(res: Response, session: IAppBrowserSession) {
        const user = session.authenticatedUser;

        if (!user) {
            res.status(401).render("partials/error", {
                message: "Please log in to continue.",
                layout: false,
            });
            return;
        }

        if (user.role !== "user") {
            res.status(403).render("partials/error", {
                message: "Dashboard only available to members",
                layout: false,
            });
            return;
        }

        const result = await this.eventService.getUserDashboard(user.userId);

        if (!result.ok) {
            res.status(400).render("partials/error", {
                message: result.value,
                layout: false,
            });
            return;
        }

        res.render("event/dashboard", {
            session,
            upcoming: result.value.upcoming,
            past: result.value.past,
        });
    }
}

export const CreateEventController = (eventService: IEventService, logger: ILoggingService): IEventController => {
    return new EventController(eventService, logger);
};
