import express from "express";
import db from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();
const SECRET = "your-secret-key"; // ควรเก็บใน .env

// 🟢 ล็อกอิน
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const [users] = await db.query("SELECT * FROM User WHERE username = ?", [username]);
    if (users.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.pwd);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // ✅ สร้าง token
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: "1h" });

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// 🟢 ดึงข้อมูล user จาก token
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);

    const [users] = await db.query("SELECT id, username, email FROM User WHERE id = ?", [decoded.id]);
    if (users.length === 0) return res.status(404).json({ message: "User not found" });

    res.json(users[0]);
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

export default router;
