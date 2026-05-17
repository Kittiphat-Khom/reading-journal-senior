import express from "express";
import db from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendEmail, generateOtp } from "../lib/email.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET env var is required");

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const [existing] = await db.query(
      "SELECT user_id, username, email, is_verified FROM User WHERE username = ? OR email = ?",
      [username, email]
    );

    const conflict = existing[0];
    if (conflict) {
      if (conflict.is_verified === 1) {
        return res.status(409).json({ message: "Username or Email is already taken." });
      }
      // Unverified with a different email means only the username matched
      if (conflict.email !== email) {
        return res.status(409).json({ message: "Username is already taken." });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const { otp, expire } = generateOtp();

    if (conflict) {
      await db.query(
        "UPDATE User SET username = ?, pwd = ?, reset_token = ?, reset_token_expire = ? WHERE email = ?",
        [username, hashedPassword, otp, expire, email]
      );
      res.status(200).json({ message: "OTP resent. Please check your email." });
    } else {
      await db.query(
        "INSERT INTO User (username, email, pwd, role, is_verified, reset_token, reset_token_expire) VALUES (?, ?, ?, 'user', 0, ?, ?)",
        [username, email, hashedPassword, otp, expire]
      );
      res.status(201).json({ message: "OTP sent. Please check your email." });
    }

    sendEmail({
      to: email,
      subject: "Your Email Verification Code",
      html: `<h3>Email Verification</h3><p>Your verification code is:</p><h1 style="letter-spacing:8px;color:#3b82f6;">${otp}</h1><p>Expires in <strong>10 minutes</strong>.</p>`,
    }).catch(err => console.error("Email send failed:", err.message));

  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required." });
    }
    const [users] = await db.query(
      "SELECT user_id FROM User WHERE email = ? AND reset_token = ? AND reset_token_expire > NOW() AND is_verified = 0",
      [email, code]
    );
    if (users.length === 0) {
      return res.status(400).json({ message: "Invalid or expired code." });
    }
    await db.query(
      "UPDATE User SET is_verified = 1, reset_token = NULL, reset_token_expire = NULL WHERE user_id = ?",
      [users[0].user_id]
    );
    res.json({ message: "Email verified successfully. You can now log in." });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const [users] = await db.query("SELECT user_id, username, pwd, role, is_verified FROM User WHERE username = ?", [username]);
    if (users.length === 0) return res.status(401).json({ message: "User not found." });

    const user = users[0];

    if (user.is_verified === 0) {
      return res.status(403).json({ message: "Please verify your email before logging in." });
    }

    const isMatch = await bcrypt.compare(password, user.pwd);
    if (!isMatch) return res.status(401).json({ message: "Invalid password." });

    let hasPreferences = false;
    try {
      const [prefs] = await db.query("SELECT 1 FROM MPC WHERE user_id = ? LIMIT 1", [user.user_id]);
      hasPreferences = prefs.length > 0;
    } catch {
      hasPreferences = false;
    }

    const token = jwt.sign({ id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

    res.json({
      message: "Login successful",
      token,
      user: { id: user.user_id, username: user.username, role: user.role },
      has_preferences: hasPreferences,
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const [users] = await db.query(
      "SELECT user_id, username, email, role FROM User WHERE user_id = ?",
      [decoded.id]
    );

    if (users.length === 0) return res.status(404).json({ message: "User not found" });

    res.json(users[0]);

  } catch (error) {
    console.error("Me Error:", error);
    res.status(500).json({ message: "Invalid token" });
  }
});

export default router;
