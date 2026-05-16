import express from "express";
import db from "../db.js"; 
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

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

// ==========================================
// 🟢 1. สมัครสมาชิก (Register)
// ==========================================
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const [existingUser] = await db.query(
      "SELECT * FROM User WHERE username = ? OR email = ?", 
      [username, email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Username or Email is already taken." });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // สร้าง Verification Token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Insert ลงฐานข้อมูล
    await db.query(
      "INSERT INTO User (username, email, pwd, role, is_verified, verification_token) VALUES (?, ?, ?, 'user', 0, ?)",
      [username, email, hashedPassword, verificationToken]
    );

    // ✅ แก้ไขตรงนี้: ใช้ BASE_URL แทน localhost
    const verifyUrl = `${BASE_URL}/verify-email.html?token=${verificationToken}`; 

    res.status(201).json({ message: "Registered successfully! Please check your email to verify your account before logging in." });

    sendEmail({
      to: email,
      subject: "Confirm your Registration",
      html: `
        <h2>Welcome to Reading Journal!</h2>
        <p>Please click the link below to verify your email address and activate your account:</p>
        <a href="${verifyUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>Or copy this link: ${verifyUrl}</p>
      `,
    }).catch(err => console.error("Email send failed:", err.message));

  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ==========================================
// 🟢 2. ยืนยันอีเมล (Verify Email)
// ==========================================
router.post("/verify-email", async (req, res) => {
    try {
        const { token } = req.body;

        const [users] = await db.query("SELECT * FROM User WHERE verification_token = ?", [token]);

        if (users.length === 0) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        // อัปเดตสถานะเป็นยืนยันแล้ว และลบ Token ออก
        await db.query("UPDATE User SET is_verified = 1, verification_token = NULL WHERE user_id = ?", [users[0].user_id]);

        res.json({ message: "Email verified successfully. You can now log in." });

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
        return res.status(403).json({ message: "Please verify your email before logging in." });
    }

    // 3. เช็ค Password
    const isMatch = await bcrypt.compare(password, user.pwd);
    if (!isMatch) return res.status(401).json({ message: "Invalid password." });

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