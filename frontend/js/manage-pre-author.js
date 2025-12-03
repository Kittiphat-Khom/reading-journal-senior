/* =========================================
   FILE: manage-pre-author.js
   ========================================= */

const API_BASE_URL = 'https://reading-journal.xyz';

// ============================
// CONFIG
// ============================
const API_URL = "/api/search";
const ITEMS_PER_PAGE = 20;

// ============================
// LOCAL STORAGE SETUP
// ============================
let selectedAuthors = new Set();

function loadLocalAuthors() {
    try {
        const pref = JSON.parse(localStorage.getItem("preference") || "{}");
        if (pref.authors && Array.isArray(pref.authors)) {
            selectedAuthors = new Set(pref.authors);
            console.log("📌 Loaded saved authors =", pref.authors);
        }
    } catch (e) {
        console.error("Error loading authors from local storage", e);
    }
}

function saveLocalAuthors() {
    let pref = JSON.parse(localStorage.getItem("preference") || "{}");
    pref.authors = Array.from(selectedAuthors);
    
    localStorage.setItem("preference", JSON.stringify(pref));
    // (Optional) Backup key
    localStorage.setItem("selectedAuthors", JSON.stringify(pref.authors));

    console.log("💾 Saved authors =", pref.authors);
}

// ============================
// DOM ELEMENTS
// ============================
const authorGrid = document.getElementById("authorGrid");
const statusSpan = document.getElementById("selectionStatus");
const unselectAllBtn = document.getElementById("unselectAllBtn");
const nextBtn = document.getElementById("nextBtn");
const searchInput = document.getElementById("searchInput");
const backBtn = document.getElementById("backBtn");
const skipBtn = document.getElementById("skipBtn"); 

// UI Info Elements
const pageIndicator = document.getElementById("pageIndicator");
const totalCountDisplay = document.getElementById("totalCountDisplay");

// Arrows
const prevArrow = document.getElementById("prevArrow");
const nextArrow = document.getElementById("nextArrow");

// Data State
let allAuthors = [];      // จะเก็บเฉพาะ 100 คนแรก
let filteredAuthors = []; // จะเปลี่ยนไปตามการค้นหา
let currentPage = 0;

// ============================
// API SEARCH (ทำงานเมื่อพิมพ์ค้นหา)
// ============================
async function searchAuthorsFromAPI(keyword, page = 1) {
    if (!keyword || keyword.trim() === "") return [];

    const query = `
    query SearchAuthors($keyword: String!, $page: Int!) {
        search(query: $keyword, query_type: Author, page: $page) {
            results
        }
    }
    `;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, variables: { keyword, page } })
        });

        const data = await response.json();
        let raw = data?.data?.search?.results;

        if (!Array.isArray(raw)) {
            if (raw?.hits) {
                raw = raw.hits.map(h => ({
                    id: h.document.id,
                    name: h.document.name,
                    slug: h.document.slug
                }));
            } else {
                return [];
            }
        }

        // จัดการกรณีข้อมูลมาเป็น String ล้วน
        if (typeof raw[0] === "string") {
            raw = raw.map(name => ({
                id: name,
                name: name,
                slug: name.toLowerCase().replace(/[^a-z0-9]/g, "")
            }));
        }

        const seen = new Set();
        const unique = [];
        for (const a of raw) {
            if (!seen.has(a.name)) {
                seen.add(a.name);
                unique.push(a);
            }
        }
        return unique;

    } catch (err) {
        console.error("search authors error:", err);
        return [];
    }
}

