import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "../ml/model/models/book_index.csv");

let booksCache = null;

function loadBooks() {
    if (booksCache) return booksCache;
    if (!fs.existsSync(CSV_PATH)) return [];

    const lines = fs.readFileSync(CSV_PATH, "utf-8").split("\n");
    const books = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV respecting quoted fields
        const fields = parseCSVLine(line);
        if (fields.length < 6) continue;

        const [book_id, title, authors, genres, description, image_url, rating] = fields;
        if (!image_url || !image_url.startsWith("https://")) continue;

        books.push({
            id: book_id,
            title: title || "Untitled",
            author: authors || "Unknown",
            genres: genres ? genres.split("|").map(g => g.trim()) : [],
            description: description || "",
            cover: image_url,
            rating: parseFloat(rating) || 0
        });
    }

    booksCache = books;
    return books;
}

function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === "," && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

// GET /api/books?genre=Fantasy&sort=rating&limit=30&offset=0
router.get("/", (req, res) => {
    const { genre, sort, limit = 30, offset = 0 } = req.query;
    const lim = Math.min(parseInt(limit) || 30, 100);
    const off = parseInt(offset) || 0;

    let books = loadBooks();

    if (genre) {
        const g = genre.toLowerCase();
        books = books.filter(b => b.genres.some(bg => bg.toLowerCase() === g));
    }

    if (sort === "rating") {
        books = [...books].sort((a, b) => b.rating - a.rating);
    } else if (sort === "random") {
        books = [...books].sort(() => Math.random() - 0.5);
    }

    const page = books.slice(off, off + lim).map(b => ({
        title: b.title,
        author: b.author,
        cover: b.cover,
        description: b.description,
        genre: b.genres[0] || genre || "General",
        rating: b.rating
    }));

    res.json({ success: true, data: page, total: books.length });
});

export default router;
