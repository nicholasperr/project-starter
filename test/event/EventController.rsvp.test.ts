import request from "supertest";
import prisma from "../../src/prisma";
import { createComposedApp } from "../../src/composition";

async function resetDatabase() {
  await prisma.rSVP.deleteMany();
  await prisma.event.deleteMany();
}

async function createTestEvent(overrides = {}) {
  return await prisma.event.create({
    data: {
      title: "Controller Event",
      description: "Test",
      location: "Campus",
      category: "social",
      status: "published",
      capacity: 50,
      startDatetime: new Date("2100-01-01"),
      endDatetime: new Date("2100-01-02"),
      organizerId: "user-staff",
      ...overrides,
    },
  });
}

describe("RSVP HTTP Endpoint", () => {
  let app: any;

  beforeEach(async () => {
    await resetDatabase();
    app = createComposedApp().getExpressApp();
  });

  async function login(agent: any) {
    await agent.post("/login").type("form").send({
      email: "user@app.test",
      password: "password123",
    });
  }

  it("happy path", async () => {
    const event = await createTestEvent();

    const agent = request.agent(app);
    await login(agent);

    const res = await agent.post(`/events/${event.id}/rsvp`);
    expect(res.status).toBe(200);
  });
});