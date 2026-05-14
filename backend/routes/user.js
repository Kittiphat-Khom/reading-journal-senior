import express from "express";
import db from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

// ==========================================
// 🟢 1. สมัครสมาชิก (Register)
// ==========================================
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    const [existingUser] = await db.query(
      "SELECT * FROM User WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUser.length > 0) {
      const found = existingUser[0];
      // Already verified → reject
      if (found.is_verified === 1) {
        return res.status(409).json({ message: "Username or Email is already in use." });
      }
      // Unverified → allow re-register: delete old record so they can start fresh
      await db.query("DELETE FROM User WHERE user_id = ?", [found.user_id]);
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // สร้าง OTP 6 หลัก
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Insert ลงฐานข้อมูล
    await db.query(
      "INSERT INTO User (username, email, pwd, role, is_verified, verification_token) VALUES (?, ?, ?, 'user', 0, ?)",
      [username, email, hashedPassword, otp]
    );

    // DEV: log OTP to console
    console.log(`[OTP] ${email} → ${otp}`);

    try {
      await transporter.sendMail({
        from: `Reading Journal <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Reading Journal Verification Code',
        html: `
          <div style="font-family: sans-serif; max-width: 420px; margin: auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
            <h2 style="color: #1e293b; margin-bottom: 8px;">Welcome to Reading Journal!</h2>
            <p style="color: #475569;">Use the code below to verify your email address.</p>
            <div style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #2563eb; text-align: center; padding: 24px; background: #eff6ff; border-radius: 10px; margin: 24px 0;">
              ${otp}
            </div>
            <p style="color: #94a3b8; font-size: 13px;">If you didn't create an account, you can ignore this email.</p>
          </div>
        `
      });
    } catch (mailErr) {
      console.error("Email send failed (non-fatal):", mailErr.message);
    }

    res.status(201).json({ message: "Registration successful! Please enter the 6-digit code sent to your email." });

  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ==========================================
// 🟢 2. ยืนยันด้วย OTP 6 หลัก
// ==========================================
router.post("/verify-otp", async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ message: "Please enter your email and OTP code." });
        }

        const [users] = await db.query(
            "SELECT * FROM User WHERE email = ? AND verification_token = ?",
            [email, code]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: "Invalid OTP code. Please try again." });
        }

        await db.query(
            "UPDATE User SET is_verified = 1, verification_token = NULL WHERE user_id = ?",
            [users[0].user_id]
        );

        res.json({ message: "ยืนยันตัวตนสำเร็จ! คุณสามารถเข้าสู่ระบบได้แล้ว" });

    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ==========================================
// 🟢 2b. ยืนยันอีเมล (Link-based — legacy)
// ==========================================
router.post("/verify-email", async (req, res) => {
    try {
        const { token } = req.body;

        const [users] = await db.query("SELECT * FROM User WHERE verification_token = ?", [token]);

        if (users.length === 0) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        await db.query("UPDATE User SET is_verified = 1, verification_token = NULL WHERE user_id = ?", [users[0].user_id]);

        res.json({ message: "ยืนยันตัวตนสำเร็จ! คุณสามารถเข้าสู่ระบบได้แล้ว" });

    } catch (error) {
        console.error("Verify Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ==========================================
// 🟢 3. เข้าสู่ระบบ (Login)
// ==========================================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 1. หา User
    const [users] = await db.query("SELECT * FROM User WHERE username = ?", [username]);
    if (users.length === 0) return res.status(401).json({ message: "User not found." });

    const user = users[0];

    // 2. เช็คว่ายืนยันอีเมลหรือยัง
    if (user.is_verified === 0) {
        return res.status(403).json({ message: "กรุณายืนยันตัวตนผ่านอีเมลก่อนเข้าสู่ระบบ" });
    }

    // 3. เช็ค Password
    const isMatch = await bcrypt.compare(password, user.pwd);
    if (!isMatch) return res.status(401).json({ message: "Incorrect password." });

    // -----------------------------------------------------------------------
    // 🔥 CHECK PREFERENCES
    // -----------------------------------------------------------------------
    let hasPreferences = false;
    
    // ✅ ใช้ชื่อตาราง 'MPC' ตามรูปที่คุณส่งมา
    const tableName = "MPC"; 

    try {
        console.log(`🔍 Checking preferences for UserID: ${user.user_id} in table: ${tableName}`);
        
        const [prefs] = await db.query(
            `SELECT * FROM ${tableName} WHERE user_id = ?`, 
            [user.user_id]
        );

        if (prefs.length > 0) {
            console.log("✅ Found preferences data.");
            hasPreferences = true;
        } else {
            console.log("❌ No preferences data found.");
        }

    } catch (err) {
        console.error("💥 Error checking preferences:", err.message);
        hasPreferences = false; 
    }
    // -----------------------------------------------------------------------

    // 4. สร้าง Token
    const token = jwt.sign({ id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

    // 5. ส่ง Response
    res.json({ 
        message: "Login successful", 
        token, 
        user: { id: user.user_id, username: user.username, role: user.role },
        has_preferences: hasPreferences // ส่งค่านี้เพื่อให้ Frontend ตัดสินใจเปลี่ยนหน้า
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ==========================================
// 🟢 4. ดึงข้อมูลส่วนตัว (Me)
// ==========================================
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