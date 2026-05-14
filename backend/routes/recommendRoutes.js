import express from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import db from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "../../");
const isWindows = process.platform === "win32";
const venvPython = isWindows
    ? path.join(projectRoot, "venv", "Scripts", "python.exe")
    : path.join(projectRoot, "venv", "bin", "python");
const PYTHON_PATH = fs.existsSync(venvPython) ? venvPython : (isWindows ? "python" : "python3");
const SCRIPT_PATH = path.join(projectRoot, "backend", "ml", "model", "recommend_auto.py");

async function handleRecommend(user_id, res) {
    try {
        const [rows] = await db.query(
            `SELECT preferred_books, preferred_authors, preferred_genres FROM MPC WHERE user_id = ?`,
            [user_id]
        );

        let userData = { books: [], authors: [], genres: [], searches: [] };

        try {
            const [searchRows] = await db.query(
                `SELECT search_query FROM search_logs WHERE user_id = ? ORDER BY search_timestamp DESC LIMIT 10`,
                [user_id]
            );
            if (searchRows.length > 0) {
                userData.searches = [...new Set(searchRows.map(r => r.search_query))].filter(s => s.length > 2);
            }
        } catch { }

        console.log(`[Recommend] user_id=${user_id} MPC rows=${rows.length}`);
        const parseField = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val;                          // MySQL already parsed JSON column
            if (typeof val !== 'string') return [];
            try { const p = JSON.parse(val); if (Array.isArray(p)) return p; } catch {}
            return val.split(',').map(s => s.trim()).filter(Boolean);    // comma-separated fallback
        };

        if (rows.length > 0) {
            const row = rows[0];
            console.log(`[Recommend] genres=${row.preferred_genres} authors=${row.preferred_authors}`);
            userData.authors = parseField(row.preferred_authors);
            userData.genres  = parseField(row.preferred_genres);
            // preferred_books จาก preference setup
            const prefBooks = parseField(row.preferred_books);
            if (prefBooks.length > 0) userData.books = prefBooks;
        }

        // merge journal titles (title-based lookup ใน Python)
        const [journalRows] = await db.query(
            `SELECT title FROM Journal WHERE user_id = ? AND title IS NOT NULL LIMIT 50`,
            [user_id]
        );
        if (journalRows.length > 0) {
            const journalTitles = journalRows.map(r => r.title);
            const merged = [...new Set([...userData.books, ...journalTitles])];
            userData.books = merged;
        }
        console.log(`[Recommend] books from journal: ${userData.books.length}, genres: ${userData.genres.length}, authors: ${userData.authors.length}`);
        console.log(`[Recommend] userData sent to Python:`, JSON.stringify(userData));

        console.log(`[Recommend] PYTHON_PATH=${PYTHON_PATH}`);
        const py = spawn(PYTHON_PATH, [SCRIPT_PATH, JSON.stringify(userData)], {
            env: { ...process.env }
        });
        let output = "", errorLog = "";

        py.stdout.on("data", (chunk) => { output += chunk.toString(); });
        py.stderr.on("data", (err) => { errorLog += err.toString(); });

        py.on("close", (code) => {
            console.log(`[Recommend] Python exit code=${code} outputLen=${output.length}`);
            if (errorLog) console.log(`[Recommend] stderr:\n${errorLog}`);
            if (code !== 0) {
                console.error(`[Recommend] Python failed: ${errorLog}`);
                return res.json({ success: true, data: [] });
            }
            try {
                const start = output.indexOf('[');
                const end = output.lastIndexOf(']') + 1;
                const cleaned = (start !== -1 ? output.substring(start, end) : output)
                    .replace(/\bNaN\b/g, 'null');
                const recommendations = JSON.parse(cleaned);
                res.json({ success: true, data: recommendations });
            } catch (parseErr) {
                console.error(`[Recommend] JSON parse error: ${parseErr.message}, output preview: ${output.slice(0,300)}`);
                res.status(500).json({ error: "Failed to parse recommendation results" });
            }
        });

    } catch (err) {
        console.error(`[Recommend] ERROR:`, err.message);
        res.status(500).json({ error: "Internal Database Error" });
    }
}

router.get("/", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token" });
    try {
        const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
        return handleRecommend(decoded.id, res);
    } catch {
        return res.status(401).json({ error: "Invalid token" });
    }
});

router.post("/", async (req, res) => {
    const user_id = req.body.user_id || req.body.userId;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });
    return handleRecommend(user_id, res);
});

export default router;
