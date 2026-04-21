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

import { CreateLoggingService, ILoggingService } from "./service/LoggingService";
import { CreateEventService } from "./service/EventService";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(
    authService,
    adminUserService,
    resolvedLogger,
  );

  const eventRepository = CreateEventRepository();
  const rsvpRepository = CreateRSVPRepository();

  const eventService = CreateEventService(eventRepository, rsvpRepository);
  const eventController = CreateEventController(
    eventService,
    resolvedLogger,
  );


  return CreateApp(authController, eventController, resolvedLogger);
}