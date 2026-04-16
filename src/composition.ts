import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";

import { CreateEventController } from "./controller/EventController";
import { CreateEventRepository } from "./repository/EventRepository";
import { CreateRSVPRepository } from "./repository/RSVPRepository";
import { CreateLoggingService } from "./service/LoggingService";
import { CreateEventService } from "./service/EventService";

export function createComposedApp(): IApp {

    const logger = CreateLoggingService();

    // auth setup
    const userRepo = CreateInMemoryUserRepository();
    const passwordHasher = CreatePasswordHasher();
    const authService = CreateAuthService(userRepo, passwordHasher);
    const adminService = CreateAdminUserService(userRepo, passwordHasher);
    const authController = CreateAuthController(authService, adminService, logger);

    // event + RSVP setup
    const eventRepo = CreateEventRepository();
    const rsvpRepo = CreateRSVPRepository();
    const eventService = CreateEventService(eventRepo, rsvpRepo);
    const eventController = CreateEventController(eventService, logger);

    // create app with everything wired
    return CreateApp(authController, eventController, logger);
}