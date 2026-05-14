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
const projectRoot = path.resolve(__dirname, "../../../");

// 2. เช็ค OS
const isWindows = process.platform === "win32";

// 3. Python path — ใช้ venv ถ้ามี ไม่งั้น fallback system python
const venvPython = isWindows
  ? path.join(projectRoot, "venv", "Scripts", "python.exe")
  : path.join(projectRoot, "venv", "bin", "python");
const PYTHON_PATH = fs.existsSync(venvPython) ? venvPython : (isWindows ? "python" : "python3");

// 4. CLI args
const args = process.argv.slice(2);
const FETCH_LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i+1]) || 1000 : 1000; })();
const APPEND_MODE = args.includes('--append');
const CSV_PATH = path.join(__dirname, "books.csv");

// 4. กำหนด Path ไฟล์ Python Script
const TRAIN_SCRIPT_PATH = path.join(projectRoot, "backend", "ml", "model", "train_model.py");

// 🔥 DEBUG LOG: เช็ค Path ก่อนรัน
console.log("-------------------------------------------------");
console.log(`🌍 OS Detected:   ${process.platform}`);
console.log(`📂 Project Root:  ${projectRoot}`);
console.log(`🐍 Python Path:   ${PYTHON_PATH}`);
console.log(`📜 Train Script:  ${TRAIN_SCRIPT_PATH}`);
console.log("-------------------------------------------------");

