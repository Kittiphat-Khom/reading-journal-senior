import express from "express";
import db from "../db.js";
import bcrypt from "bcryptjs";
import { sendEmail, generateOtp } from "../lib/email.js";

const router = express.Router();

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const [users] = await db.query("SELECT user_id FROM User WHERE email = ?", [email]);

    // Always respond the same way to prevent email enumeration
    res.json({ message: "If the email is registered, you will receive an OTP." });

    if (users.length === 0) return;

    const { otp, expire } = generateOtp();
    await db.query(
      "UPDATE User SET reset_token = ?, reset_token_expire = ? WHERE user_id = ?",
      [otp, expire, users[0].user_id]
    );

    sendEmail({
      to: email,
      subject: "Your Password Reset OTP",
      html: `
        <h3>Password Reset OTP</h3>
        <p>Your one-time password is:</p>
        <h1 style="letter-spacing: 8px; color: #3b82f6;">${otp}</h1>
        <p>This OTP expires in <strong>10 minutes</strong>.</p>
        <p><small>If you didn't request this, please ignore this email.</small></p>
      `,
    }).catch(err => console.error("Email send failed:", err.message));

  } catch (error) {
    console.error("Forgot-password error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long." });
    }

    const [users] = await db.query(
      "SELECT user_id FROM User WHERE email = ? AND reset_token = ? AND reset_token_expire > NOW()",
      [email, otp]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.query(
      "UPDATE User SET pwd = ?, reset_token = NULL, reset_token_expire = NULL WHERE user_id = ?",
      [hashedPassword, users[0].user_id]
    );

    res.json({ message: "Password has been reset successfully." });

  } catch (error) {
    console.error("Reset-password error:", error);
    res.status(500).json({ message: "Server error during password reset." });
  }
});

export default router;
