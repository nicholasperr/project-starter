import type { Request, Response } from "express";
import type { ILoggingService } from "../service/LoggingService";
import type { IEventService } from "../service/EventService";
import type { IAppBrowserSession } from "../session/AppSession";
import { Category } from "../model/event";
import { EventTimeFrame } from "../service/EventService";
import { time } from "node:console";

export interface IEventController {
    createEvent(req: Request, res: Response): Promise<void>;
    showEventCreateForm(res: Response, session: IAppBrowserSession):  Promise<void>;
    showEventEditForm(req: Request, res: Response, session: IAppBrowserSession):  Promise<void>;
    editEvent(req: Request, res: Response):  Promise<void>;
    toggleRSVPFromForm(
        req: Request,
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
            res.status(404).render("partials/error", {
                message: result.value,
                layout: false,
            });
            return;
        }

        const rsvpsResult = await this.eventService.getRSVPsForEvent(eventId);
        const currentRsvp =
            rsvpsResult.ok
                ? rsvpsResult.value.find((rsvp) => rsvp.userId === user.userId) ?? null
                : null;

        res.render("event/show", {
            session,
            pageError: null,
            event: result.value,
            currentRsvp,
            errorMessage: null,
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
            res.status(400).render("partials/error", {
                message: result.value,
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
            res.status(400).render("partials/error", {
                message: result.value,
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
        req: Request,
        res: Response,
        eventId: number,
        userId: string,
        session: IAppBrowserSession,
    ): Promise<void> {
        const eventResult = await this.eventService.getEventById(eventId);

        if (!eventResult.ok) {
            res.status(404).render("partials/error", {
                message: eventResult.value,
                layout: false,
            });
            return;
        }

        const toggleResult = await this.eventService.toggleRSVP(eventId, userId);

        const rsvpsResult = await this.eventService.getRSVPsForEvent(eventId);
        const currentRsvp =
            rsvpsResult.ok
                ? rsvpsResult.value.find((rsvp) => rsvp.userId === userId) ?? null
                : null;

        const isDashboardRequest =
            req.body &&
            typeof req.body.context === "string" &&
            req.body.context === "dashboard";

        if (toggleResult.ok === false) {
            this.logger.warn(`RSVP toggle failed: ${toggleResult.value}`);

            res.status(200).render("partials/rsvp-action", {
                layout: false,
                event: eventResult.value,
                session,
                currentRsvp,
                errorMessage: toggleResult.value.message,
            });
            return;
        }

        this.logger.info(`RSVP toggled for user ${userId} on event ${eventId}`);

        if (isDashboardRequest) {
            const dashboardResult = await this.eventService.getUserDashboard(userId);

            if (!dashboardResult.ok) {
                res.status(400).render("partials/error", {
                    message: dashboardResult.value,
                    layout: false,
                });
                return;
            }

            res.render("partials/dashboard-sections", {
                layout: false,
                upcoming: dashboardResult.value.upcoming,
                past: dashboardResult.value.past,
                session,
            });
            return;
        }

        res.render("partials/rsvp-action", {
            layout: false,
            event: eventResult.value,
            session,
            currentRsvp,
            errorMessage: null,
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
