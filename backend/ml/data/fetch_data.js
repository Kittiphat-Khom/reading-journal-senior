import db from "../../db.js";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// ⚙️ SMART PATH CONFIGURATION (Dynamic for Windows/Linux)
// ============================================================

// 1. หาตำแหน่ง Root ของโปรเจกต์ (senior-project)
// ไฟล์นี้อยู่: /backend/ml/data
// ถอย 1 ครั้ง (..) -> /backend/ml
// ถอย 2 ครั้ง (..) -> /backend
// ถอย 3 ครั้ง (..) -> /senior-project (Root)
const projectRoot = path.resolve(__dirname, "../../../");

// 2. เช็ค OS ว่าเป็น Windows หรือ Linux
const isWindows = process.platform === "win32";

// 3. กำหนด Path Python อัตโนมัติ
const PYTHON_PATH = isWindows
  ? path.join(projectRoot, "venv", "Scripts", "python.exe") // Windows
  : path.join(projectRoot, "venv", "bin", "python");        // Linux (VPS)

// 4. กำหนด Path ไฟล์ Python Script
const TRAIN_SCRIPT_PATH = path.join(projectRoot, "backend", "ml", "model", "train_model.py");

// 🔥 DEBUG LOG: เช็ค Path ก่อนรัน
console.log("-------------------------------------------------");
console.log(`🌍 OS Detected:   ${process.platform}`);
console.log(`📂 Project Root:  ${projectRoot}`);
console.log(`🐍 Python Path:   ${PYTHON_PATH}`);
console.log(`📜 Train Script:  ${TRAIN_SCRIPT_PATH}`);
console.log("-------------------------------------------------");

// ============================================================
// 📌 PART 1: DATA INGESTION (API Fetching)
// Process: Data Mining & Collection
// ============================================================
async function fetchBooksFromAPI(queryVariables, label) {
  const gql = `
    query GetBooks($limit: Int!, $offset: Int!, $tagSlug: String) {
      books(
        where: {
          description: { _gt: "" }
          image_id: { _is_null: false }
          taggings: { tag: { slug: { _eq: $tagSlug } } } 
        }
        order_by: { users_read_count: desc } 
        limit: $limit
        offset: $offset
      ) {
        id, title, description, image { url }, contributions(limit: 1) { author { name } }, taggings(limit: 10) { tag { tag } }
      }
    }
  `;
  
  try {
    const response = await fetch("http://localhost:3000/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: gql, variables: queryVariables })
    });
    const json = await response.json();
    if (json.data && json.data.books) return json.data.books;
  } catch (err) { console.error(`❌ Fetch Error [${label}]:`, err.message); }
  return [];
}

async function fetchAllBooks() {
  const TARGET_TOTAL = 13000;
  console.log(`🔍 [ETL Process] Starting Data Extraction (Target: ${TARGET_TOTAL} items)...`);
  let allBooksMap = new Map();
  
  // Diversity Coverage: ครอบคลุมหมวดหมู่หลากหลายเพื่อลด Bias
  const genres = [
    "fantasy", "sci-fi", "romance", "horror", "thriller", "mystery",
    "history", "biography", "business", "psychology", "self-help",
    "manga", "comics", "cooking", "travel", "art", "young-adult", "classics"
  ];

  for (const genre of genres) {
    if (allBooksMap.size >= TARGET_TOTAL) break;
    console.log(`\n📂 Fetching Category: ${genre.toUpperCase()}`);
    
    // Batch Processing
    for (let i = 0; i < 4; i++) {
        if (allBooksMap.size >= TARGET_TOTAL) break;
        const books = await fetchBooksFromAPI({ limit: 500, offset: i * 500, tagSlug: genre }, `${genre}-${i}`);
        
        if (!books || books.length === 0) break;
        
        books.forEach(b => allBooksMap.set(b.id, b));
        console.log(`   📊 Batch ${i+1}: Total Unique Records: ${allBooksMap.size}`);
        
        // Rate Limiting
        await new Promise(r => setTimeout(r, 100)); 
    }
  }

  // Data Cleaning & Formatting
  return Array.from(allBooksMap.values()).map(b => {
    const author = b.contributions?.[0]?.author?.name || "Unknown";
    const rawTags = b.taggings.map(t => t.tag.tag);
    // Feature Engineering
    const uniqueTags = [...new Set(rawTags)].filter(t => t.length < 20).slice(0, 8);
    const cleanDesc = (b.description || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, ' ').trim();
    
    return {
      id: b.id,
      title: b.title || "Untitled",
      cover: b.image?.url || "",
      author: author,
      genres: uniqueTags.length ? uniqueTags : ["General"],
      description: cleanDesc
    };
  });
}

