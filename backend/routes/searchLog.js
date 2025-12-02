import express from "express";
import db from "../db.js"; 

// 🔥 แก้ตรงนี้: เปลี่ยน r เล็ก เป็น R ใหญ่
const router = express.Router(); 

// API: POST /api/search/log
router.post("/log", async (req, res) => {
  try {
    const { user_id, query } = req.body;

    if (!user_id || !query || query.trim() === "") {
      return res.status(400).json({ error: "User ID and query are required" });
    }

    console.log(`📝 Logging Search: User ${user_id} -> "${query}"`);

    await db.execute(
      "INSERT INTO search_logs (user_id, search_query) VALUES (?, ?)",
      [user_id, query]
    );

    res.status(200).json({ message: "Logged successfully" });

  } catch (error) {
    console.error("❌ Search Log Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;