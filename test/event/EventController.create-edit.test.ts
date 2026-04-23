import request from "supertest";
import { CreateApp } from "../../src/app";
import { CreateAuthController } from "../../src/auth/AuthController";
import { CreateAuthService } from "../../src/auth/AuthService";
import { CreateAdminUserService } from "../../src/auth/AdminUserService";
import { CreateInMemoryUserRepository } from "../../src/auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "../../src/auth/PasswordHasher";
import { CreateEventController } from "../../src/controller/EventController";
import { CreateEventRepository } from "../../src/repository/EventRepository";
import { CreateRSVPRepository } from "../../src/repository/RSVPRepository";
import { CreateEventService } from "../../src/service/EventService";
import { CreateLoggingService } from "../../src/service/LoggingService";

async function loginAsUser(agent: ReturnType<typeof request.agent>) {
  await agent
    .post("/login")
    .type("form")
    .send({ email: "user@app.test", password: "password123" })
    .expect(302);

  await agent.get("/").expect(302);
}

async function findEventIdByTitle(
  eventRepo: ReturnType<typeof CreateEventRepository>,
  title: string,
) {
  const allEvents = await eventRepo.findAll();
  if (!allEvents.ok) {
    throw new Error("Could not load events");
  }

  const match = allEvents.value.find((event) => event.title === title);
  if (!match) {
    throw new Error(`Event not found: ${title}`);
  }

  return match.id;
}

type TestAppState = {
  app: ReturnType<ReturnType<typeof CreateApp>["getExpressApp"]>;
  eventRepository: ReturnType<typeof CreateEventRepository>;
};

function buildTestApp(): TestAppState {
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, CreateLoggingService());

  const eventRepository = CreateEventRepository();
  const rsvpRepository = CreateRSVPRepository();
  const eventService = CreateEventService(eventRepository, rsvpRepository);
  const eventController = CreateEventController(eventService, CreateLoggingService());

  const app = CreateApp(authController, eventController, CreateLoggingService()).getExpressApp();
  return { app, eventRepository };
}

describe("Event creation and editing integration", () => {
  let app: ReturnType<ReturnType<typeof CreateApp>["getExpressApp"]>;
  let eventRepository: ReturnType<typeof CreateEventRepository>;

  beforeEach(() => {
    const testApp = buildTestApp();
    app = testApp.app;
    eventRepository = testApp.eventRepository;
  });

  it("creates an event through the app and persists it in the repository", async () => {
    const agent = request.agent(app);
    await loginAsUser(agent);

    const title = "New Campus Lecture";
    await agent
      .post("/events")
      .type("form")
      .send({
        title,
        description: "A live lecture for the campus community.",
        location: "Science Hall",
        category: "academic",
        status: "published",
        capacity: "120",
        startDatetime: "2100-01-10T10:00",
        endDatetime: "2100-01-10T12:00",
        organizerId: "user-reader",
      })
      .expect(302)
      .expect("Location", "/events");

    const allEvents = await eventRepository.findAll();
    expect(allEvents.ok).toBe(true);
    if (allEvents.ok) {
      expect(allEvents.value.some((event) => event.title === title)).toBe(true);
    }
  });

  it("shows the edit form and updates an event through the app", async () => {
    const agent = request.agent(app);
    await loginAsUser(agent);

    const originalTitle = "Community Meetup";
    await agent
      .post("/events")
      .type("form")
      .send({
        title: originalTitle,
        description: "A group meetup for campus members.",
        location: "Commons Hall",
        category: "social",
        status: "published",
        capacity: "50",
        startDatetime: "2100-02-01T17:00",
        endDatetime: "2100-02-01T19:00",
        organizerId: "user-reader",
      })
      .expect(302);

    const eventId = await findEventIdByTitle(eventRepository, originalTitle);

    const editPage = await agent.get(`/events/${eventId}/edit`).expect(200);
    expect(editPage.text).toContain("Edit Event");
    expect(editPage.text).toContain(originalTitle);

    await agent
      .post(`/events/${eventId}`)
      .type("form")
      .send({
        title: "Community Meetup Updated",
        description: "A group meetup for campus members.",
        location: "Commons Hall",
        category: "social",
        status: "published",
        capacity: "60",
        startDatetime: "2100-02-01T17:00",
        endDatetime: "2100-02-01T19:30",
      })
      .expect(302)
      .expect("Location", `/events/${eventId}`);

    const updatedResult = await eventRepository.findById(eventId);
    expect(updatedResult.ok).toBe(true);
    if (updatedResult.ok) {
      expect(updatedResult.value.title).toBe("Community Meetup Updated");
      expect(updatedResult.value.capacity).toBe(60);
    }
  });

  it("returns validation errors when the edit form is incomplete", async () => {
    const agent = request.agent(app);
    await loginAsUser(agent);

    const title = "Editable Event";
    await agent
      .post("/events")
      .type("form")
      .send({
        title,
        description: "Editable event content.",
        location: "Hall 5",
        category: "social",
        status: "published",
        capacity: "10",
        startDatetime: "2100-03-01T11:00",
        endDatetime: "2100-03-01T12:00",
        organizerId: "user-reader",
      })
      .expect(302);

    const eventId = await findEventIdByTitle(eventRepository, title);

    const response = await agent
      .post(`/events/${eventId}`)
      .type("form")
      .send({
        title: "",
        description: "Editable event content.",
        location: "Hall 5",
        category: "social",
        status: "published",
        capacity: "10",
        startDatetime: "2100-03-01T11:00",
        endDatetime: "2100-03-01T12:00",
      })
      .expect(400);

    expect(response.text).toContain("Title is required.");
  });

  it("returns a user-visible error when editing a missing event", async () => {
    const agent = request.agent(app);
    await loginAsUser(agent);

    const response = await agent
      .post("/events/99999")
      .type("form")
      .send({
        title: "Missing Event",
        description: "This event does not exist.",
        location: "Nowhere",
        category: "social",
        status: "published",
        capacity: "10",
        startDatetime: "2100-04-01T09:00",
        endDatetime: "2100-04-01T10:00",
      })
      .expect(400);

    expect(response.text).toContain("Event not found");
  });
});
