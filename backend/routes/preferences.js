import express from "express";
import db from "../db.js";
import jwt from "jsonwebtoken";

const router = express.Router();
// ⚠️ ควรย้ายไปไว้ใน .env แต่ใส่ไว้ตรงนี้ก่อนเพื่อความง่าย
const JWT_SECRET = "your_secret_key"; 

// Middleware เช็ค Token
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
}

// ==========================================
// 📌 POST /save: บันทึกความชอบ
// ==========================================
router.post("/save", verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id; // หรือ req.user.userId แล้วแต่ตอน gen token

    // รับค่าจาก Frontend (ตั้งค่า default เป็น array ว่างไว้กัน Error)
    const {
      preferred_authors = [],
      preferred_genres = [],
      preferred_books = []
    } = req.body;

    // แปลง Array เป็น JSON String เพื่อเก็บลง MySQL
    const authorsJSON = JSON.stringify(preferred_authors);
    const genresJSON = JSON.stringify(preferred_genres);
    const booksJSON = JSON.stringify(preferred_books);

    // 🔥 ใช้ SQL ท่าไม้ตาย: "ถ้าไม่มีให้เพิ่ม ถ้ามีอยู่แล้วให้อัปเดต" (Upsert)
    const sql = `
      INSERT INTO MPC (user_id, preferred_authors, preferred_genres, preferred_books)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      preferred_authors = VALUES(preferred_authors),
      preferred_genres = VALUES(preferred_genres),
      preferred_books = VALUES(preferred_books)
    `;

    await db.execute(sql, [user_id, authorsJSON, genresJSON, booksJSON]);

    // ❌ ลบบรรทัด saveUserPreferences() ออกแล้ว เพราะไฟล์นั้นถูกลบไปแล้ว
    // ข้อมูลจะถูกดึงไปทำ CSV ตอนที่คุณรัน fetch_data.js เองทีหลัง

    console.log(`✅ Preferences saved for user ID: ${user_id}`);
    res.json({ success: true, message: "Preferences saved successfully" });

  } catch (err) {
    console.error("❌ Error saving preferences:", err);
    res.status(500).json({ error: "Failed to save preferences" });
  }
});

// ==========================================
// 📌 GET /: ดึงข้อมูลความชอบมาแสดง
// ==========================================
router.get("/", verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const [rows] = await db.execute(
      "SELECT * FROM MPC WHERE user_id = ? LIMIT 1",
      [user_id]
    );

    if (rows.length === 0) {
      return res.json({
        preferred_authors: [],
        preferred_genres: [],
        preferred_books: []
      });
    }

    const data = rows[0];

    // แปลง JSON String จาก Database กลับเป็น Array ส่งให้ Frontend
    res.json({
      preferred_authors: JSON.parse(data.preferred_authors || "[]"),
      preferred_genres: JSON.parse(data.preferred_genres || "[]"),
      preferred_books: JSON.parse(data.preferred_books || "[]")
    });

  } catch (err) {
    console.error("❌ Error fetching preferences:", err);
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

export default router;