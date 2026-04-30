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
      title: "Food Truck Festival",
      description: "dashboard controller test event",
      location: "Campus Center",
      category: "food",
      status: "published",
      capacity: 50,
      startDatetime: new Date("2100-01-01T12:00:00"),
      endDatetime: new Date("2100-01-01T14:00:00"),
      organizerId: "user-staff",
      ...overrides,
    },
  });
}
async function loginAsUser(agent: ReturnType<typeof request.agent>) {
  await agent
    .post("/login")
    .type("form")
    .send({ email: "user@app.test", password: "password123" })
    .expect(302);

  await agent.get("/").expect(302);
}

async function loginAsStaff(agent: ReturnType<typeof request.agent>) {
  await agent
    .post("/login")
    .type("form")
    .send({ email: "staff@app.test", password: "password123" })
    .expect(302);

  await agent.get("/").expect(302);
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