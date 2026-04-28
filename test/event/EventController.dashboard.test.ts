import request from "supertest";
import prisma from "../../src/prisma";
import { createComposedApp } from "../../src/composition";

async function resetDatabase() {
  await prisma.rSVP.deleteMany();
  await prisma.event.deleteMany();
}

async function createTestEvent() {
  return await prisma.event.create({
    data: {
      title: "Food Truck Festival",
      description: "Test",
      location: "Campus",
      category: "food",
      status: "published",
      capacity: 50,
      startDatetime: new Date("2100-01-01"),
      endDatetime: new Date("2100-01-02"),
      organizerId: "user-staff",
    },
  });
}

describe("Dashboard", () => {
  let app: any;

  beforeEach(async () => {
    await resetDatabase();
    app = createComposedApp().getExpressApp();
  });

  it("dashboard works", async () => {
    const event = await createTestEvent();

    const agent = request.agent(app);

    await agent.post("/login").type("form").send({
      email: "user@app.test",
      password: "password123",
    });

    await agent.post(`/events/${event.id}/rsvp`);

    const res = await agent.get("/my-rsvps");

    expect(res.text).toContain("Food Truck Festival");
  });
});