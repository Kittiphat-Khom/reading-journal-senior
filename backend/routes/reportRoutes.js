import express from "express";
import db from "../db.js"; 
import jwt from "jsonwebtoken";
import multer from "multer";

const router = express.Router();

// =======================================================
// 🔴 จุดสำคัญ: Secret Key ต้องตรงกับไฟล์ Login (user.js)
// =======================================================
// ถ้าคุณไม่ได้ตั้งค่า .env ให้แก้คำว่า "your_secret_key" 
// ให้เป็นคำเดียวกับที่คุณใช้ในไฟล์ routes/user.js เป๊ะๆ
const SECRET = process.env.JWT_SECRET || "your_secret_key"; 
// =======================================================

// ตั้งค่า Multer
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 } // 15 MB
});

// Middleware ตรวจสอบ Token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    
    // ตรวจสอบ Token
    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) {
            // 🟡 เพิ่ม Log ให้เห็นชัดๆ ใน Terminal ฝั่ง Server
            console.error("❌ Token Verify Error:", err.message);
            return res.status(403).json({ message: "Invalid token or Key mismatch" });
        }
        req.user = decoded; 
        next();
    });
};

// Route: /api/reports/add (สร้าง Report)
router.post("/add", verifyToken, upload.single('reportImage'), async (req, res) => {
    try {
        const { title, description } = req.body;
        // เช็คทั้ง id และ userId (กันเหนียว)
        const userId = req.user.id || req.user.userId;

        if (!title || !description) {
            return res.status(400).json({ message: "Title and description are required." });
        }

        let imageBuffer = null;
        if (req.file) {
            imageBuffer = req.file.buffer;
        }

        const sql = `
            INSERT INTO Report (report_image, title, description, user_id, is_done, created_at) 
            VALUES (?, ?, ?, ?, 0, NOW())
        `;

        await db.query(sql, [imageBuffer, title, description, userId]);

        res.status(201).json({ message: "Report submitted successfully" });

    } catch (error) {
        console.error("Error creating report:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ✅ Route: /api/reports/history (ดึงประวัติ)
router.get("/history", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;

        // ดึงข้อมูล
        const sql = `
            SELECT report_id, title, description, is_done, created_at, management_note 
            FROM Report 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `;

        const [rows] = await db.query(sql, [userId]);
        res.json(rows);

    } catch (error) {
        console.error("Error fetching report history:", error);
        res.status(500).json({ message: "Failed to fetch history" });
    }
});

export default router;