import express from "express";
import cors from "cors";
import db from "./db.js";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch"; // ✅ 1. เพิ่ม import fetch ตรงนี้

// ==========================================
// 📦 ROUTES IMPORTS
// ==========================================
import userRoutes from "./routes/user.js";
import journalRoutes from "./routes/journal.js";
import preferencesRoutes from "./routes/preferences.js";
import recommendRoutes from "./routes/recommendRoutes.js"; 
import updateModelRoutes from "./routes/update_model.js";
import favoritesRoutes from "./routes/favorites.js";
import reportRoutes from "./routes/reportRoutes.js";
import chapterRoutes from "./routes/chapter.js"; 
import searchLogRoutes from "./routes/searchLog.js"; 
import manageuserRoutes from "./routes/manageuserRoutes.js";
import managereportRoutes from "./routes/managereportRoutes.js";
import passwordRoutes from "./routes/passwordRoutes.js";
import adminAuthorsRoutes from "./routes/adminAuthorsRoutes.js";
import adminGenresRoutes from "./routes/adminGenresRoutes.js";
import adminFeaturedBooksRoutes from "./routes/adminFeaturedBooksRoutes.js";
import adminFeaturedAuthorsRoutes from "./routes/adminFeaturedAuthorsRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

// ==========================================
// ⚙️ CONFIG & MIDDLEWARE
// ==========================================
// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// ✅ เพิ่ม limit เป็น 50mb (จากไฟล์ 1) เพื่อให้รับรูปภาพ Base64 ได้โดยไม่ Error
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve React build (production)
const reactBuild = path.join(__dirname, "../frontend/build");
app.use(express.static(reactBuild));

// ==========================================
// 🛣️ API ROUTES
// ==========================================

// 1. User & Auth
app.use("/api/users", userRoutes);
app.use("/api", passwordRoutes); // Password Reset etc.

// 2. Journals & Chapters
// ✅ วาง Chapter ไว้ก่อน Journal เพื่อป้องกัน Path ทับซ้อน
app.use("/api/journals", chapterRoutes); 
app.use("/api/journals", journalRoutes);

// 3. Preferences, Recommendations & AI Model
app.use("/api/preferences", preferencesRoutes);
app.use("/api/recommend", recommendRoutes); 
app.use("/api/update-model", updateModelRoutes);

// 4. Favorites & Reports (User Side)
app.use("/api/favorites", favoritesRoutes);
app.use("/api/reports", reportRoutes); // 👈 จุดสำคัญ: Route นี้ต้องมี

// ==========================================
// 🌉 5. BRIDGE: SEARCH PROXY (Port 5000 -> 3000)
// ==========================================
// ✅ เพิ่มส่วนนี้: รับงานจากหน้าเว็บ แล้วส่งต่อให้ Proxy Port 3000
app.post("/api/search", async (req, res) => {
    try {
        // ส่งต่อ Request ไปหา Port 3000
        const response = await fetch("http://localhost:3001/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req.body)
        });
        
        // รับผลลัพธ์กลับมาส่งให้หน้าเว็บ
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error("Bridge Error:", err);
        // ถ้า Port 3000 ไม่เปิด จะฟ้อง error นี้
        res.status(500).json({ error: "Cannot connect to Proxy Server (Port 3000). Please ensure proxy.js is running." });
    }
});

// Search Logs (GET) เอาไว้ข้างล่าง Bridge (POST) ได้เลย
app.use("/api/search", searchLogRoutes);

// 6. Admin Panel (✅ แก้ปัญหา 404 Not Found)
app.use("/api/admin/users", manageuserRoutes);
app.use("/api/admin/reports", managereportRoutes);
app.use("/api/admin/authors", adminAuthorsRoutes);
app.use("/api/admin/genres", adminGenresRoutes);
app.use("/api/admin/featured-books", adminFeaturedBooksRoutes);
app.use("/api/admin/featured-authors", adminFeaturedAuthorsRoutes);
app.use("/api/reviews", reviewRoutes);

// ==========================================
// 🛠️ TEST & START
// ==========================================
app.get("/test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT NOW() AS time");
    res.json({ message: "Database connected!", serverTime: rows[0].time });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// SPA catch-all — React Router handles all non-API routes
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build/index.html"));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));