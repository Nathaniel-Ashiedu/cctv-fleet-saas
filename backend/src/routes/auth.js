const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();

// POST /auth/signup
// Creates a new organization AND its first admin user in one step.
router.post("/signup", async function (req, res) {
  const { orgName, email, password } = req.body;

  if (!orgName || !email || !password) {
    return res.status(400).json({ error: "orgName, email, and password are required" });
  }

  try {
    // Check if email is already taken
    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create the organization
    const orgResult = await db.query(
      "INSERT INTO organizations (name) VALUES ($1) RETURNING id, name, plan",
      [orgName]
    );
    const org = orgResult.rows[0];

    // Create the first user as admin of that org
    const userResult = await db.query(
      "INSERT INTO users (org_id, email, password_hash, role) VALUES ($1, $2, $3, 'admin') RETURNING id, email, role, org_id",
      [org.id, email, passwordHash]
    );
    const user = userResult.rows[0];

    const token = jwt.sign(
      { userId: user.id, orgId: user.org_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token: token, user: user, organization: org });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed", message: err.message });
  }
});

// POST /auth/login
router.post("/login", async function (req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const result = await db.query(
      "SELECT id, org_id, email, password_hash, role FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, orgId: user.org_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token: token,
      user: { id: user.id, email: user.email, role: user.role, orgId: user.org_id },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed", message: err.message });
  }
});

module.exports = router;