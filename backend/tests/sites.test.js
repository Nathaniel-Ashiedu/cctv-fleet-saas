const request = require("supertest");
const app = require("../src/app");
const db = require("../src/config/db");

describe("Sites — tenant isolation and plan limits", function () {
  let tokenOrgA;
  let tokenOrgB;
  let orgASiteId;

  beforeAll(async function () {
    // Delete only this file's own data, not a global truncate —
    // avoids clobbering data created by other test files running in the same DB.
    await db.query("DELETE FROM users WHERE email LIKE 'sitestest_%'");
    await db.query(
      "DELETE FROM organizations WHERE name IN ('Sites Test Org A', 'Sites Test Org B')"
    );

    const signupA = await request(app).post("/auth/signup").send({
      orgName: "Sites Test Org A",
      email: "sitestest_orga@example.com",
      password: "TestPass123!",
    });
    tokenOrgA = signupA.body.token;

    const signupB = await request(app).post("/auth/signup").send({
      orgName: "Sites Test Org B",
      email: "sitestest_orgb@example.com",
      password: "TestPass123!",
    });
    tokenOrgB = signupB.body.token;
  });

  afterAll(async function () {
    await db.pool.end();
  });

  test("free plan allows creating exactly 1 site", async function () {
    const res = await request(app)
      .post("/sites")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .send({ name: "Org A HQ" });

    expect(res.statusCode).toBe(201);
    orgASiteId = res.body.id;
  });

  test("free plan blocks a 2nd site with 403", async function () {
    const res = await request(app)
      .post("/sites")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .send({ name: "Org A Second Site" });

    expect(res.statusCode).toBe(403);
    expect(res.body.limitReached).toBe(true);
  });

  test("Org B cannot view Org A's site by ID", async function () {
    const res = await request(app)
      .get(`/sites/${orgASiteId}`)
      .set("Authorization", `Bearer ${tokenOrgB}`);

    expect(res.statusCode).toBe(404);
  });

  test("requests without a token are rejected", async function () {
    const res = await request(app).get("/sites");
    expect(res.statusCode).toBe(401);
  });
});