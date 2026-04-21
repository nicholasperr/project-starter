import { CreateEventService } from "../../src/service/EventService";
import { CreateEventRepository } from "../../src/repository/EventRepository";
import { CreateRSVPRepository } from "../../src/repository/RSVPRepository";

async function makeEventFuture(service: ReturnType<typeof CreateEventService>, eventId: number) {
  const eventResult = await service.getEventById(eventId);
  if (eventResult.ok) {
    eventResult.value.startDatetime = new Date("2100-01-01T12:00:00");
    eventResult.value.endDatetime = new Date("2100-01-01T14:00:00");
    eventResult.value.status = "published";
  }
}

describe("EventService RSVP Toggle", () => {
  let service: ReturnType<typeof CreateEventService>;

  beforeEach(() => {
    const eventRepo = CreateEventRepository();
    const rsvpRepo = CreateRSVPRepository();
    service = CreateEventService(eventRepo, rsvpRepo);
  });

  it("creates a new RSVP as going when capacity allows", async () => {
    await makeEventFuture(service, 1);

    const result = await service.toggleRSVP(1, "user-1");

    expect(result.ok).toBe(true);

    const rsvps = await service.getRSVPsForEvent(1);
    expect(rsvps.ok).toBe(true);

    if (rsvps.ok) {
      const rsvp = rsvps.value.find((r) => r.userId === "user-1");
      expect(rsvp?.status).toBe("going");
    }
  });

  it("toggles an existing RSVP to cancelled", async () => {
    await makeEventFuture(service, 1);

    await service.toggleRSVP(1, "user-1");
    const result = await service.toggleRSVP(1, "user-1");

    expect(result.ok).toBe(true);

    const rsvps = await service.getRSVPsForEvent(1);
    expect(rsvps.ok).toBe(true);

    if (rsvps.ok) {
      const rsvp = rsvps.value.find((r) => r.userId === "user-1");
      expect(rsvp?.status).toBe("cancelled");
    }
  });

  it("reactivates a cancelled RSVP", async () => {
    await makeEventFuture(service, 1);

    await service.toggleRSVP(1, "user-1");
    await service.toggleRSVP(1, "user-1");
    const result = await service.toggleRSVP(1, "user-1");

    expect(result.ok).toBe(true);

    const rsvps = await service.getRSVPsForEvent(1);
    expect(rsvps.ok).toBe(true);

    if (rsvps.ok) {
      const rsvp = rsvps.value.find((r) => r.userId === "user-1");
      expect(rsvp?.status).toBe("going");
    }
  });

  it("puts user on waitlist when event is full", async () => {
    await makeEventFuture(service, 1);

    for (let i = 0; i < 50; i++) {
      await service.toggleRSVP(1, `user-${i}`);
    }

    const result = await service.toggleRSVP(1, "late-user");

    expect(result.ok).toBe(true);

    const rsvps = await service.getRSVPsForEvent(1);
    expect(rsvps.ok).toBe(true);

    if (rsvps.ok) {
      const rsvp = rsvps.value.find((r) => r.userId === "late-user");
      expect(rsvp?.status).toBe("waitlisted");
    }
  });

  it("rejects RSVP for cancelled events", async () => {
    await makeEventFuture(service, 1);
    await service.cancelEvent(1, "user-staff", "admin");

    const result = await service.toggleRSVP(1, "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("This event has been cancelled");
    }
  });

  it("rejects RSVP for past events", async () => {
    const eventResult = await service.getEventById(1);
    if (eventResult.ok) {
      eventResult.value.startDatetime = new Date("2000-01-01T12:00:00");
      eventResult.value.endDatetime = new Date("2000-01-01T14:00:00");
      eventResult.value.status = "published";
    }

    const result = await service.toggleRSVP(1, "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Event already started");
    }
  });
});