// ============================
// LOAD AUTHORS (แก้ไข: โหลดเฉพาะ 100 คน ไม่ดึง API ทั้งหมด)
// ============================
function loadAuthors() {
    // รายชื่อ 100 คน (Top Priority List)
const priorityList = [
    // Modern / Trending
    "Rebecca Yarros", "Suzanne Collins", "Emily Henry", "Taylor Jenkins Reid", "Freida McFadden", 
    "Abby Jimenez", "Ali Hazelwood", "Clare Leslie Hall", "Carley Fortune", "Fredrik Backman", 
    "Charlotte McConaghy", "Lauren Roberts", "Alice Feeney", "Devney Perry", "SenLinYu", 
    "Rachel Gillig", "Jeneva Rose", "B.K. Borison", "R.F. Kuang",

    // Classic Literature & Legends
    "Fyodor Dostoevsky", "Dante Alighieri", "Lev Tolstoy", "Victor Hugo", "William Shakespeare",
    "Johann Wolfgang von Goethe", "Miguel de Cervantes y Saavedra", "Italo Calvino", "Stendhal",
    "Charles Baudelaire", "Marcel Proust", "Giovanni Boccaccio", "Aleksandr Pushkin",
    "Jalaluddin Muhammad Rumi", "Franz Kafka", "Anton Chekhov", "Gabriel García Márquez",
    "Umberto Eco", "J.R.R. Tolkien", "William Faulkner", "Aesop", "Arthur Rimbaud",
    "Aristophanes", "Ivan Turgenev", "Sophocles", "Molière", "Charles Dickens",
    "Maxim Gorky", "George Orwell", "Edgar Allan Poe", "Publius Vergilius Maro (Virgil)",
    "Julio Cortázar", "Nazim Hikmet", "Oscar Wilde", "Jean de La Fontaine", "Rainer Maria Rilke",
    "Lord Byron", "Hans Christian Andersen", "Thomas Mann", "Alexandre Dumas", "James Joyce",
    "Louis-Ferdinand Céline", "Boris Pasternak", "Federico García Lorca", "Pablo Neruda",
    "Borges (Jorge Luis Borges)", "Beaumarchais", "Naguib Mahfouz", "Ursula K. Le Guin",
    "Nikolay Gogol", "Honoré de Balzac", "Ernest Hemingway", "Neil Gaiman", "Jean Racine",
    "Albert Camus", "Jean-Paul Sartre", "Chingiz Aitmatov", "John Steinbeck", "Milan Kundera",
    "Jules Verne", "Mark Twain", "Francois Rabelais", "Yasar Kemal", "George Bernard Shaw",
    "Arthur Conan Doyle", "Jane Austen", "Geoffrey Chaucer", "Antoine de Saint-Exupéry",
    "Erich Maria Remarque", "J.D. Salinger", "Virginia Woolf", "Louis Aragon", "Herman Melville",
    "Alphonse Daudet", "Mikhail Sholokhov", "Stefan Zweig", "José Saramago", "Bertolt Brecht",
    "Mario Vargas Llosa", "T.S. Eliot", "Guy de Maupassant", "John Keats", "Sabahattin Ali",
    "Ahmet Hamdi Tanpinar", "John Fante", "Henri-Frédéric Blanc", "Isaac Asimov",
    "F. Scott Fitzgerald", "J.M. Coetzee", "Kazuo Ishiguro", "Hermann Hesse",
    "Robert Louis Stevenson", "Salman Rushdie", "Stephen King", "Aldous Huxley", "Paul Valéry",
    "Thomas Pynchon", "H.P. Lovecraft", "Haruki Murakami", "Nikos Kazantzakis"
];

    // แปลง List ชื่อ เป็น Object ให้เหมือนกับโครงสร้าง API
    allAuthors = priorityList.map((name, index) => ({
        id: `static-${index}`,
        name: name,
        slug: name.toLowerCase().replace(/[^a-z0-9]/g, "") // สร้าง slug ง่ายๆ
    }));

    // ตั้งค่าเริ่มต้นให้แสดงผล
    filteredAuthors = allAuthors;
    currentPage = 0;
    renderFilteredAuthors();
}

