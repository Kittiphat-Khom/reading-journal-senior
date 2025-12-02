// ============================
// CONFIG
// ============================
const ITEMS_PER_PAGE = 20;

let selectedGenres = new Set();
let allGenres = [];
let filteredGenres = [];
let currentPage = 0;

// ============================
// DATA: STATIC BOOKSHELF LIST
// ============================
const RAW_GENRE_LIST = [
"Fiction", 
    "Fantasy", 
    "Young Adult", 
    "Adventure", 
    "Science Fiction", 
    "Classics", 
    "Comics", 
    "Romance", 
    "History", 
    "LGBTQ", 
    "Action", 
    "Comedy", 
    "Drama", 
    "Horror", 
    "Thriller", 
    "Crime", 
    "Animation", 
    "Mystery", 
    "Family", 
    "War",

    // --- รายการเดิมของคุณ ---
    "Animals and Pets", "Cats", "Dogs", "Other Domestic Pets", 
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

// ============================
// DOM ELEMENTS
// ============================
const genreGrid = document.getElementById("genreGrid");
const statusSpan = document.getElementById("selectionStatus");
const unselectAllBtn = document.getElementById("unselectAllBtn");
const nextBtn = document.getElementById("nextBtn");
const searchInput = document.getElementById("searchInput");

// UI Info
const pageIndicator = document.getElementById("pageIndicator");
const totalCountDisplay = document.getElementById("totalCountDisplay");

// Arrows
const prevArrow = document.getElementById("prevArrow");
const nextArrow = document.getElementById("nextArrow");

// ============================
// LOAD SAVED DATA
// ============================
function loadLocalGenres() {
    // ฟังก์ชันนี้เก็บไว้เผื่ออนาคตต้องการโหลดค่ากลับมา
    const savedPref = JSON.parse(localStorage.getItem("preference") || "{}");
    if (savedPref.genres && Array.isArray(savedPref.genres)) {
        selectedGenres = new Set(savedPref.genres);
    }
}

function saveLocalGenres() {
    let pref = JSON.parse(localStorage.getItem("preference") || "{}");
    pref.genres = Array.from(selectedGenres);

    localStorage.setItem("preference", JSON.stringify(pref));
    localStorage.setItem("selectedGenres", JSON.stringify(pref.genres));
    console.log("💾 Saved genres:", pref.genres);
}

// ============================
// 1) LOAD GENRES (STATIC LIST)
// ============================
function loadGenres() {
    try {
        // สร้าง Slug Helper Function
        const generateSlug = (name) => {
            return name.toLowerCase().trim()
                .replace(/[^a-z0-9]+/g, '-') // แทนที่อักขระพิเศษด้วยขีด
                .replace(/^-+|-+$/g, '');   // ลบขีดหน้าหลัง
        };

        // แปลง List ชื่อให้เป็น Object { name, slug }
        // ใช้ Set เพื่อป้องกันชื่อซ้ำ (ใน List ที่ให้มามีซ้ำบางคำ เช่น Young Adult)
        const uniqueNames = new Set();
        
        allGenres = [];
        
        RAW_GENRE_LIST.forEach(name => {
            const cleanName = name.trim();
            if (!uniqueNames.has(cleanName)) {
                uniqueNames.add(cleanName);
                allGenres.push({
                    name: cleanName,
                    slug: generateSlug(cleanName)
                });
            }
        });

        // ไม่ต้อง Sort Priority แล้ว ใช้ลำดับตาม Array ด้านบนเลย
        // แต่ถ้าอยากเรียง A-Z ให้เปิด comment บรรทัดล่าง
        // allGenres.sort((a, b) => a.name.localeCompare(b.name));

        filteredGenres = allGenres;
        currentPage = 0;
        renderFiltered();

    } catch (error) {
        console.error("❌ Error processing genres:", error);
        genreGrid.innerHTML = `<div class="error">Error loading genres.</div>`;
    }
}


// ============================
// 2) RENDER GRID
// ============================
function renderFiltered() {
    genreGrid.innerHTML = "";

    const totalItems = filteredGenres.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

    if (currentPage >= totalPages) currentPage = totalPages - 1;
    if (currentPage < 0) currentPage = 0;

    const start = currentPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const items = filteredGenres.slice(start, end);

    if (items.length === 0) {
        genreGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#888;">No genres found.</div>`;
    }

    items.forEach(g => {
        const btn = document.createElement("button");
        btn.className = "genre-button";
        btn.dataset.slug = g.slug;
        btn.textContent = g.name;

        if (selectedGenres.has(g.slug)) btn.classList.add("selected");

        btn.addEventListener("click", () => {
            btn.classList.toggle("selected");
            if (btn.classList.contains("selected")) {
                selectedGenres.add(g.slug);
            } else {
                selectedGenres.delete(g.slug);
            }
            saveLocalGenres();
            updateCount();
        });

        genreGrid.appendChild(btn);
    });

    updateUIControls(totalItems, totalPages);
    updateCount();
}


// ============================
// 3) UI CONTROLS
// ============================
function updateUIControls(totalItems, totalPages) {
    totalCountDisplay.textContent = `(Found ${totalItems} genres)`;
    
    const currentDisplay = totalItems === 0 ? 0 : currentPage + 1;
    pageIndicator.textContent = `Page ${currentDisplay} of ${totalPages}`;

    prevArrow.disabled = currentPage === 0;
    nextArrow.disabled = currentPage >= totalPages - 1 || totalItems === 0;
}

function navigateCarousel(direction) {
    const totalPages = Math.ceil(filteredGenres.length / ITEMS_PER_PAGE);
    currentPage += direction;
    if (currentPage < 0) currentPage = 0;
    if (currentPage >= totalPages) currentPage = totalPages - 1;
    renderFiltered();
}


// ============================
// 4) COUNT & STATE
// ============================
function updateCount() {
    const selectedCount = selectedGenres.size;
    statusSpan.textContent = `Selected: ${selectedCount}`;

    // บังคับเลือกอย่างน้อย 3 อย่าง
    nextBtn.disabled = selectedCount < 3;
    nextBtn.style.opacity = selectedCount >= 3 ? 1 : 0.5;
    nextBtn.style.cursor = selectedCount >= 3 ? "pointer" : "not-allowed";
}


// ============================
// 5) ACTIONS
// ============================

unselectAllBtn.addEventListener("click", () => {
    selectedGenres.clear();
    saveLocalGenres();
    renderFiltered();
    updateCount();
});

nextBtn.addEventListener("click", () => {
    if (selectedGenres.size < 3) {
        alert("Please select at least 3 genres.");
        return;
    }
    saveLocalGenres();
    window.location.href = "manage-pre-author.html";
});

// Search Logic (กรองจาก Static List)
searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();

    if (q === "") {
        filteredGenres = allGenres;
    } else {
        filteredGenres = allGenres.filter(g =>
            g.name.toLowerCase().includes(q)
        );
    }

    currentPage = 0;
    renderFiltered();
});

// ============================
// START (Initial Load)
// ============================

// ล้างค่าเก่าทิ้งตาม Requirement
localStorage.removeItem("preference"); 
localStorage.removeItem("selectedGenres");
selectedGenres.clear();

// โหลดข้อมูล Static
loadGenres();