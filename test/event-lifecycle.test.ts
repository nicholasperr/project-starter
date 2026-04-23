import request from "supertest";
import { createComposedApp } from "../src/composition";

describe("Feature 5 - Event Publishing and Cancellation", () => {
  let app: any;
  let agent: any;

  beforeEach(() => {
    app = createComposedApp();
    agent = request.agent(app.getExpressApp());
  });

  async function loginAs(email: string, password: string) {
    await agent.post("/login").type("form").send({
      email,
      password,
    });
  }

  test("organizer can publish a draft event", async () => {
    await loginAs("staff@app.test", "password123");

    const res = await agent
      .post("/events/2/publish")
      .set("HX-Request", "true");

    expect(res.status).toBe(200);
    expect(res.text).toContain("published");
  });

  test("organizer cannot publish an already published event", async () => {
    await loginAs("staff@app.test", "password123");

    const res = await agent
      .post("/events/1/publish")
      .set("HX-Request", "true");

    expect(res.status).toBe(409);
    expect(res.text).toContain("Only draft events can be published");
  });

  test("unauthorized member cannot publish a draft event", async () => {
    await loginAs("user@app.test", "password123");

    const res = await agent
      .post("/events/2/publish")
      .set("HX-Request", "true");

    expect(res.status).toBe(403);
    expect(res.text).toContain("You are not allowed to publish this event");
  });

  test("organizer can cancel a published event", async () => {
    await loginAs("staff@app.test", "password123");

    const res = await agent
      .post("/events/1/cancel")
      .set("HX-Request", "true");

    expect(res.status).toBe(200);
    expect(res.text).toContain("cancelled");
  });

  test("admin can cancel any published event", async () => {
    await loginAs("admin@app.test", "password123");

    const res = await agent
      .post("/events/1/cancel")
      .set("HX-Request", "true");

    expect(res.status).toBe(200);
    expect(res.text).toContain("cancelled");
  });

  test("cannot cancel a draft event", async () => {
    await loginAs("staff@app.test", "password123");

    const res = await agent
      .post("/events/2/cancel")
      .set("HX-Request", "true");

    expect(res.status).toBe(409);
    expect(res.text).toContain("Only published events can be cancelled");
  });

  test("member cannot cancel a published event", async () => {
    await loginAs("user@app.test", "password123");

    const res = await agent
      .post("/events/1/cancel")
      .set("HX-Request", "true");

    expect(res.status).toBe(403);
    expect(res.text).toContain("You are not allowed to cancel this event");
  });

  test("missing event returns 404 for publish", async () => {
    await loginAs("staff@app.test", "password123");

    const res = await agent
      .post("/events/999/publish")
      .set("HX-Request", "true");

    expect(res.status).toBe(404);
    expect(res.text).toContain("Event not found");
  });
});