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

        if (!result.ok) {
            res.status(404).render("partials/error", {
                message: result.value,
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

        // Input validation
        const errors: string[] = [];
        
        if (!title || title.trim() === "") {
            errors.push("Title is required");
        }
        
        if (!description || description.trim() === "") {
            errors.push("Description is required");
        }
        
        if (!location || location.trim() === "") {
            errors.push("Location is required");
        }
        
        if (!category) {
            errors.push("Category is required");
        }
        
        if (capacity !== undefined && capacity !== "" && (isNaN(Number(capacity)) || Number(capacity) < 0)) {
            errors.push("Capacity must be a positive number");
        }
        
        if (!startDatetime) {
            errors.push("Start datetime is required");
        }
        
        if (!endDatetime) {
            errors.push("End datetime is required");
        }
        
        if (startDatetime && endDatetime) {
            const startDate = new Date(startDatetime);
            const endDate = new Date(endDatetime);
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                errors.push("Start and end datetimes must be valid dates");
            } else if (startDate >= endDate) {
                errors.push("End datetime must be after start datetime");
            }
        }
        
        // If validation errors exist, re-render form with errors
        if (errors.length > 0) {
            this.logger.warn(`Event creation validation failed: ${errors.join(", ")}`);
            await this.showEventCreateForm(res, session, errors.join(", "), req.body);
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
            const error = result.value;
            this.logger.warn(`Event creation failed: ${error.message}`);
            await this.showEventCreateForm(res, session, error.message, req.body);
            return;
        }

        res.redirect("/events");
    }

    async showEventCreateForm(res: Response, session: IAppBrowserSession, pageError?: string, formData?: any) {
        res.render("event/create", {
            pageTitle: "Create Event",
            session: session,
            pageError: pageError || null,
            formData: formData || {},
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
        });
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
            let statusCode = 400;
            if (error.name === 'EventNotFound') statusCode = 404;
            res.status(statusCode).render("partials/error", {
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