// ============================
// RENDER GRID & UI
// ============================
function renderFilteredAuthors() {
    authorGrid.innerHTML = "";

    const totalItems = filteredAuthors.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

    if (currentPage >= totalPages) currentPage = totalPages - 1;
    if (currentPage < 0) currentPage = 0;

    const start = currentPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const items = filteredAuthors.slice(start, end);

    if (items.length === 0) {
        authorGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#888; margin-top:20px;">No authors found.</div>`;
    }

    items.forEach(a => {
        const btn = document.createElement("button");
        btn.className = "author-button";
        btn.textContent = a.name;
        btn.dataset.slug = a.slug;

        // เช็คสถานะ Selected
        if (selectedAuthors.has(a.slug)) btn.classList.add("selected");

        btn.addEventListener("click", () => {
            btn.classList.toggle("selected");
            if (btn.classList.contains("selected")) {
                selectedAuthors.add(a.slug);
            } else {
                selectedAuthors.delete(a.slug);
            }
            saveLocalAuthors(); 
            updateCountAuthors();
        });

        authorGrid.appendChild(btn);
    });

    updateUIControls(totalItems, totalPages);
    updateCountAuthors();
}

function updateUIControls(totalItems, totalPages) {
    totalCountDisplay.textContent = `(Found ${totalItems} authors)`;
    totalCountDisplay.style.color = "#6B7280";
    totalCountDisplay.style.fontSize = "0.95rem";
    totalCountDisplay.style.fontWeight = "400";
    totalCountDisplay.style.marginLeft = "8px";

    const currentDisplay = totalItems === 0 ? 0 : currentPage + 1;
    pageIndicator.textContent = `Page ${currentDisplay} of ${totalPages}`;

    prevArrow.disabled = currentPage === 0;
    nextArrow.disabled = currentPage >= totalPages - 1 || totalItems === 0;
}

function navigateCarousel(direction) {
    const totalItems = filteredAuthors.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    currentPage += direction;
    if (currentPage < 0) currentPage = 0;
    if (currentPage >= totalPages) currentPage = totalPages - 1;

    renderFilteredAuthors();
}

// ============================
// COUNT & NAVIGATION
// ============================
function updateCountAuthors() {
    const count = selectedAuthors.size;
    statusSpan.textContent = `Selected: ${count}`;

    nextBtn.disabled = count < 3;
    nextBtn.style.opacity = count >= 3 ? 1 : 0.5;
    nextBtn.style.cursor = count >= 3 ? "pointer" : "not-allowed";
}

// --- BUTTONS ACTIONS ---
unselectAllBtn.addEventListener("click", () => {
    selectedAuthors.clear();
    saveLocalAuthors();
    renderFilteredAuthors();
    updateCountAuthors();
});

skipBtn.addEventListener("click", () => {
    selectedAuthors.clear();
    saveLocalAuthors(); 
    window.location.href = "manage-pre-book.html";
});

nextBtn.addEventListener("click", () => {
    if (selectedAuthors.size < 3) {
        alert("Please select at least 3 authors or click Skip.");
        return;
    }
    saveLocalAuthors();
    window.location.href = "manage-pre-book.html";
});

backBtn.addEventListener("click", () => {
    saveLocalAuthors(); 
    window.location.href = "manage-pre-genre.html";
});

prevArrow.addEventListener("click", () => navigateCarousel(-1));
nextArrow.addEventListener("click", () => navigateCarousel(1));

// ============================
// SEARCH LOGIC
// ============================
searchInput.addEventListener("input", async () => {
    const keyword = searchInput.value.trim();

    // ถ้าช่องค้นหาว่าง -> ให้ใช้ allAuthors (ซึ่งคือ 100 คนที่ Hardcode ไว้)
    if (keyword === "") {
        filteredAuthors = allAuthors;
    } else {
        // ถ้ามีการพิมพ์ -> ให้ไปเรียก API ค้นหา
        filteredAuthors = await searchAuthorsFromAPI(keyword);
    }

    currentPage = 0;
    renderFilteredAuthors();
});

// ============================
// INITIALIZATION
// ============================
loadLocalAuthors(); 
loadAuthors(); // โหลด 100 รายชื่อทันที ไม่ต้องรอ API