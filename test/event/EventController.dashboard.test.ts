import request from "supertest";
import { createComposedApp } from "../../src/composition";

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

describe("My RSVPs Dashboard HTTP", () => {
  let app: ReturnType<ReturnType<typeof createComposedApp>["getExpressApp"]>;

  beforeEach(() => {
    const composed = createComposedApp();
    app = composed.getExpressApp();
  });

  it("allows a member user to view the RSVP dashboard", async () => {
    const agent = request.agent(app);
    await loginAsUser(agent);

    const res = await agent.get("/my-rsvps");

    expect(res.status).toBe(200);
    expect(res.text).toContain("My RSVPs");
  });

  it("blocks staff from viewing the RSVP dashboard", async () => {
    const agent = request.agent(app);
    await loginAsStaff(agent);

    const res = await agent.get("/my-rsvps");

    expect(res.status).toBe(403);
    expect(res.text).toContain("Dashboard only available to members");
  });

  it("updates a dashboard row inline when cancelling an RSVP via HTMX", async () => {
    const agent = request.agent(app);
    await loginAsUser(agent);

    await agent.post("/events/5/rsvp").expect(200);

    const dashboardBefore = await agent.get("/my-rsvps");
    expect(dashboardBefore.status).toBe(200);
    expect(dashboardBefore.text).toContain("CS Research Symposium");

    const res = await agent
      .post("/events/5/rsvp")
      .set("HX-Request", "true")
      .type("form")
      .send({ context: "dashboard" });

    expect(res.status).toBe(200);
    expect(res.text).toContain("RSVP cancelled");
  });
});