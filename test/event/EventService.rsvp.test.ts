import prisma from "../../src/prisma";
import { CreateEventService } from "../../src/service/EventService";
import { CreateEventRepository } from "../../src/repository/EventRepository";
import { CreateRSVPRepository } from "../../src/repository/RSVPRepository";
import { Err } from "../../src/lib/result";
import { EventNotFound } from "../../src/lib/errors";

async function resetDatabase() {
  await prisma.rSVP.deleteMany();
  await prisma.event.deleteMany();
}

async function createTestEvent(overrides = {}) {
  return await prisma.event.create({
    data: {
      title: "Test RSVP Event",
      description: "Test event for RSVP",
      location: "Campus Center",
      category: "social",
      status: "published",
      capacity: 50,
      startDatetime: new Date("2100-01-01T12:00:00"),
      endDatetime: new Date("2100-01-01T14:00:00"),
      organizerId: "user-staff",
      ...overrides,
    },
  });
}

describe("EventService RSVP Toggle", () => {
  let eventRepo: ReturnType<typeof CreateEventRepository>;
  let rsvpRepo: ReturnType<typeof CreateRSVPRepository>;
  let service: ReturnType<typeof CreateEventService>;

  beforeEach(async () => {
    await resetDatabase();

    eventRepo = CreateEventRepository();
    rsvpRepo = CreateRSVPRepository();
    service = CreateEventService(eventRepo, rsvpRepo);
  });

  it("creates a new RSVP as going when capacity allows", async () => {
    const event = await createTestEvent();

    const result = await service.toggleRSVP(event.id, "user-1");

    expect(result.ok).toBe(true);

    const rsvps = await service.getRSVPsForEvent(event.id);
    expect(rsvps.ok).toBe(true);

    if (rsvps.ok) {
      const rsvp = rsvps.value.find((r) => r.userId === "user-1");
      expect(rsvp?.status).toBe("going");
    }
  });

  it("toggles an existing RSVP to cancelled", async () => {
    const event = await createTestEvent();

    await service.toggleRSVP(event.id, "user-1");
    const result = await service.toggleRSVP(event.id, "user-1");

    expect(result.ok).toBe(true);

    const rsvps = await service.getRSVPsForEvent(event.id);
    expect(rsvps.ok).toBe(true);

    if (rsvps.ok) {
      const rsvp = rsvps.value.find((r) => r.userId === "user-1");
      expect(rsvp?.status).toBe("cancelled");
    }
  });

  it("reactivates a cancelled RSVP", async () => {
    const event = await createTestEvent();

    await service.toggleRSVP(event.id, "user-1");
    await service.toggleRSVP(event.id, "user-1");
    const result = await service.toggleRSVP(event.id, "user-1");

    expect(result.ok).toBe(true);

    const rsvps = await service.getRSVPsForEvent(event.id);
    expect(rsvps.ok).toBe(true);

    if (rsvps.ok) {
      const rsvp = rsvps.value.find((r) => r.userId === "user-1");
      expect(rsvp?.status).toBe("going");
    }
  });

  it("puts user on waitlist when event is full", async () => {
    const event = await createTestEvent({ capacity: 50 });

    for (let i = 0; i < 50; i++) {
      await service.toggleRSVP(event.id, `user-${i}`);
    }

    const result = await service.toggleRSVP(event.id, "late-user");

    expect(result.ok).toBe(true);

    const rsvps = await service.getRSVPsForEvent(event.id);
    expect(rsvps.ok).toBe(true);

    if (rsvps.ok) {
      const rsvp = rsvps.value.find((r) => r.userId === "late-user");
      expect(rsvp?.status).toBe("waitlisted");
    }
  });

  it("rejects RSVP for cancelled events", async () => {
    const event = await createTestEvent({ status: "cancelled" });

    const result = await service.toggleRSVP(event.id, "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("This event has been cancelled");
    }
  });

  it("rejects RSVP for past events", async () => {
    const event = await createTestEvent({
      startDatetime: new Date("2000-01-01T12:00:00"),
      endDatetime: new Date("2000-01-01T14:00:00"),
    });

    const result = await service.toggleRSVP(event.id, "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Event already started");
    }
  });

  it("passes through repository error when create fails", async () => {
    const event = await createTestEvent();

    jest.spyOn(rsvpRepo, "findByIds").mockResolvedValue(Err(EventNotFound("RSVP not found")));
    jest.spyOn(rsvpRepo, "create").mockResolvedValue(Err(EventNotFound("Injected error")));

    const result = await service.toggleRSVP(event.id, "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventNotFound");
      expect(result.value.message).toBe("Injected error");
    }
  });
});