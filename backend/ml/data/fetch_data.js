import db from "../../db.js";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// ⚙️ CONFIGURATION
// ============================================================
const projectRoot = path.resolve(__dirname, "../../../");
const isWindows = process.platform === "win32";

// Setup Python Path
const PYTHON_PATH = isWindows
  ? path.join(projectRoot, "venv", "Scripts", "python.exe")
  : path.join(projectRoot, "venv", "bin", "python");

const TRAIN_SCRIPT_PATH = path.join(projectRoot, "backend", "ml", "model", "train_model.py");

// Path for CSV Files
const BOOKS_CSV_PATH = path.join(__dirname, "books.csv");
const PREFS_CSV_PATH = path.join(__dirname, "user_preferences.csv");

// Helper: Delay function
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================
// 📌 PART 1: FETCH & STREAM WRITE (Low RAM + Full Categories)
// ============================================================

// แปลง Object หนังสือ เป็นบรรทัด CSV
function convertToCSVLine(b) {
    const escape = (txt) => `"${String(txt || "").replace(/"/g, '""').replace(/[\r\n]+/g, " ").trim()}"`;
    
    const author = b.contributions?.[0]?.author?.name || "Unknown";
    const rawTags = b.taggings.map(t => t.tag.tag);
    const uniqueTags = [...new Set(rawTags)].filter(t => t.length < 20).slice(0, 8); 
    const genres = uniqueTags.length ? uniqueTags.join("|") : "General";
    
    return [
        b.id,
        escape(b.title || "Untitled"),
        escape(author),
        escape(genres),
        escape(b.description),
        escape(b.image?.url || "")
    ].join(",");
}

// ฟังก์ชันยิง API
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

// 🔥 ฟังก์ชันหลัก: ดึงข้อมูลแล้วเขียนลงไฟล์ทันที
async function processAndExportBooks() {
  const TARGET_TOTAL = 30000; // 🎯 เป้าหมาย 30,000 เล่ม
  console.log(`🔍 [ETL Process] Starting Low-Memory Extraction (Target: ${TARGET_TOTAL})...`);
  
  // 1. สร้างไฟล์ books.csv และเขียน Header
  const writeStream = fs.createWriteStream(BOOKS_CSV_PATH, { flags: 'w' });
  writeStream.write("book_id,title,authors,genres,description,image_url\n");

  const seenIds = new Set(); 
  let totalSaved = 0;

  // 🔥 RESTORED: หมวดหมู่ต้นฉบับทั้งหมดของคุณ (ครบทุกตัวอักษร)
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

  // เริ่มวนลูปทีละหมวด
  for (const genreName of genres) {
    if (totalSaved >= TARGET_TOTAL) {
        console.log("🎉 Target Reached! Stopping fetch loop.");
        break;
    }

    // แปลงชื่อหมวดเป็น Slug
    let tagSlug = genreName.toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    console.log(`\n📂 Fetching Category: "${genreName}" (Current Total: ${totalSaved})`);
    
    // วนลูปย่อยดึงข้อมูล (สูงสุด 100 รอบต่อหมวด)
    for (let i = 0; i < 100; i++) {
        if (totalSaved >= TARGET_TOTAL) break;

        const books = await fetchBooksFromAPI({ limit: 500, offset: i * 500, tagSlug: tagSlug }, `${tagSlug}-${i}`);
        
        if (!books || books.length === 0) {
            console.log(`   ⏹️  End of genre "${genreName}". Moving to next...`);
            break; 
        }

        let batchCount = 0;
        // เขียนลงไฟล์ทันที!
        for (const book of books) {
            if (!seenIds.has(book.id)) {
                seenIds.add(book.id); 
                writeStream.write(convertToCSVLine(book) + "\n");
                totalSaved++;
                batchCount++;
            }
        }
        
        console.log(`   💾 Batch ${i+1}: Added ${batchCount} books. (Total Saved: ${totalSaved})`);

        // ถ้าได้มาน้อยกว่า 500 แปลว่าหมดสต็อกหมวดนี้แล้ว
        if (books.length < 500) {
            break;
        }

        await wait(500); // Delay เบาๆ
    }
    
    await wait(1000); // พัก 1 วิระหว่างหมวด
  }

  writeStream.end();
  console.log(`✅ Dataset Exported Successfully: ${totalSaved} books written to books.csv`);
  seenIds.clear(); // เคลียร์ RAM
}

// ============================================================
// 📌 PART 2: USER PREFERENCES
// ============================================================
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
    fs.writeFileSync(PREFS_CSV_PATH, lines.join("\n"));
    console.log("✅ User Preferences Exported.");
  } catch (error) {
    console.error("❌ Error exporting prefs:", error);
  }
}

// ============================================================
// 📌 PART 3: RUN PYTHON (AI TRAINING)
// ============================================================
async function runTrainModel() {
  console.log("\n🧠 Initializing Python Training Pipeline...");
  
  if (global.gc) { global.gc(); }

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(TRAIN_SCRIPT_PATH)) return reject("Script not found");

    const pythonProcess = spawn(PYTHON_PATH, [TRAIN_SCRIPT_PATH]);

    pythonProcess.stdout.on("data", (data) => console.log(`🐍 ${data.toString().trim()}`));
    pythonProcess.stderr.on("data", (data) => {
          const msg = data.toString().trim();
          if(msg && !msg.includes("oneDNN")) console.log(`⚠️ Py: ${msg}`);
    });

    pythonProcess.on("close", (code, signal) => {
      console.log(`🔍 Python Exit -> Code: ${code}, Signal: ${signal}`);
      
      if (code === 0) {
        console.log("✅ Training Success!");
        resolve();
      } else {
        if (signal === 'SIGKILL') console.error("💀 PYTHON KILLED BY OS (OUT OF MEMORY)");
        reject(new Error("Training Failed"));
      }
    });
  });
}

// ============================================================
// 🚀 START
// ============================================================
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    (async () => {
        try {
            console.log("🚀 Starting Recommendation System Pipeline...");
            await exportUserPreferences();
            await processAndExportBooks(); // จะรันนานขึ้นนิดนึงนะครับเพราะหมวดหมู่เยอะมาก
            await runTrainModel();
            console.log("\n✨ Pipeline Finished.");
            process.exit(0);
        } catch (e) {
            console.error("❌ Pipeline Failed:", e);
            process.exit(1);
        }
    })();
}