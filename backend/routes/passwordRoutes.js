import express from "express";
import db from "../db.js";
import bcrypt from "bcryptjs";

const router = express.Router();

async function sendEmail({ to, subject, html }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: "Reading Journal", email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo error ${res.status}: ${text}`);
  }
}

// 1. Forgot Password — generate 6-digit OTP
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const [users] = await db.query("SELECT * FROM User WHERE email = ?", [email]);

    if (users.length === 0) {
      return res.json({ message: "If the email is registered, you will receive an OTP." });
    }

    const user = users[0];
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expireDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.query(
      "UPDATE User SET reset_token = ?, reset_token_expire = ? WHERE user_id = ?",
      [otp, expireDate, user.user_id]
    );

    res.json({ message: "If the email is registered, you will receive an OTP." });

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
    console.error("FORGOT-PASSWORD ERROR:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 2. Reset Password — verify OTP + email, then set new password
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
      "SELECT * FROM User WHERE email = ? AND reset_token = ? AND reset_token_expire > NOW()",
      [email, otp]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    const user = users[0];
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.query(
      "UPDATE User SET pwd = ?, reset_token = NULL, reset_token_expire = NULL WHERE user_id = ?",
      [hashedPassword, user.user_id]
    );

    res.json({ message: "Password has been reset successfully." });

  } catch (error) {
    console.error("RESET-PASSWORD ERROR:", error);
    res.status(500).json({ message: "Server error during password reset." });
  }
});

export default router;
