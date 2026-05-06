import prisma from "../../src/prisma";
import { CreateEventService } from "../../src/service/EventService";
import { CreateEventRepository } from "../../src/repository/EventRepository";
import { CreateRSVPRepository } from "../../src/repository/RSVPRepository";
import { CreateInMemoryUserRepository } from "../../src/auth/InMemoryUserRepository";
import "dotenv/config";


async function resetDatabase() {
    await prisma.rSVP.deleteMany();
    await prisma.event.deleteMany();
}

async function createTestEvent(overrides = {}) {
    return await prisma.event.create({
        data: {
            title: "Spring Concert",
            description: "A concert with live music",
            location: "Campus Hall",
            category: "music",
            status: "published",
            capacity: 100,
            startDatetime: new Date("2100-01-01T12:00:00"),
            endDatetime: new Date("2100-01-01T14:00:00"),
            organizerId: "user-staff",
            ...overrides,
        },
    });
}

describe("EventService", () => {
    let eventService: ReturnType<typeof CreateEventService>;

    beforeEach(async () => {
        await resetDatabase();

        await createTestEvent();

        await createTestEvent({
            title: "Soccer Game",
            description: "Sports event",
            location: "Main Field",
            category: "sports",
            startDatetime: new Date("2100-01-02T12:00:00"),
            endDatetime: new Date("2100-01-02T14:00:00"),
        });

        eventService = CreateEventService(CreateEventRepository(), CreateRSVPRepository(), CreateInMemoryUserRepository());
    });

    it("Passes a valid query string that matches an event and returns the results.", async () => {
        const result = await eventService.searchEvents("concert");

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.length).toBeGreaterThan(0);
        }
    });

    it("Rejects an invalid query string and returns an error message.", async () => {
        const result = await eventService.searchEvents(" ");

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.value.name).toBe("Invalid Input");
            expect(result.value.message).toBe("Query entered cannot be only whitespace");
        }
    });

    it("Passes an empty query string and displays all upcoming events.", async () => {
        const result = await eventService.searchEvents("");

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.length).toBeGreaterThan(0);
        }
    });

    it("Passes a valid category that matches one or more events and returns the results.", async () => {
        const result = await eventService.getFilteredEvents("music");

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.length).toBeGreaterThan(0);
            expect(result.value.every(e => e.category === "music")).toBe(true);
        }
    });

    it("Passes a valid timeframe that matches one or more events and returns the results.", async () => {
        const result = await eventService.getFilteredEvents(undefined, "all_upcoming");
        const today = new Date();

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.length).toBeGreaterThan(0);
            expect(result.value.every(e => e.startDatetime >= today)).toBe(true);
        }
    });

    it("Passes a valid category and timeframe that matches one or more events and returns the results.", async () => {
        const result = await eventService.getFilteredEvents("sports", "all_upcoming");
        const today = new Date();

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.length).toBeGreaterThan(0);
            expect(result.value.every(e => e.category === "sports" && e.startDatetime >= today)).toBe(true);
        }
    });

    it("Rejects an invalid category and returns an error message.", async () => {
        const result = await eventService.getFilteredEvents("invalidcategory" as any);

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.value.name).toBe("Invalid Input");
            expect(result.value.message).toBe("Category entered is not valid.");
        }
    });

    it("Rejects an invalid timeframe and returns an error message.", async () => {
        const result = await eventService.getFilteredEvents(undefined, "invalidtimeframe" as any);

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.value.name).toBe("Invalid Input");
            expect(result.value.message).toBe("Timeframe entered is not valid");
        }
    });

    it("Returns an empty list when no events match the selected category.", async () => {
        const result = await eventService.getFilteredEvents("networking");

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.length).toBe(0);
        }
    });

    it("Returns an empty list when no events match the selected timeframe.", async () => {
        const result = await eventService.getFilteredEvents(undefined, "this_week");

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.length).toBe(0);
        }
    });

    it("Returns an empty list when a query does not match any events.", async () => {
        const result = await eventService.searchEvents("abcdefg");

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.length).toBe(0);
        }
    });
});