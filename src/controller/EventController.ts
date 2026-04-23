import type { Request, Response } from "express";
import type { ILoggingService } from "../service/LoggingService";
import type { IEventService } from "../service/EventService";
import type { IAppBrowserSession } from "../session/AppSession";
import { Category } from "../model/event";
import { EventTimeFrame } from "../service/EventService";
import { EventError, Unauthorized, InvalidInput } from "../lib/errors";
import { time } from "node:console";

export interface IEventController {
    createEvent(req: Request, res: Response, session: IAppBrowserSession): Promise<void>;
    showEventCreateForm(res: Response, session: IAppBrowserSession, pageError?: string, formData?: any):  Promise<void>;
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
    getFilteredEvents(req: Request, res: Response): Promise<void>;
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

        if (result.ok === false) {
            res.status(404).render("partials/error", {
                message: result.value.message,
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
                message: result.value.message,
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
                message: result.value.message,
                layout: false,
            });
            return;
        }

        res.redirect(`/events/${eventId}`);
    }
    
    async createEvent(req: Request, res: Response, session: IAppBrowserSession) {
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

        const formValues = {
            title,
            description,
            location,
            category,
            status,
            capacity,
            startDatetime,
            endDatetime,
            organizerId,
        };

        const errors = this.validateEventForm(formValues);
        if (Object.keys(errors).length > 0) {
            res.status(400).render("event/create", {
                pageTitle: "Create Event",
                session,
                formValues,
                errors,
                pageError: null,
            });
            return;
        }

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
                message: result.value.message,
                layout: false,
            });
            return;
        }

        res.redirect("/events");
    }

    async showEventCreateForm(res: Response, session: IAppBrowserSession, pageError?: string, formData?: any) {
        res.render("event/create", {
            pageTitle: "Create Event",
            session: session,
            formValues: {},
            errors: {},
            pageError: null,
        });
    }

    async showEventEditForm(req: Request, res: Response, session: IAppBrowserSession) {
        const eventId = Number(req.params.id);
        if (Number.isNaN(eventId)) {
            res.status(400).render("partials/error", {
                message: InvalidInput("Invalid event id").message,
                layout: false,
            });
            return;
        }

        const result = await this.eventService.getEventById(eventId);
        if (!result.ok) {
            const error = result.value as EventError;
            let statusCode = 400;
            if (error.name === 'EventNotFound') statusCode = 404;
            res.status(statusCode).render("partials/error", {
                message: error.message,
                layout: false,
            });
            return;
        }
        if (session.authenticatedUser?.userId !== result.value.organizerId && session.authenticatedUser?.role !== "admin") {
            res.status(403).render("partials/error", {
                message: Unauthorized("You do not have permission to edit this event").message,
                layout: false,
            });
            return;
        }

        res.render("event/edit", {
            pageTitle: "Edit Event",
            event: result.value,
            session: session,
            formValues: {},
            errors: {},
        });
    }

    private validateEventForm(values: Record<string, any>) {
        const errors: Record<string, string> = {};

        if (!values.title?.trim()) {
            errors.title = "Title is required.";
        }

        if (!values.description?.trim()) {
            errors.description = "Description is required.";
        }

        if (!values.location?.trim()) {
            errors.location = "Location is required.";
        }

        if (!values.category?.trim()) {
            errors.category = "Category is required.";
        }

        if (!values.status?.trim()) {
            errors.status = "Status is required.";
        }

        if (values.capacity !== undefined && values.capacity !== "") {
            const parsed = Number(values.capacity);
            if (Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed < 0) {
                errors.capacity = "Capacity must be a non-negative whole number.";
            }
        }

        if (!values.startDatetime?.trim()) {
            errors.startDatetime = "Start date and time are required.";
        } else if (Number.isNaN(new Date(values.startDatetime).getTime())) {
            errors.startDatetime = "Start date and time are invalid.";
        }

        if (!values.endDatetime?.trim()) {
            errors.endDatetime = "End date and time are required.";
        } else if (Number.isNaN(new Date(values.endDatetime).getTime())) {
            errors.endDatetime = "End date and time are invalid.";
        }

        if (!errors.startDatetime && !errors.endDatetime) {
            const start = new Date(values.startDatetime);
            const end = new Date(values.endDatetime);
            if (start >= end) {
                errors.endDatetime = "End time must be after start time.";
            }
        }

        return errors;
    }

    async editEvent(req: Request, res: Response) {
        const eventId = Number(req.params.id);
        if (Number.isNaN(eventId)) {
            res.status(400).render("partials/error", {
                message: InvalidInput("Invalid event id").message,
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

        const formValues = {
            title,
            description,
            location,
            category,
            status,
            capacity,
            startDatetime,
            endDatetime,
        };

        const errors = this.validateEventForm(formValues);
        if (Object.keys(errors).length > 0) {
            const existingResult = await this.eventService.getEventById(eventId);
            if (existingResult.ok === false) {
                res.status(400).render("partials/error", {
                    message: existingResult.value.message,
                    layout: false,
                });
                return;
            }

            res.status(400).render("event/edit", {
                pageTitle: "Edit Event",
                event: {
                    ...existingResult.value,
                    ...formValues,
                },
                session: (req as any).session,
                formValues,
                errors,
            });
            return;
        }

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
            const error = result.value as EventError;
            res.status(400).render("partials/error", {
                message: error.message,
                layout: false,
            });
            return;
        }

        res.redirect(`/events/${eventId}`);
    }

    async searchEvents(req: Request, res: Response){
        
        const query = (req.query.query as string ?? "")

        const result = await this.eventService.searchEvents(query);
        if (result.ok === false) {
            res.status(400).json({ error: result.value});
            return;
        }

        if (req.get("HX-Request") === "true") {
            res.render("partials/event-list", { events: result.value, layout: false});
        } else { 
            res.render("events/index", {
            events: result.value,
            query: query,
            category: null,
            timeframe: null,
            session: (req as any).session,
            pageError: null
        });
    }
    }

    async getFilteredEvents(req: Request, res: Response): Promise<void> {

        const category = req.query.category as Category | undefined;
        const timeframe = req.query.timeframe as EventTimeFrame | undefined;

        const result = await this.eventService.getFilteredEvents(category, timeframe)
        if (result.ok === false) {
            res.status(400).json({ error: result.value.message });
            return;
        }

        if (req.get("HX-Request") === "true") {
            res.render("partials/event-list", { events: result.value, layout: false});
        } else { 
            res.render("events/index", {
            events: result.value,
            category: category ?? null,
            timeframe: timeframe ?? null, 
            query: null,
            session: (req as any).session,
            pageError: null
        }); 
    }
    }

    
    async toggleRSVPFromForm(
        req: Request,
        res: Response,
        eventId: number,
        userId: string,
        session: IAppBrowserSession,
    ): Promise<void> {
        const eventResult = await this.eventService.getEventById(eventId);

        if (eventResult.ok === false) {
            res.status(404).render("partials/error", {
                message: eventResult.value.message,
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
            const dashboardResult = await this.eventService.getUserDashboard(userId, session.authenticatedUser!.role);

            if (!dashboardResult.ok) {
                res.status(200).render("partials/error", {
                    message: (dashboardResult.value as EventError).message,
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

        const result = await this.eventService.getUserDashboard(user.userId, user.role);

        if (!result.ok) {
            const status = (result.value as EventError).name === "DashboardAccessError" ? 403 : 400;

            res.status(status).render("partials/error", {
                message: (result.value as EventError).message,
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
