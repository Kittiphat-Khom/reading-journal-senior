import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import db from "./db.js";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

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
import booksRoutes from "./routes/booksRoutes.js";

// ==========================================
// ⚙️ CONFIG & MIDDLEWARE
// ==========================================
// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

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
app.use("/api/users/login", authLimiter);
app.use("/api/users/register", authLimiter);
app.use("/api/users/verify-otp", authLimiter);
app.use("/api/users/forgot-password", authLimiter);
app.use("/api/users", userRoutes);
app.use("/api/users", passwordRoutes);

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
// 🌉 5. SEARCH: direct Hardcover GraphQL proxy
// ==========================================
const HARDCOVER_TOKEN = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJIYXJkY292ZXIiLCJ2ZXJzaW9uIjoiOCIsImp0aSI6IjJjNWQ4MGFkLTQ3ZDctNDdkNy1iNDBmLTkxNmQ3MjJiNjI1ZiIsImFwcGxpY2F0aW9uSWQiOjIsInN1YiI6IjMyOTY4IiwiYXVkIjoiMSIsImlkIjoiMzI5NjgiLCJsb2dnZWRJbiI6dHJ1ZSwiaWF0IjoxNzYyNjg3MTQyLCJleHAiOjE3OTQyMjMxNDIsImh0dHBzOi8vaGFzdXJhLmlvL2p3dC9jbGFpbXMiOnsieC1oYXN1cmEtYWxsb3dlZC1yb2xlcyI6WyJ1c2VyIl0sIngtaGFzdXJhLWRlZmF1bHQtcm9sZSI6InVzZXIiLCJ4LWhhc3VyYS1yb2xlIjoidXNlciIsIlgtaGFzdXJhLXVzZXItaWQiOiIzMjk2OCJ9LCJ1c2VyIjp7ImlkIjozMjk2OH19.Xfga0PncD1OeqUb6hiCTJCBPEkJOFeLmtQwLrpQg-Qk";
const hardcoverCache = new Map();

app.post("/api/search", async (req, res) => {
    try {
        const cacheKey = JSON.stringify(req.body);
        const cached = hardcoverCache.get(cacheKey);
        if (cached && Date.now() - cached.ts < 10 * 60 * 1000) return res.json(cached.data);

        const response = await fetch("https://api.hardcover.app/v1/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": HARDCOVER_TOKEN },
            body: JSON.stringify(req.body)
        });
        const raw = await response.text();
        if (raw.startsWith("<!DOCTYPE") || raw.startsWith("<html")) {
            return res.status(500).json({ error: "Hardcover returned HTML" });
        }
        const data = JSON.parse(raw);
        hardcoverCache.set(cacheKey, { data, ts: Date.now() });
        res.json(data);
    } catch (err) {
        console.error("Search Error:", err);
        res.status(500).json({ error: err.message });
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
app.use("/api/books", booksRoutes);

// ==========================================
// 🛠️ TEST & START
// ==========================================
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

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