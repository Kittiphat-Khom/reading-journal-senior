import express from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import db from "../db.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =========================================================
// ⚙️ SMART PATH CONFIGURATION (ใช้ได้ทั้ง Windows/Linux)
// =========================================================

// 1. หาตำแหน่ง Root ของโปรเจกต์
// สมมติไฟล์นี้อยู่ที่: /backend/routes/recommend.js (หรือคล้ายกันที่มีการ import ../db.js)
// ถอย 1 ครั้ง (..) -> /backend
// ถอย 2 ครั้ง (..) -> /senior-project (Root)
const projectRoot = path.resolve(__dirname, "../../");

// 2. เช็ค OS
const isWindows = process.platform === "win32";

// 3. เลือก Python Path อัตโนมัติ
const PYTHON_PATH = isWindows
    ? path.join(projectRoot, "venv", "Scripts", "python.exe") // Windows
    : path.join(projectRoot, "venv", "bin", "python");        // Linux (VPS)

// 4. ระบุไฟล์ Script (อ้างอิงจาก Root เสมอ)
const SCRIPT_PATH = path.join(projectRoot, "backend", "ml", "model", "recommend_auto.py");

// 🔥 DEBUG LOG (เช็ค Path ตอนรัน)
console.log("-------------------------------------------------");
console.log(`🌍 OS Detected:   ${process.platform}`);
console.log(`🐍 Python Path:   ${PYTHON_PATH}`);
console.log(`📜 Script Path:   ${SCRIPT_PATH}`);
console.log("-------------------------------------------------");

// =========================================================

router.post("/", async (req, res) => {
    // รองรับทั้ง user_id (จาก Frontend เก่า) และ userId (เผื่อส่งแบบ camelCase)
    const user_id = req.body.user_id || req.body.userId;

    if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
    }

    try {
        // 1. ดึงข้อมูล User Preference จาก Database
        const [rows] = await db.query(
            `SELECT preferred_books, preferred_authors, preferred_genres FROM MPC WHERE user_id = ?`, 
            [user_id]
        );

        let userData = {
            books: [],
            authors: [],
            genres: [],
            searches: [] // เพิ่ม searches เผื่อไว้ (ตาม Logic ใหม่)
        };

        // แถม: ดึง Search Log ด้วย (เพื่อให้เหมือน recommendController ตัวใหม่)
        try {
            const [searchRows] = await db.query(
                `SELECT search_query FROM search_logs WHERE user_id = ? ORDER BY search_timestamp DESC LIMIT 10`, 
                [user_id]
            );
            if (searchRows.length > 0) {
                userData.searches = [...new Set(searchRows.map(r => r.search_query))].filter(s => s.length > 2);
            }
        } catch (err) {
            console.log("⚠️ Warning: Could not fetch search logs (Skipping...)");
        }

        if (rows.length > 0) {
            const row = rows[0];
            try {
                if (row.preferred_books) userData.books = JSON.parse(row.preferred_books);
                if (row.preferred_authors) userData.authors = JSON.parse(row.preferred_authors);
                if (row.preferred_genres) userData.genres = JSON.parse(row.preferred_genres);
            } catch (e) {
                console.error("❌ JSON Parse Error (Database Data):", e);
            }
        }

        // 2. เรียก Python Script
        // ใช้ตัวแปร SCRIPT_PATH ที่เราสร้างไว้ข้างบน
        
        const pythonInput = JSON.stringify(userData); 
        
        console.log(`🔥 Request for User ID: ${user_id}`);

        const py = spawn(PYTHON_PATH, [SCRIPT_PATH, pythonInput]);

        let output = "";
        let errorLog = "";

        py.stdout.on("data", (chunk) => {
            output += chunk.toString();
        });

        py.stderr.on("data", (err) => {
            errorLog += err.toString();
            // console.error(`⚠️ Python Stderr: ${err.toString()}`); // เปิดถ้าอยากดูละเอียด
        });

        py.on("close", (code) => {
            if (code !== 0) {
                console.error(`❌ Python Process Failed (Code ${code})`);
                console.error(`Error Log: ${errorLog}`);
                
                // Fallback: ถ้า Python พัง ให้ส่ง Array ว่างไปก่อน ดีกว่าเว็บค้าง
                return res.json({ success: true, data: [] });
            }

            try {
                // หา JSON ใน Output (เผื่อมี Log อื่นปนมา)
                const jsonStartIndex = output.indexOf('[');
                const jsonEndIndex = output.lastIndexOf(']') + 1;

                if (jsonStartIndex !== -1) {
                     const cleanJson = output.substring(jsonStartIndex, jsonEndIndex);
                     const recommendations = JSON.parse(cleanJson);
                     
                     return res.json({
                        success: true,
                        data: recommendations
                    });
                } else {
                    // ถ้าหา JSON ไม่เจอ ลอง parse ตรงๆ
                    const recommendations = JSON.parse(output);
                    res.json({ success: true, data: recommendations });
                }

            } catch (e) {
                console.error("❌ JSON Parse Error (Python Output):", e);
                // console.error("🔹 Raw Output:", output);
                res.status(500).json({ error: "Failed to parse recommendation results" });
            }
        });

    } catch (err) {
        console.error("❌ Node Server Error:", err);
        res.status(500).json({ error: "Internal Database Error" });
    }
});

export default router;