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
      title: "Controller RSVP Event",
      description: "controller rsvp test event",
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

async function loginAsUser(agent: ReturnType<typeof request.agent>) {
  await agent
    .post("/login")
    .type("form")
    .send({ email: "user@app.test", password: "password123" })
    .expect(302);

  await agent.get("/").expect(302);
}

async function loginAsAdmin(agent: ReturnType<typeof request.agent>) {
  await agent
    .post("/login")
    .type("form")
    .send({ email: "admin@app.test", password: "password123" })
    .expect(302);

  await agent.get("/").expect(302);
}

describe("RSVP HTTP Endpoint", () => {
  let app: ReturnType<ReturnType<typeof createComposedApp>["getExpressApp"]>;

  beforeEach(async () => {
    await resetDatabase();

    const composed = createComposedApp();
    app = composed.getExpressApp();
  });

  it("returns 401 when not logged in", async () => {
    const event = await createTestEvent();

    const res = await request(app).post(`/events/${event.id}/rsvp`);

    expect(res.status).toBe(401);
    expect(res.text).toContain("Please log in to continue.");
  });

  it("happy path: RSVP succeeds for a future published event", async () => {
    const event = await createTestEvent();

    const agent = request.agent(app);
    await loginAsUser(agent);

    const res = await agent.post(`/events/${event.id}/rsvp`);

    expect(res.status).toBe(200);
    expect(res.text).toContain("Cancel RSVP");
    expect(res.text).toContain("You are going to this event.");
  });

  it("edge case: second toggle cancels the RSVP", async () => {
    const event = await createTestEvent();

    const agent = request.agent(app);
    await loginAsUser(agent);

    await agent.post(`/events/${event.id}/rsvp`).expect(200);
    const res = await agent.post(`/events/${event.id}/rsvp`);

    expect(res.status).toBe(200);
    expect(res.text).toContain("RSVP");
    expect(res.text).toContain("Your RSVP is currently cancelled.");
  });

  it("returns an inline error when the event has already started", async () => {
    const event = await createTestEvent({
      startDatetime: new Date("2020-01-01T18:00:00"),
      endDatetime: new Date("2020-01-01T21:00:00"),
    });

    const agent = request.agent(app);
    await loginAsUser(agent);

    const res = await agent.post(`/events/${event.id}/rsvp`);

    expect(res.status).toBe(200);
    expect(res.text).toContain("Event already started");
  });

  it("returns an inline error when the event has been cancelled", async () => {
    const event = await createTestEvent();

    const adminAgent = request.agent(app);
    await loginAsAdmin(adminAgent);

    await adminAgent.post(`/events/${event.id}/cancel`).expect(302);

    const userAgent = request.agent(app);
    await loginAsUser(userAgent);

    const res = await userAgent.post(`/events/${event.id}/rsvp`);

    expect(res.status).toBe(200);
    expect(res.text).toContain("This event has been cancelled");
  });
});