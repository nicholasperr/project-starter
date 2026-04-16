import type { Request, Response } from "express";
import { IEventService } from "../service/EventService";

export interface IEventController {
    createEvent(res: Response, content: string): void;
    showEventCreateForm(res: Response): void;
    showEventEditForm(req: Request, res: Response): void;
    editEvent(req: Request, res: Response): void;
}

class EventController implements IEventController {
    constructor(private readonly eventService: IEventService) {}

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
                message: result.error,
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
                message: result.error,
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
                message: result.error,
                layout: false,
            });
            return;
        }

        res.redirect(`/events/${eventId}`);
    }
}

export const CreateEventController = (eventService: IEventService): IEventController => {
    return new EventController(eventService);
};
