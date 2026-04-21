import { CreateEventService } from "../../src/service/EventService";
import { CreateEventRepository } from "../../src/repository/EventRepository";
import { CreateRSVPRepository } from "../../src/repository/RSVPRepository";

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

describe("EventService My RSVPs Dashboard", () => {
  let eventRepo: ReturnType<typeof CreateEventRepository>;
  let rsvpRepo: ReturnType<typeof CreateRSVPRepository>;
  let service: ReturnType<typeof CreateEventService>;

  beforeEach(() => {
    eventRepo = CreateEventRepository();
    rsvpRepo = CreateRSVPRepository();
    service = CreateEventService(eventRepo, rsvpRepo);
  });

  it("groups RSVP items into upcoming vs past/cancelled and sorts each section correctly", async () => {
    await eventRepo.create(
      "Later Future",
      "future event later",
      "Campus Center",
      "social",
      "published",
      100,
      new Date("2100-01-03T12:00:00"),
      new Date("2100-01-03T13:00:00"),
      "user-staff",
    );

    await eventRepo.create(
      "Sooner Future",
      "future event sooner",
      "Student Union",
      "social",
      "published",
      100,
      new Date("2100-01-01T12:00:00"),
      new Date("2100-01-01T13:00:00"),
      "user-staff",
    );

    await eventRepo.create(
      "Old Past",
      "past event",
      "Library",
      "academic",
      "published",
      100,
      new Date("2000-01-01T12:00:00"),
      new Date("2000-01-01T13:00:00"),
      "user-staff",
    );

    await eventRepo.create(
      "Cancelled Future",
      "cancelled event",
      "Fine Arts Center",
      "arts",
      "cancelled",
      100,
      new Date("2100-01-02T12:00:00"),
      new Date("2100-01-02T13:00:00"),
      "user-staff",
    );

    const laterFutureId = await findEventIdByTitle(eventRepo, "Later Future");
    const soonerFutureId = await findEventIdByTitle(eventRepo, "Sooner Future");
    const oldPastId = await findEventIdByTitle(eventRepo, "Old Past");
    const cancelledFutureId = await findEventIdByTitle(eventRepo, "Cancelled Future");

    await service.createRSVP(laterFutureId, "dashboard-user", "going");
    await service.createRSVP(soonerFutureId, "dashboard-user", "waitlisted");
    await service.createRSVP(oldPastId, "dashboard-user", "going");
    await service.createRSVP(cancelledFutureId, "dashboard-user", "going");

    const result = await service.getUserDashboard("dashboard-user");

    expect(result.ok).toBe(true);

    if (result.ok) {
      const upcomingTitles = result.value.upcoming.map((item) => item.event.title);
      const pastTitles = result.value.past.map((item) => item.event.title);

      expect(upcomingTitles).toEqual(["Sooner Future", "Later Future"]);
      expect(pastTitles).toEqual(["Cancelled Future", "Old Past"]);
    }
  });

  it("places cancelled RSVPs into the past section even when the event is still future", async () => {
    await eventRepo.create(
      "Future Cancelled RSVP",
      "future event with cancelled RSVP",
      "Campus Pond",
      "social",
      "published",
      100,
      new Date("2100-02-01T12:00:00"),
      new Date("2100-02-01T13:00:00"),
      "user-staff",
    );

    const eventId = await findEventIdByTitle(eventRepo, "Future Cancelled RSVP");
    await service.createRSVP(eventId, "dashboard-user", "cancelled");

    const result = await service.getUserDashboard("dashboard-user");

    expect(result.ok).toBe(true);

    if (result.ok) {
      const upcomingTitles = result.value.upcoming.map((item) => item.event.title);
      const pastTitles = result.value.past.map((item) => item.event.title);

      expect(upcomingTitles).not.toContain("Future Cancelled RSVP");
      expect(pastTitles).toContain("Future Cancelled RSVP");
    }
  });
});