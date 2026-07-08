const request = require("supertest");
const app = require("../src/app");
const db = require("../src/config/db");

describe("Auth", function () {
  beforeAll(async function () {
    await db.query("DELETE FROM users WHERE email = 'authtest_1@example.com'");
    await db.query("DELETE FROM organizations WHERE name = 'Auth Test Org'");
  });

  afterAll(async function () {
    await db.pool.end();
  });

  test("signup creates an org and admin user, returns a token", async function () {
    const res = await request(app).post("/auth/signup").send({
      orgName: "Auth Test Org",
      email: "authtest_1@example.com",
      password: "TestPass123!",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("admin");
    expect(res.body.organization.plan).toBe("free");
  });

  test("signup with a duplicate email is rejected", async function () {
    const res = await request(app).post("/auth/signup").send({
      orgName: "Another Org",
      email: "authtest_1@example.com",
      password: "TestPass123!",
    });

    expect(res.statusCode).toBe(409);
  });

  test("login with correct credentials succeeds", async function () {
    const res = await request(app).post("/auth/login").send({
      email: "authtest_1@example.com",
      password: "TestPass123!",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test("login with wrong password is rejected", async function () {
    const res = await request(app).post("/auth/login").send({
      email: "authtest_1@example.com",
      password: "WrongPassword",
    });

    expect(res.statusCode).toBe(401);
  });
});