// ✅ Helper Function: สร้าง Promise เพื่อหน่วงเวลา (Delay)
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    const response = await fetch("http://localhost:3001/api/search", {
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
  const TARGET_TOTAL = FETCH_LIMIT;
  console.log(`🔍 [ETL Process] Fetching ${TARGET_TOTAL} books (append=${APPEND_MODE})...`);

  // โหลด CSV เดิมถ้า --append
  let allBooksMap = new Map();
  if (APPEND_MODE && fs.existsSync(CSV_PATH)) {
    const existing = fs.readFileSync(CSV_PATH, 'utf-8').split('\n').slice(1).filter(Boolean);
    existing.forEach(line => {
      const id = line.split(',')[0];
      if (id) allBooksMap.set(id, { _raw: line });
    });
    console.log(`📂 Loaded ${allBooksMap.size} existing books from CSV`);
  }
  
  // รายการ Genre แบบสวยงาม (Display Name)
  const genres = [
    "Fiction", "Fantasy", "Young Adult", "Adventure", "Science Fiction", "Classics", "Comics", "Romance", "History", "LGBTQ",
    "Action", "Comedy", "Drama", "Horror", "Thriller", "Crime", "Animation", "Mystery", "Family", "War",
    "Animals and Pets", "Other Domestic Pets",
    "Art and Design", "Architecture", "Fashion Design", "Fine Arts", "Graphic Design & Product Design", "Interior Design", "Photography",
    "Biography", "Business", "Historical & Political", "True Crime", "Other Biographies",
    "Business and Economics", "Accounting", "Biographies", "Business Management", "Business Writing (Reports/Resumes)", "Economics", "Finance and Investment", "Sales and Marketing",
    "Children's Books", "Babies / Toddlers", "Pre-Teens (Ages 7-12)", "Young Adult (Ages >12)", "Activity Books", "Comics & Popular Characters",
    "Education & Reference",
    "Comics and Graphic Novels", "Graphic Novels", "Manga", "Humour Comic strips", "Jokes and Puns", "Light Novels",
    "PC & Video Games", "Puzzles & Quizzes",
    "Computers and Internet", "Internet & Networking", "Programming Languages", "Software",
    "English as a Foreign Language", "English For Specific Purposes", "Exams", "Grammar & Vocabulary", "Reading Skills", "Speaking & Pronunciation", "Writing Skills",
    "Family and Relationships", "Parenting", "Relationships",
    "Food and Drink", "Drinks", "Professional Chefs", "Types of Cuisines", "Types of Food", "Desserts",
    "Health and Well-Being", "Alternative Healing", "Beauty Care", "Fitness and Diet", "Health and Medicine",
    "History and Politics", "Ancient & Medieval History", "African History", "History of the Americas", "Asian History", "European History", "Middle Eastern History", "World History",
    "Biographies and Memoirs", "Military History", "Political Science", "History of Southeast Asia", "History of Thailand",
    "Hobbies and Collectibles", "Antiques", "Collectibles - Clocks & Watches", "Collectibles - Jewellery & Gems", "Collectibles - Toys", "Crafts", "Flower Arrangement & Garden", "Papercraft",
    "Transport - Air/Sea/Land",
    "Languages", "Thai", "Chinese", "English Exams", "French", "German", "Italian", "Japanese", "Spanish", "Other Asian Languages", "Other Language Of the World",
    "Literature and Fiction", "General Fiction", "Literature", "Asian Literature", "Crime, Thrillers & Mystery", "Drama and Play", "Poetry", "Travel Literature",
    "Military and War", "Military Intelligence & Espionage", "Strategy, Tactics & Military Science", "Terrorism & Freedom", "Fighters", "Weapons",
    "New Age", "Fengshui", "Fortune-Telling and Divination", "Meditation & Healing", "Occult", "Paranormal", "Psychic Phenomena",
    "Performing Arts", "Dance", "Film and TV", "Music", "Theatre",
    "Philosophy and Psychology", "Philosophy and Theory", "Ancient Philosophy", "Eastern Philosophy", "Modern Philosophy", "Psychological Topics and Perspectives", "Psychology - History and Theory", "Psychology and Biography",
    "Religion", "General History and Reference", "Buddhism", "Christianity", "Hinduism", "Islam",
    "Science", "General Reference and Writings", "Applied Science", "Astronomy", "Botany", "Chemistry and Physics", "Geography and Earth Science", "Life Science", "Mathematics", "Natural and Ecology", "Zoology",
    "Self-Enrichment", "Self Help", "Spiritual",
    "Social Science", "Culture and Anthropology", "Gender Studies", "Law", "Media Studies", "Sociology",
    "Sports", "Martial Arts", "Outdoor Sports", "Training and Workouts", "Water Sports",
    "Study Guide",
    "Travel", "General Reference", "The Americas", "Asia", "Australia and Oceania", "Europe"
  ];

  for (const genreName of genres) {
    if (allBooksMap.size >= TARGET_TOTAL) break;

    // 🔥 FIX: แปลงชื่อสวยๆ ให้เป็น slug เพื่อส่งให้ Database เข้าใจ
    let tagSlug = genreName.toLowerCase()
        .replace(/&/g, 'and')           // เปลี่ยน & เป็น and
        .replace(/[^a-z0-9]+/g, '-')    // เปลี่ยนสัญลักษณ์อื่นๆ และช่องว่าง เป็นขีด (-)
        .replace(/^-+|-+$/g, '');       // ลบขีดที่หัวและท้าย (ถ้ามี)

    console.log(`\n📂 Fetching Category: "${genreName}" (Slug: ${tagSlug})`);
    
    // Batch Processing
    for (let i = 0; i < 4; i++) {
        if (allBooksMap.size >= TARGET_TOTAL) break;
        
        // ส่ง tagSlug (ตัวเล็กมีขีด) ไป query
        const books = await fetchBooksFromAPI({ limit: 500, offset: i * 500, tagSlug: tagSlug }, `${tagSlug}-${i}`);
        
        if (!books || books.length === 0) {
            console.log(`   ⚠️ No books found for "${tagSlug}" (Batch ${i+1}), skipping...`);
            break; 
        }
        
        books.forEach(b => allBooksMap.set(b.id, b));
        console.log(`   📊 Batch ${i+1}: Total Unique Records: ${allBooksMap.size}`);
        
        // ⏳ DELAY: หน่วงเวลาระหว่าง Batch (ป้องกัน Throttle)
        // สุ่มเวลา 1.5 - 2.5 วินาที
        const randomDelay = Math.floor(Math.random() * 1000) + 1500;
        console.log(`   ⏳ Cooling down for ${randomDelay}ms...`);
        await wait(randomDelay);
    }

    // ⏳ DELAY: พักเบรคระหว่างหมวดหมู่ (ป้องกัน Load หนักเกินไป)
    if (allBooksMap.size < TARGET_TOTAL) {
        console.log(`   ☕ Taking a short break (3s) between categories...`);
        await wait(3000); 
    }
  }

  // Data Cleaning & Formatting
  return Array.from(allBooksMap.values()).map(b => {
    const author = b.contributions?.[0]?.author?.name || "Unknown";
    const rawTags = b.taggings.map(t => t.tag.tag);
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
  if (allBooks.length === 0) { console.log("⚠️ No new books fetched."); return; }

  console.log("💾 Writing Dataset to books.csv...");
  const escape = (txt) => `"${String(txt).replace(/"/g, '""')}"`;

  // ถ้า append mode — โหลด rows เดิมแล้วผสาน
  let existingLines = [];
  if (APPEND_MODE && fs.existsSync(CSV_PATH)) {
    existingLines = fs.readFileSync(CSV_PATH, 'utf-8').split('\n').slice(1).filter(Boolean);
  }

  // IDs ที่มีอยู่แล้ว (ป้องกัน duplicate)
  const existingIds = new Set(existingLines.map(l => l.split(',')[0]));

  const newLines = allBooks
    .filter(b => !existingIds.has(String(b.id)))
    .map(b => [b.id, escape(b.title), escape(b.author), escape(b.genres.join("|")), escape(b.description), escape(b.cover)].join(","));

  const allLines = ["book_id,title,authors,genres,description,image_url", ...existingLines, ...newLines];
  fs.writeFileSync(CSV_PATH, allLines.join("\n"));
  console.log(`✅ Dataset Ready: ${existingLines.length} existing + ${newLines.length} new = ${existingLines.length + newLines.length} total books`);
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