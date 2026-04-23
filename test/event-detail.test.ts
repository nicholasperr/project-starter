import request from "supertest";
import { createComposedApp } from "../src/composition";

describe("Feature 2 - Event Detail", () => {
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

  test("published event loads for authenticated user", async () => {
    await loginAs("user@app.test", "password123");

    const res = await agent.get("/events/1");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Campus Concert");
  });

  test("missing event returns 404", async () => {
    await loginAs("user@app.test", "password123");

    const res = await agent.get("/events/999");

    expect(res.status).toBe(404);
    expect(res.text).toContain("Event not found");
  });

  test("draft visible to organizer", async () => {
    await loginAs("staff@app.test", "password123");

    const res = await agent.get("/events/2");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Draft Planning Meeting");
  });

  test("draft visible to admin", async () => {
    await loginAs("admin@app.test", "password123");

    const res = await agent.get("/events/2");

    expect(res.status).toBe(200);
  });

  test("draft hidden from normal member", async () => {
    await loginAs("user@app.test", "password123");

    const res = await agent.get("/events/2");

    expect(res.status).toBe(404);
  });
});