// ============================================================
// 📌 PART 2: DATA TRANSFORMATION & LOADING (CSV Export)
// Process: Preparing Dataset for SBERT Model
// ============================================================
export async function exportBooks() {
  const allBooks = await fetchAllBooks();
  if (allBooks.length === 0) return;

  console.log("💾 Writing Dataset to books.csv...");
  
  const csvLines = allBooks.map(b => {
    // Data Sanitization for CSV format
    const escape = (txt) => `"${String(txt).replace(/"/g, '""')}"`; 
    return [
        b.id, 
        escape(b.title), 
        escape(b.author), 
        escape(b.genres.join("|")), 
        escape(b.description), 
        escape(b.cover)
    ].join(",");
  });

  // Header must match Schema in train_model.py
  csvLines.unshift("book_id,title,authors,genres,description,image_url");
  fs.writeFileSync(path.join(__dirname, "books.csv"), csvLines.join("\n"));
  console.log("✅ Dataset Ready.");
}

export async function exportUserPreferences() {
  console.log("📥 Exporting User Interaction Matrix...");
  try {
    const [rows] = await db.execute(`SELECT user_id, preferred_books FROM MPC`);
    const lines = [];
    rows.forEach(row => {
      let books = [];
      try { books = JSON.parse(row.preferred_books || "[]"); } catch {}
      books.forEach(bookId => lines.push(`${row.user_id},book,${bookId},1`));
    });
    fs.writeFileSync(path.join(__dirname, "user_preferences.csv"), lines.join("\n"));
    console.log("✅ User Preferences Exported.");
  } catch (error) {
    console.error("❌ Error exporting prefs:", error);
  }
}

// ============================================================
// 📌 PART 3: MODEL TRAINING TRIGGER
// Process: Executing Python Subprocess for Vectorization
// ============================================================
async function runTrainModel() {
  console.log("\n🧠 Initializing Python Training Pipeline...");
  return new Promise((resolve, reject) => {
    
    if (!fs.existsSync(TRAIN_SCRIPT_PATH)) {
        console.error("❌ Python script not found at:", TRAIN_SCRIPT_PATH);
        console.error("   Please check directory structure (model vs models)");
        return reject();
    }

    const pythonProcess = spawn(PYTHON_PATH, [TRAIN_SCRIPT_PATH]);

    pythonProcess.stdout.on("data", (data) => console.log(`🐍 [Python]: ${data.toString().trim()}`));
    pythonProcess.stderr.on("data", (data) => {
          const msg = data.toString().trim();
          if(msg && !msg.includes("oneDNN")) console.log(`⚠️ [Python Warning]: ${msg}`);
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        console.log("✅ Model Training & Vectorization Completed Successfully!");
        resolve();
      } else {
        console.error("❌ Training Pipeline Failed with exit code:", code);
        reject(new Error("Training Failed"));
      }
    });
  });
}

// ============================================================
// 🚀 MAIN EXECUTION
// ============================================================
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    (async () => {
        try {
            console.log("🚀 Starting Recommendation System Pipeline...");
            await exportUserPreferences();
            await exportBooks();
            await runTrainModel();
            console.log("\n✨ Pipeline Finished. System is ready to serve recommendations.");
            process.exit(0);
        } catch (e) {
            console.error("❌ Pipeline Failed:", e);
            process.exit(1);
        }
    })();
}