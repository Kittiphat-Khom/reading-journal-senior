import express from "express";
import db from "../db.js";

const router = express.Router();

// ==================================================================
// 1. ✅ API: บันทึก Chapters (POST)
//    - ลบข้อมูลเก่าก่อนบันทึกใหม่ (Full Replace)
//    - แก้บั๊ก [object Object] โดยการแกะค่า Text ออกมาก่อนบันทึก
// ==================================================================
router.post("/:journalId/chapters", async (req, res) => {
  const journalId = req.params.journalId;
  const { chapters } = req.body;

  if (!chapters || !Array.isArray(chapters)) {
    return res.status(400).json({ message: "Invalid chapters data" });
  }

  let connection;
  try {
    // 1. สร้าง Connection (รองรับทั้ง Pool และ Single Connection)
    if (typeof db.getConnection === 'function') {
        connection = await db.getConnection();
    } else {
        connection = db;
    }
    
    await connection.beginTransaction(); 
    console.log(`📝 Processing chapters for Journal ID: ${journalId}`);

    // 2. [Safety Delete] ลบข้อมูลเก่าทิ้งก่อน
    const [oldChapters] = await connection.query("SELECT id FROM journal_chapters WHERE journal_id = ?", [journalId]);
    const oldChapterIds = oldChapters.map(c => c.id);

    if (oldChapterIds.length > 0) {
        const placeholders = oldChapterIds.map(() => '?').join(',');
        await connection.query(`DELETE FROM chapter_quotes WHERE chapter_id IN (${placeholders})`, oldChapterIds);
        await connection.query(`DELETE FROM chapter_annotations WHERE chapter_id IN (${placeholders})`, oldChapterIds);
        await connection.query(`DELETE FROM chapter_favorite_pages WHERE chapter_id IN (${placeholders})`, oldChapterIds);
    }
    await connection.query("DELETE FROM journal_chapters WHERE journal_id = ?", [journalId]);

    // 3. วนลูปบันทึกข้อมูลใหม่
    for (const chap of chapters) {
      const num = parseInt(chap.num) || 0;
      const stars = parseInt(chap.stars) || 0;
      const drama = parseInt(chap.drama) || 0;
      const spicy = parseInt(chap.spicy) || 0;
      const review = chap.review || "";

      // 3.1 Insert Chapter
      const [chapResult] = await connection.query(
        `INSERT INTO journal_chapters 
        (journal_id, chapter_number, review, star_point, drama_point, spicy_point) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [journalId, num, review, stars, drama, spicy]
      );
      
      const newChapterId = chapResult.insertId;

      // 3.2 Insert Quotes (🔥 แก้จุดนี้: แกะ Text ออกจาก Object)
      if (chap.quotes && Array.isArray(chap.quotes) && chap.quotes.length > 0) {
        const quoteValues = [];
        for (let item of chap.quotes) {
            let txt = "";
            // เช็คว่าเป็น Object หรือ String
            if (typeof item === 'object' && item !== null) {
                txt = item.text || item.quote_text || "";
            } else {
                txt = String(item);
            }

            // กันค่าว่างและกันขยะ
            if (txt && txt.trim() !== "" && txt !== "[object Object]") {
                quoteValues.push([newChapterId, txt]);
            }
        }

        if (quoteValues.length > 0) {
            await connection.query(
                "INSERT INTO chapter_quotes (chapter_id, quote_text) VALUES ?",
                [quoteValues]
            );
        }
      }

      // 3.3 Insert Annotations (🔥 แก้จุดนี้: แกะ Text ออกจาก Object)
      if (chap.annotations && Array.isArray(chap.annotations) && chap.annotations.length > 0) {
        const noteValues = [];
        for (let item of chap.annotations) {
            let txt = "";
            if (typeof item === 'object' && item !== null) {
                txt = item.text || item.note_text || "";
            } else {
                txt = String(item);
            }

            if (txt && txt.trim() !== "" && txt !== "[object Object]") {
                noteValues.push([newChapterId, txt]);
            }
        }

        if (noteValues.length > 0) {
            await connection.query(
                "INSERT INTO chapter_annotations (chapter_id, note_text) VALUES ?",
                [noteValues]
            );
        }
      }

      // 3.4 Insert Favorite Pages
      if (chap.favPages && Array.isArray(chap.favPages) && chap.favPages.length > 0) {
        const pageValues = chap.favPages.map((page) => [newChapterId, parseInt(page) || 0]);
        await connection.query(
          "INSERT INTO chapter_favorite_pages (chapter_id, page_number) VALUES ?",
          [pageValues]
        );
      }
    }

    await connection.commit();
    console.log("✅ Chapters saved successfully!");
    res.json({ message: "Chapters saved successfully", count: chapters.length });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Save Chapter Error:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  } finally {
    if (connection && typeof connection.release === 'function') connection.release();
  }
});

// ==================================================================
// 2. ✅ API: ดึงข้อมูล Chapters (GET)
//    - ดึง timestamp (created_at) กลับไปด้วย
// ==================================================================
router.get("/:journalId/chapters", async (req, res) => {
    const journalId = req.params.journalId;
    try {
        const [chapters] = await db.query(
            "SELECT * FROM journal_chapters WHERE journal_id = ? ORDER BY chapter_number ASC", 
            [journalId]
        );

        for (const chap of chapters) {
            // 🔥 เลือก created_at มาด้วย
            const [quotes] = await db.query("SELECT quote_text, created_at FROM chapter_quotes WHERE chapter_id = ?", [chap.id]);
            const [notes] = await db.query("SELECT note_text, created_at FROM chapter_annotations WHERE chapter_id = ?", [chap.id]);
            const [pages] = await db.query("SELECT page_number FROM chapter_favorite_pages WHERE chapter_id = ?", [chap.id]);

            // Map ข้อมูลกลับไป
            chap.num = chap.chapter_number;
            chap.stars = chap.star_point;
            chap.drama = chap.drama_point;
            chap.spicy = chap.spicy_point;
            
            // 🔥 ส่งกลับเป็น Object คู่กับ Timestamp
            chap.quotes = quotes.map(q => ({
                text: q.quote_text,
                timestamp: q.created_at
            }));

            chap.annotations = notes.map(n => ({
                text: n.note_text,
                timestamp: n.created_at
            }));

            chap.favPages = pages.map(p => p.page_number);
        }

        res.json(chapters);
    } catch (error) {
        console.error("Load Chapter Error:", error);
        res.status(500).json({ message: "Error loading chapters" });
    }
});

export default router;