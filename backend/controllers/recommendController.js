// backend/controllers/recommendController.js
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import db from "../db.js";
import fs from "fs";

// 1. หาตำแหน่งปัจจุบันของไฟล์นี้ (เพื่อให้ตั้งหลักได้ ไม่ว่าจะย้ายไปเครื่องไหน)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. ถอยหลังกลับไปหา Root Folder (senior-project)
// ไฟล์นี้อยู่: /backend/controllers
// ถอย 1 ครั้ง (..) -> /backend
// ถอย 2 ครั้ง (..) -> /senior-project (Root)
const projectRoot = path.resolve(__dirname, "../../"); 

// 3. กำหนด Path แบบ Dynamic (Smart Logic)
// เช็คว่าเครื่องนี้เป็น Windows หรือไม่?
const isWindows = process.platform === "win32";

const venvPython = isWindows
  ? path.join(projectRoot, "venv", "Scripts", "python.exe")
  : path.join(projectRoot, "venv", "bin", "python");

const PYTHON_PATH = fs.existsSync(venvPython) ? venvPython : (isWindows ? "python" : "python3");

// ชี้ไปที่ไฟล์ Python Script โดยอ้างอิงจาก Root
const SCRIPT_PATH = path.join(projectRoot, "backend", "ml", "model", "recommend_auto.py");

// ============================================================
// 🔥 DEBUG LOG (เช็คดูว่า Path ถูกต้องไหมตอนรัน)
console.log("-------------------------------------------------");
console.log(`🌍 OS Detected: ${process.platform}`);
console.log(`📂 Project Root: ${projectRoot}`);
console.log(`🐍 Python Path:  ${PYTHON_PATH}`);
console.log(`📜 Script Path:  ${SCRIPT_PATH}`);
console.log("-------------------------------------------------");
// ============================================================

export const getAutoRecommendations = async (req, res) => {
  const userId = req.body.user_id || req.body.userId;
  if (!userId) return res.status(400).json({ error: "User ID is required" });

  try {
    // 1. เตรียมข้อมูล
    const [prefRows] = await db.execute(
      `SELECT preferred_books, preferred_authors, preferred_genres FROM MPC WHERE user_id = ?`, [userId]
    );
    const [searchRows] = await db.execute(
      `SELECT search_query FROM search_logs WHERE user_id = ? ORDER BY search_timestamp DESC LIMIT 10`, [userId]
    );

    let userData = { books: [], authors: [], genres: [], searches: [] };

    if (prefRows.length > 0) {
      const row = prefRows[0];
      try {
        if (row.preferred_books) userData.books = JSON.parse(row.preferred_books);
        if (row.preferred_authors) userData.authors = JSON.parse(row.preferred_authors);
        if (row.preferred_genres) userData.genres = JSON.parse(row.preferred_genres);
      } catch (e) {}
    }
    if (searchRows.length > 0) {
       userData.searches = [...new Set(searchRows.map(r => r.search_query))].filter(s => s.length > 2);
    }
    
    // 2. รัน Python (ใช้ตัวแปร Dynamic ที่เราสร้างไว้)
    const pythonProcess = spawn(PYTHON_PATH, [SCRIPT_PATH, JSON.stringify(userData)]);

    let dataString = "";
    let errorLog = "";

    pythonProcess.stdout.on("data", (data) => { 
        dataString += data.toString(); 
    });
    
    pythonProcess.stderr.on("data", (data) => { 
        errorLog += data.toString(); 
        console.error(`⚠️ Python Stderr: ${data.toString()}`); 
    });

    pythonProcess.on("close", (code) => {
      // ... (โค้ดส่วนจัดการผลลัพธ์เหมือนเดิม ไม่ต้องแก้) ...
      console.log(`🏁 Python finished with code: ${code}`);

      if (code !== 0) {
        console.error(`❌ Error Log: ${errorLog}`);
        return res.json([]);
      }

      console.log("📦 Output from Python:", dataString); 

      try {
        const jsonStartIndex = dataString.indexOf('[');
        const jsonEndIndex = dataString.lastIndexOf(']') + 1;

        if (jsonStartIndex === -1) {
             console.error("❌ Valid JSON not found in output.");
             return res.json([]);
        }

        const cleanJson = dataString.substring(jsonStartIndex, jsonEndIndex);
        const result = JSON.parse(cleanJson);
        
        console.log(`✅ Success! Found ${result.length} books.`);
        res.json(result);

      } catch (e) {
        console.error("❌ JSON Parse Error:", e.message);
        res.json([]);
      }
    });

  } catch (err) {
    console.error("🔥 Server Exception:", err);
    res.status(500).json({ error: "Server Error" });
  }
};