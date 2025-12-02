import express from "express";
import db from "../db.js";
import jwt from "jsonwebtoken";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

/* 🛡 Middleware ตรวจ token */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "No token provided" });

  try {
    const token = authHeader.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
}

/* ============================================================
   ❤️ SECTION: Favorites Routes
   ============================================================ */

// 1. 🔥 Toggle Favorite (เพิ่ม/ลบ รายการโปรด)
// backend/routes/favorites.js

// ... (ส่วนอื่นๆ เหมือนเดิม)

router.post("/toggle", async (req, res) => {
  try {
    // 1. ✅ รับ description เพิ่มมาจาก body
    const { user_id, title, author, genre, book_image, description } = req.body;

    if (!user_id || !title) {
        return res.status(400).json({ error: "Missing user_id or title" });
    }

    const checkSql = "SELECT favor_id FROM FAVORITE WHERE user_id = ? AND title = ?";
    const [existingRows] = await db.query(checkSql, [user_id, title]);

    if (existingRows.length > 0) {
        const favorId = existingRows[0].favor_id;
        await db.query("DELETE FROM FAVORITE WHERE favor_id = ?", [favorId]);
        return res.json({ status: "removed", message: "Removed from favorites" });

    } else {
        let shortGenre = genre;
        if (shortGenre && shortGenre.length > 100) shortGenre = shortGenre.substring(0, 100); 

        // 2. ✅ แก้ SQL Insert ให้มี description
        const insertSql = `
            INSERT INTO FAVORITE (user_id, title, author, genre, book_image, description)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        // 3. ✅ ใส่ตัวแปร description ลงไปใน array ตัวสุดท้าย
        await db.query(insertSql, [
            user_id, 
            title, 
            author || "Unknown", 
            shortGenre || "General", 
            book_image || "",
            description || "No description available." // ใส่ค่าตรงนี้
        ]);

        return res.json({ status: "added", message: "Added to favorites" });
    }

  } catch (err) {
    console.error("❌ Error toggling favorite:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// ... (ส่วนอื่นๆ เหมือนเดิม)

// 2. 📌 ดึงรายการ Favorite
router.get("/", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM FAVORITE WHERE user_id = ? ORDER BY favor_id DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching favorites:", err);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

// 3. 🗑️ ลบรายการ Favorite
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const favor_id = req.params.id; 
    const user_id = req.user.id; 

    const [result] = await db.query(
      "DELETE FROM FAVORITE WHERE favor_id = ? AND user_id = ?",
      [favor_id, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Favorite not found or unauthorized" });
    }

    res.json({ message: "🗑️ Deleted successfully" });
  } catch (err) {
    console.error("Error deleting favorite:", err);
    res.status(500).json({ error: "Failed to delete favorite" });
  }
});

export default router;