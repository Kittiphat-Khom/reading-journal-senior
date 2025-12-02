import express from "express";
import db from "../db.js";
import jwt from "jsonwebtoken";

const router = express.Router();
const JWT_SECRET = "your_secret_key"; 

/* ===============================
   🛡️ Middleware: ตรวจสอบ Token
   =============================== */
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

/* ============================================================
   📚 SECTION: Journal Routes
   ============================================================ */

// 1. เพิ่ม Journal (แบบเต็ม - ใช้ในหน้า Add Journal ปกติ)
router.post("/add", verifyToken, async (req, res) => {
  try {
    const {
      title, author, genre, startdate, enddate, review,
      total_reading_time, star_point, spicy_point, drama_point, 
      book_image, platform, reading_log
    } = req.body;

    const user_id = req.user.id;
    const logData = reading_log || '[]';

    const sql = `
      INSERT INTO Journal (
        title, author, genre, startdate, enddate, review,
        total_reading_time, star_point, spicy_point, drama_point,
        book_image, user_id, platform, reading_log
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(sql, [
      title || null, author || null, genre || null,
      startdate || null, enddate || null, review || null,
      total_reading_time || "00:00:00",
      star_point ?? null, spicy_point ?? null, drama_point ?? null,
      book_image || null, user_id, platform || null, logData 
    ]);

    res.json({ message: "✅ Journal saved successfully!" });
  } catch (err) {
    console.error("❌ Error inserting journal:", err);
    res.status(500).json({ error: "Failed to save journal" });
  }
});

// 🔥 [NEW] เพิ่ม Journal จากหน้า Recommend (รับ user_id โดยตรง)
router.post("/add-by-id", async (req, res) => {
  try {
    const { user_id, title, author, genre, book_image } = req.body;

    // Validation เบื้องต้น
    if (!user_id || !title) {
        return res.status(400).json({ error: "Missing required fields (user_id, title)" });
    }

    // SQL Insert (กำหนดค่า Default ให้ field ที่ไม่ได้ส่งมา)
    const sql = `
      INSERT INTO Journal (
        user_id, title, author, genre, book_image,
        total_reading_time, reading_log, 
        star_point, spicy_point, drama_point, platform
      )
      VALUES (?, ?, ?, ?, ?, '00:00:00', '[]', 0, 0, 0, 'Paper')
    `;

    await db.query(sql, [
      user_id,
      title,
      author || "Unknown Genre",
      genre || null,
      book_image || null
    ]);

    res.json({ message: "✅ Book added to library successfully!" });
  } catch (err) {
    console.error("❌ Error adding book from library:", err);
    res.status(500).json({ error: "Failed to add book" });
  }
});

// 2. ดึงข้อมูลทั้งหมด
router.get("/", verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const [rows] = await db.query(
      "SELECT * FROM Journal WHERE user_id = ? ORDER BY id DESC",
      [user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching journals:", err);
    res.status(500).json({ error: "Failed to fetch journals" });
  }
});

// 3. ดึงข้อมูลตาม ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const [rows] = await db.query(
      "SELECT * FROM Journal WHERE id = ? AND user_id = ?",
      [req.params.id, user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Journal not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error fetching journal:", err);
    res.status(500).json({ error: "Failed to fetch journal" });
  }
});

// 4. แก้ไขข้อมูล (Update)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const {
      title, author, genre, startdate, enddate, review,
      total_reading_time, star_point, spicy_point, drama_point, 
      book_image, platform, reading_log
    } = req.body;

    const user_id = req.user.id;

    const sql = `
      UPDATE Journal
      SET title=?, author=?, genre=?, startdate=?, enddate=?, review=?,
          total_reading_time=?, star_point=?, spicy_point=?, drama_point=?, 
          book_image=?, platform=?, reading_log=?
      WHERE id=? AND user_id=?
    `;

    await db.query(sql, [
      title || null, author || null, genre || null,
      startdate || null, enddate || null, review || null,
      total_reading_time || null, star_point ?? null,
      spicy_point ?? null, drama_point ?? null,
      book_image || null, platform || null, reading_log || '[]',
      req.params.id, user_id
    ]);

    res.json({ message: "✏️ Journal updated successfully" });
  } catch (err) {
    console.error("❌ Error updating journal:", err);
    res.status(500).json({ error: "Failed to update journal" });
  }
});

// 5. ลบ Journal
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    await db.query("DELETE FROM Journal WHERE id = ? AND user_id = ?", [req.params.id, user_id]);
    res.json({ message: "🗑️ Journal deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting journal:", err);
    res.status(500).json({ error: "Failed to delete journal" });
  }
});

export default router;