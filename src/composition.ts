import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";
import { CreateEventRepository } from "./repository/EventRepository";
import { CreateEventFilterService } from "./service/EventFilterService";
import { CreateEventFilterController } from "./controller/EventFilterController";
import { CreateEventSearchService } from "./service/EventSearchService";
import { CreateEventSearchController } from "./controller/EventSearchController";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  // Authentication & authorization wiring
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);
  const eventRepository = CreateEventRepository();
  const eventFilterService = CreateEventFilterService(eventRepository);
  const eventFilterController = CreateEventFilterController(eventFilterService);
  const eventSearchService = CreateEventSearchService(eventRepository)
  const eventSearchController = CreateEventSearchController(eventSearchService);

  return CreateApp(authController, resolvedLogger, eventFilterController, eventSearchController);
}
