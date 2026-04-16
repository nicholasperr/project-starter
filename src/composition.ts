import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";

import { CreateEventController } from "./controller/EventController";
import { CreateEventFilterController } from "./controller/EventFilterController";
import { CreateEventSearchController } from "./controller/EventSearchController";

import { CreateEventRepository } from "./repository/EventRepository";
import { CreateRSVPRepository } from "./repository/RSVPRepository";

import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";

import { CreateEventService } from "./service/EventService";
import { CreateEventFilterService } from "./service/EventFilterService";
import { CreateEventSearchService } from "./service/EventSearchService";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  // Auth wiring
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(
    authService,
    adminUserService,
    resolvedLogger,
  );

  // Shared repositories
  const eventRepository = CreateEventRepository();
  const rsvpRepository = CreateRSVPRepository();

  // Event detail / lifecycle
  const eventService = CreateEventService(eventRepository, rsvpRepository);
  const eventController = CreateEventController(
    eventService,
    resolvedLogger,
  );

  // Event filter
  const eventFilterService = CreateEventFilterService(eventRepository);
  const eventFilterController = CreateEventFilterController(
    eventFilterService,
  );

  // Event search
  const eventSearchService = CreateEventSearchService(eventRepository);
  const eventSearchController = CreateEventSearchController(
    eventSearchService,
  );

  return CreateApp(
    authController,
    eventController,
    resolvedLogger,
    eventFilterController,
    eventSearchController,
  );
}