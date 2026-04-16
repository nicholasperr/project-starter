import type { Response } from "express";
import type { ILoggingService } from "../service/LoggingService";
import type { IEventService } from "../service/EventService";
import type { IAppBrowserSession } from "../session/AppSession";

export interface IEventController {
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

export function CreateEventController(
    eventService: IEventService,
    logger: ILoggingService,
): IEventController {
    return new EventController(eventService, logger);
}