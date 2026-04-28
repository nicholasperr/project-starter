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
      title: "RSVP Test Event",
      description: "Test",
      location: "Campus",
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
  let service: ReturnType<typeof CreateEventService>;

  beforeEach(async () => {
    await resetDatabase();
    service = CreateEventService(CreateEventRepository(), CreateRSVPRepository());
  });

  it("creates a new RSVP as going when capacity allows", async () => {
    const event = await createTestEvent();

    const result = await service.toggleRSVP(event.id, "user-1");
    expect(result.ok).toBe(true);
  });

  it("toggles an existing RSVP to cancelled", async () => {
    const event = await createTestEvent();

    await service.toggleRSVP(event.id, "user-1");
    const result = await service.toggleRSVP(event.id, "user-1");

    expect(result.ok).toBe(true);
  });

  it("reactivates a cancelled RSVP", async () => {
    const event = await createTestEvent();

    await service.toggleRSVP(event.id, "user-1");
    await service.toggleRSVP(event.id, "user-1");
    const result = await service.toggleRSVP(event.id, "user-1");

    expect(result.ok).toBe(true);
  });

  it("puts user on waitlist when event is full", async () => {
    const event = await createTestEvent({ capacity: 1 });

    await service.toggleRSVP(event.id, "user-1");
    const result = await service.toggleRSVP(event.id, "late-user");

    expect(result.ok).toBe(true);
  });

  it("rejects RSVP for cancelled events", async () => {
    const event = await createTestEvent({ status: "cancelled" });

    const result = await service.toggleRSVP(event.id, "user-1");

    expect(result.ok).toBe(false);
  });

  it("rejects RSVP for past events", async () => {
    const event = await createTestEvent({
      startDatetime: new Date("2000-01-01"),
      endDatetime: new Date("2000-01-02"),
    });

    const result = await service.toggleRSVP(event.id, "user-1");

    expect(result.ok).toBe(false);
  });
});