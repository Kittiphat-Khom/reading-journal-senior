import { jest } from "@jest/globals";

// Set required env vars before importing any route (user.js crashes without JWT_SECRET)
process.env.JWT_SECRET = "test-secret";
process.env.BREVO_API_KEY = "test-key";
process.env.BREVO_SENDER_EMAIL = "test@test.com";

// Mock DB and email before importing routes
const mockQuery = jest.fn();
jest.unstable_mockModule("../db.js", () => ({ default: { query: mockQuery } }));
jest.unstable_mockModule("../lib/email.js", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  generateOtp: jest.fn().mockReturnValue({ otp: "123456", expire: new Date(Date.now() + 600000) }),
}));

import express from "express";
import request from "supertest";

const { default: userRoutes } = await import("../routes/user.js");
const { default: passwordRoutes } = await import("../routes/passwordRoutes.js");

const app = express();
app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api/users", passwordRoutes);

beforeEach(() => mockQuery.mockReset());

// ─── REGISTER ─────────────────────────────────────────────────────────────────

describe("POST /api/users/register", () => {
  test("returns 400 when fields are missing", async () => {
    const res = await request(app).post("/api/users/register").send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("All fields are required.");
  });

  test("returns 400 for invalid email format", async () => {
    const res = await request(app).post("/api/users/register")
      .send({ username: "john", email: "notanemail", password: "secret" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid email format.");
  });

  test("returns 409 when username/email already taken (verified)", async () => {
    mockQuery.mockResolvedValueOnce([[{ user_id: 1, username: "john", email: "john@test.com", is_verified: 1 }]]);
    const res = await request(app).post("/api/users/register")
      .send({ username: "john", email: "john@test.com", password: "secret" });
    expect(res.status).toBe(409);
  });

  test("returns 409 when username taken by different email (unverified)", async () => {
    mockQuery.mockResolvedValueOnce([[{ user_id: 1, username: "john", email: "other@test.com", is_verified: 0 }]]);
    const res = await request(app).post("/api/users/register")
      .send({ username: "john", email: "john@test.com", password: "secret" });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Username is already taken.");
  });

  test("returns 201 and sends OTP for new user", async () => {
    mockQuery.mockResolvedValueOnce([[]]); // no existing user
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]); // INSERT
    const res = await request(app).post("/api/users/register")
      .send({ username: "newuser", email: "new@test.com", password: "secret123" });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("OTP sent. Please check your email.");
  });

  test("returns 200 and resends OTP for unverified same email", async () => {
    mockQuery.mockResolvedValueOnce([[{ user_id: 1, username: "john", email: "john@test.com", is_verified: 0 }]]);
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE
    const res = await request(app).post("/api/users/register")
      .send({ username: "john", email: "john@test.com", password: "secret123" });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("OTP resent. Please check your email.");
  });
});

// ─── VERIFY OTP ───────────────────────────────────────────────────────────────

describe("POST /api/users/verify-otp", () => {
  test("returns 400 when fields are missing", async () => {
    const res = await request(app).post("/api/users/verify-otp").send({});
    expect(res.status).toBe(400);
  });

  test("returns 400 for invalid or expired OTP", async () => {
    mockQuery.mockResolvedValueOnce([[]]); // no matching user
    const res = await request(app).post("/api/users/verify-otp")
      .send({ email: "john@test.com", code: "000000" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid or expired code.");
  });

  test("returns 200 on valid OTP", async () => {
    mockQuery.mockResolvedValueOnce([[{ user_id: 1 }]]); // found user
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE
    const res = await request(app).post("/api/users/verify-otp")
      .send({ email: "john@test.com", code: "123456" });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Email verified successfully. You can now log in.");
  });
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────

describe("POST /api/users/login", () => {
  test("returns 401 when user not found", async () => {
    mockQuery.mockResolvedValueOnce([[]]); // no user
    const res = await request(app).post("/api/users/login")
      .send({ username: "ghost", password: "secret" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("User not found.");
  });

  test("returns 403 when email not verified", async () => {
    mockQuery.mockResolvedValueOnce([[{ user_id: 1, username: "john", pwd: "hashed", role: "user", is_verified: 0 }]]);
    const res = await request(app).post("/api/users/login")
      .send({ username: "john", password: "secret" });
    expect(res.status).toBe(403);
  });

  test("returns 401 for wrong password", async () => {
    mockQuery.mockResolvedValueOnce([[{ user_id: 1, username: "john", pwd: "$2b$10$invalidhash", role: "user", is_verified: 1 }]]);
    const res = await request(app).post("/api/users/login")
      .send({ username: "john", password: "wrongpassword" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid password.");
  });
});

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────

describe("POST /api/users/forgot-password", () => {
  test("returns 400 when email missing", async () => {
    const res = await request(app).post("/api/users/forgot-password").send({});
    expect(res.status).toBe(400);
  });

  test("returns 400 for invalid email format", async () => {
    const res = await request(app).post("/api/users/forgot-password")
      .send({ email: "notanemail" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid email format.");
  });

  test("returns 200 regardless of whether email exists (anti-enumeration)", async () => {
    mockQuery.mockResolvedValueOnce([[]]); // email not found
    const res = await request(app).post("/api/users/forgot-password")
      .send({ email: "ghost@test.com" });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain("If the email is registered");
  });
});
