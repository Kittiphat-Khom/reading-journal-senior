import express from "express";
import db from "../db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";

const router = express.Router();
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const resend = new Resend(process.env.RESEND_API_KEY);

// 🟢 1. ลืมรหัสผ่าน (Forgot Password)
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    // ใช้ db.query ได้เลย เพราะ db เป็น pool แล้ว
    const [users] = await db.query("SELECT * FROM User WHERE email = ?", [email]);
    
    if (users.length === 0) {
      // Security: ไม่ควรบอกว่าไม่มีอีเมลนี้ แต่บอกกลางๆ ว่า "ถ้ามี จะส่งลิงก์ไปให้"
      return res.json({ message: "If the email is registered, you will receive a reset link." });
    }

    const user = users[0];

    // สร้าง Token และวันหมดอายุ
    const token = crypto.randomBytes(32).toString("hex");
    const expireDate = new Date(Date.now() + 3600000); // +1 hour

    // อัปเดต Token ลง Database
    await db.query(
      "UPDATE User SET reset_token = ?, reset_token_expire = ? WHERE user_id = ?", 
      [token, expireDate, user.user_id] 
    );

    // ✅ แก้ไขตรงนี้: ใช้ BASE_URL แทน localhost
    const resetLink = `${BASE_URL}/reset-password?token=${token}`;

    res.json({ message: "If the email is registered, you will receive a reset link." });

    resend.emails.send({
      from: 'Reading Journal <onboarding@resend.dev>',
      to: email,
      subject: "Reset Your Password",
      html: `
        <h3>Password Reset Request</h3>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <br>
        <p><small>If you didn't request this, please ignore this email.</small></p>
      `
    }).catch(err => console.error("Email send failed (non-fatal):", err.message));

  } catch (error) {
    console.error("FORGOT-PASSWORD ERROR:", error); 
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 🟢 2. ตั้งรหัสผ่านใหม่ (Reset Password)
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Validation
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long." });
    }

    // ค้นหา User ด้วย Token ที่ยังไม่หมดอายุ
    const [users] = await db.query(
      "SELECT * FROM User WHERE reset_token = ? AND reset_token_expire > NOW()",
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = users[0];

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt); 

    // อัปเดต Password และล้าง Token
    await db.query(
      "UPDATE User SET pwd = ?, reset_token = NULL, reset_token_expire = NULL WHERE user_id = ?",
      [hashedPassword, user.user_id]
    );

    res.json({ message: "Password has been reset successfully" });

  } catch (error) {
    console.error("RESET-PASSWORD ERROR:", error);
    res.status(500).json({ message: "Server error during password reset." });
  }
});

export default router;