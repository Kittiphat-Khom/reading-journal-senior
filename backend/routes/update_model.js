import express from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =========================================================
// ⚙️ SMART PATH CONFIGURATION (ใช้ได้ทั้ง Windows/Linux)
// =========================================================

// 1. หาตำแหน่ง Root ของโปรเจกต์
// ไฟล์นี้ปกติน่าจะอยู่ที่ /backend/routes/
// ถอย 1 ครั้ง (..) -> /backend
// ถอย 2 ครั้ง (..) -> /senior-project (Root)
const projectRoot = path.resolve(__dirname, "../../");

// 2. เช็ค OS
const isWindows = process.platform === "win32";

// 3. เลือก Python Path อัตโนมัติ (จาก venv)
const PYTHON_PATH = isWindows
    ? path.join(projectRoot, "venv", "Scripts", "python.exe") // Windows
    : path.join(projectRoot, "venv", "bin", "python");        // Linux (VPS)

// 4. ระบุไฟล์ Python Script (อ้างอิงจาก Root)
// จากโค้ดเก่าคุณชี้ไปที่ update_model.py ผมเลยคงชื่อเดิมไว้ครับ
const SCRIPT_PATH = path.join(projectRoot, "backend", "ml", "model", "update_model.py");

// 🔥 DEBUG LOG (เช็ค Path ก่อนรัน)
console.log("-------------------------------------------------");
console.log(`🌍 OS Detected:   ${process.platform}`);
console.log(`🐍 Python Path:   ${PYTHON_PATH}`);
console.log(`📜 Update Script: ${SCRIPT_PATH}`);
console.log("-------------------------------------------------");

// =========================================================

router.post("/", (req, res) => {
    console.log("🔄 Requesting Model Update...");

    // Run Python
    const py = spawn(PYTHON_PATH, [SCRIPT_PATH], {
        // กำหนด Working Directory ให้เป็นโฟลเดอร์ที่ไฟล์ Python อยู่
        // เพื่อให้ Python หาไฟล์ config หรือ model ข้างเคียงเจอ
        cwd: path.dirname(SCRIPT_PATH), 
    });

    let output = "";
    let errorLog = "";

    py.stdout.on("data", (chunk) => {
        output += chunk;
        console.log("[MODEL UPDATE]", chunk.toString().trim());
    });

    py.stderr.on("data", (err) => {
        errorLog += err;
        console.error("[MODEL ERROR]", err.toString().trim());
    });

    py.on("close", (code) => {
        if (code === 0) {
            console.log("✅ Model updated successfully.");
            return res.json({
                status: "success",
                message: "Model updated successfully",
                log: output,
            });
        } else {
            console.error("❌ Model update failed.");
            return res.status(500).json({
                status: "error",
                message: "Model update failed",
                error: errorLog,
            });
        }
    });
});

export default router;