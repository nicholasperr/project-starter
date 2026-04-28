import prisma from "../../src/prisma";
import { CreateEventService } from "../../src/service/EventService";
import { CreateEventRepository } from "../../src/repository/EventRepository";
import { CreateRSVPRepository } from "../../src/repository/RSVPRepository";

async function resetDatabase() {
  await prisma.rSVP.deleteMany();
  await prisma.event.deleteMany();
}

async function createTestEvent(overrides = {}) {
  return await prisma.event.create({
    data: {
      title: "Dashboard Test Event",
      description: "dashboard test event",
      location: "Campus Center",
      category: "social",
      status: "published",
      capacity: 100,
      startDatetime: new Date("2100-01-01T12:00:00"),
      endDatetime: new Date("2100-01-01T13:00:00"),
      organizerId: "user-staff",
      ...overrides,
    },
  });
}

describe("EventService My RSVPs Dashboard", () => {
  let eventRepo: ReturnType<typeof CreateEventRepository>;
  let rsvpRepo: ReturnType<typeof CreateRSVPRepository>;
  let service: ReturnType<typeof CreateEventService>;

  beforeEach(async () => {
    await resetDatabase();

    eventRepo = CreateEventRepository();
    rsvpRepo = CreateRSVPRepository();
    service = CreateEventService(eventRepo, rsvpRepo);
  });

  it("groups RSVP items into upcoming vs past/cancelled and sorts each section correctly", async () => {
    const laterFuture = await createTestEvent({
      title: "Later Future",
      description: "future event later",
      location: "Campus Center",
      category: "social",
      status: "published",
      startDatetime: new Date("2100-01-03T12:00:00"),
      endDatetime: new Date("2100-01-03T13:00:00"),
    });

    const soonerFuture = await createTestEvent({
      title: "Sooner Future",
      description: "future event sooner",
      location: "Student Union",
      category: "social",
      status: "published",
      startDatetime: new Date("2100-01-01T12:00:00"),
      endDatetime: new Date("2100-01-01T13:00:00"),
    });

    const oldPast = await createTestEvent({
      title: "Old Past",
      description: "past event",
      location: "Library",
      category: "academic",
      status: "published",
      startDatetime: new Date("2000-01-01T12:00:00"),
      endDatetime: new Date("2000-01-01T13:00:00"),
    });

    const cancelledFuture = await createTestEvent({
      title: "Cancelled Future",
      description: "cancelled event",
      location: "Fine Arts Center",
      category: "arts",
      status: "cancelled",
      startDatetime: new Date("2100-01-02T12:00:00"),
      endDatetime: new Date("2100-01-02T13:00:00"),
    });

    await service.createRSVP(laterFuture.id, "dashboard-user", "going");
    await service.createRSVP(soonerFuture.id, "dashboard-user", "waitlisted");
    await service.createRSVP(oldPast.id, "dashboard-user", "going");
    await service.createRSVP(cancelledFuture.id, "dashboard-user", "going");

    const result = await service.getUserDashboard("dashboard-user", "user");

    expect(result.ok).toBe(true);

    if (result.ok) {
      const upcomingTitles = result.value.upcoming.map((item) => item.event.title);
      const pastTitles = result.value.past.map((item) => item.event.title);

      expect(upcomingTitles).toEqual(["Sooner Future", "Later Future"]);
      expect(pastTitles).toEqual(["Cancelled Future", "Old Past"]);
    }
  });

  it("places cancelled RSVPs into the past section even when the event is still future", async () => {
    const event = await createTestEvent({
      title: "Future Cancelled RSVP",
      description: "future event with cancelled RSVP",
      location: "Campus Pond",
      category: "social",
      status: "published",
      startDatetime: new Date("2100-02-01T12:00:00"),
      endDatetime: new Date("2100-02-01T13:00:00"),
    });

    await service.createRSVP(event.id, "dashboard-user", "cancelled");

    const result = await service.getUserDashboard("dashboard-user", "user");

    expect(result.ok).toBe(true);

    if (result.ok) {
      const upcomingTitles = result.value.upcoming.map((item) => item.event.title);
      const pastTitles = result.value.past.map((item) => item.event.title);

      expect(upcomingTitles).not.toContain("Future Cancelled RSVP");
      expect(pastTitles).toContain("Future Cancelled RSVP");
    }
  });

  it("returns DashboardAccessError when a non-user role requests the dashboard", async () => {
    const result = await service.getUserDashboard("user-staff", "staff");

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.value.name).toBe("DashboardAccessError");
      expect(result.value.message).toBe("Dashboard only available to members");
    }
  });
});