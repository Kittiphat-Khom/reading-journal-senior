// ===============================
// GLOBAL ELEMENTS
// ===============================
const selectionPage = document.getElementById('book-selection-page');
const thankYouPage = document.getElementById('thank-you-page');
const prevArrow = document.getElementById('prevArrow');
const nextArrow = document.getElementById('nextArrow');
const statusSpan = document.getElementById('selectionStatus');
const unselectAllBtn = document.getElementById('unselectAllBtn');
const finishBtn = document.getElementById('finishBtn');
const searchInput = document.getElementById('searchInput');

// UI Info Elements
const pageIndicator = document.getElementById("pageIndicator");
const totalCountDisplay = document.getElementById("totalCountDisplay");

// Start Dashboard Button
const startBtn = document.querySelector('.start-btn');

const API_URL = "/api/search";

let currentSlide = 1;
let totalSlidesCount = 1; 
let selectedBooks = new Set(); 

let priorityList = [];
let normalList = [];
let allBooksOriginal = [];

// ===============================
// BACK BUTTON (แก้ไขใหม่)
// ===============================
const backBtn = document.getElementById("backBtn");
if (backBtn) {
    backBtn.addEventListener("click", () => {
        // 1. ล้างค่าในตัวแปร (RAM)
        selectedBooks.clear();
        
        // 2. ล้างค่าใน LocalStorage (สำคัญมาก! ไม่งั้นค่าเก่าจะคาอยู่)
        // ดึงข้อมูล preference เดิมมา
        let pref = JSON.parse(localStorage.getItem("preference") || "{}");
        
        // กำหนดให้หมวด books เป็นอาเรย์ว่างๆ
        pref.books = []; 
        
        // บันทึกทับลงไปใหม่
        localStorage.setItem("preference", JSON.stringify(pref));
        
        // (เผื่อ) ถ้ามีการเก็บแยก key ให้ลบออกด้วย
        localStorage.removeItem("selectedBooks");

        // 3. ย้อนกลับไปหน้า Author
        window.location.href = "manage-pre-author.html";
    });
}

// ===============================
// THANK YOU FUNCTION
// ===============================
function showThankYou() {
    selectionPage.style.display = "none";
    thankYouPage.style.display = "flex";

    if (startBtn) {
        startBtn.disabled = false;
        startBtn.style.cursor = "pointer";
    }
}

if (startBtn) {
    startBtn.addEventListener("click", () => {
        window.location.href = "dashboard-page.html";
    });
}

// ===============================
// PRIORITY BOOKS LIST
// ===============================
const priorityBooks = [
  "Harry Potter and the Sorcerer's Stone", "The Lord of the Rings", "A Game of Thrones",
  "The Hobbit", "The Name of the Wind", "1984", "To Kill a Mockingbird", "The Hunger Games",
  "The Da Vinci Code", "Pride and Prejudice", "The Catcher in the Rye", "The Great Gatsby",
  "The Fault in Our Stars", "The Alchemist", "Brave New World", "Dune", "Mistborn",
  "The Shining", "Good Omens", "American Gods", "The Chronicles of Narnia", "The Kite Runner",
  "Life of Pi", "The Girl with the Dragon Tattoo", "The Book Thief", "The Maze Runner",
  "The Perks of Being a Wallflower", "Ready Player One", "The Road", "The Handmaid's Tale",
  "The Giver", "Ender's Game", "The Stand", "It", "The Martian", "Angels & Demons",
  "Looking for Alaska", "The Silent Patient", "The Midnight Library", "Where the Crawdads Sing",
  "The Outsiders", "The Girl on the Train", "Gone Girl", "The Help", "The Secret Life of Bees",
  "The Old Man and the Sea", "Moby Dick", "Fahrenheit 451", "The Picture of Dorian Gray",
  "The Color Purple", "The Little Prince", "The Stranger", "Norwegian Wood",
];

function norm(s) {
    if (!s) return "";
    return s.toString().toLowerCase().normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// ===============================
// GRAPHQL SEARCH
// ===============================
async function fetchBooks(keyword = "") {
    const query = `
        query SearchBooks($keyword: String!, $page: Int!) {
            search(query: $keyword, query_type: "Book", page: $page) {
                results
            }
        }
    `;

    let page = 1;
    const MAX_PAGE = 3;
    let allHits = [];

    while (page <= MAX_PAGE) {
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query,
                    variables: { keyword, page }
                })
            });

            const json = await res.json();
            const results = json?.data?.search?.results;
            const hits = results?.hits;

            if (!Array.isArray(hits) || hits.length === 0) break;
            allHits.push(...hits.map(h => h.document));

            if (hits.length < 25) break;
            page++;

        } catch (err) {
            console.error("Fetch error:", err);
            break;
        }
    }

    return allHits
        .filter(Boolean)
        .filter(doc =>
            doc.image &&
            typeof doc.image.url === "string" &&
            doc.image.url.trim() !== "" &&
            doc.image.url.toLowerCase() !== "no image"
        )
        .map(doc => ({
            id: doc.id || doc.slug || crypto.randomUUID(),
            title: doc.title || "Untitled",
            image: { url: doc.image?.url },
            contributions: doc.contributions || []
        }));
}

// ===============================
// LOAD WITH PRIORITY
// ===============================
async function loadBooks() {
    totalCountDisplay.textContent = "Loading...";
    const results = await fetchBooks("");

    if (!results || results.length === 0) {
        allBooksOriginal = [];
        renderBooksToSlides([]);
        return;
    }

    const apiList = results.slice();
    const usedIds = new Set();

    priorityList = [];
    normalList = [];

    const apiNormIndex = apiList.map(b => ({ book: b, n: norm(b.title) }));

    for (const p of priorityBooks) {
        const pn = norm(p);
        let match = apiNormIndex.find(item =>
            item.n.includes(pn) || pn.includes(item.n)
        );

        if (!match) {
            const words = pn.split(" ").filter(w => w.length > 2);
            match = apiNormIndex.find(item =>
                item.n && words.some(w => item.n.includes(w))
            );
        }

        if (match && !usedIds.has(match.book.id)) {
            priorityList.push(match.book);
            usedIds.add(match.book.id);
        }
    }

    for (const b of apiList) {
        if (!usedIds.has(b.id)) {
            normalList.push(b);
            usedIds.add(b.id);
        }
    }

    const merged = [];
    const seen = new Set();

    for (const b of [...priorityList, ...normalList]) {
        if (!seen.has(b.id)) {
            seen.add(b.id);
            merged.push(b);
        }
    }

    allBooksOriginal = merged;
    renderBooksToSlides(merged);
}

// ===============================
// RENDER SLIDES
// ===============================
function renderBooksToSlides(list) {
    const itemsPerPage = 10;
    const totalSlides = Math.max(1, Math.ceil(list.length / itemsPerPage));
    totalSlidesCount = totalSlides; 

    // Update Found Count
    totalCountDisplay.textContent = `(Found ${list.length} books)`;

    const container = document.getElementById("bookGridContainer");
    container.innerHTML = "";

    for (let slide = 0; slide < totalSlides; slide++) {
        const slideDiv = document.createElement("div");
        slideDiv.classList.add("genre-grid", "book-slide");
        slideDiv.dataset.slide = slide + 1;

        const pageBooks = list.slice(slide * itemsPerPage, slide * itemsPerPage + itemsPerPage);

        pageBooks.forEach(book => {
            const btn = document.createElement("button");
            btn.classList.add("genre-button");
            btn.setAttribute("data-book-id", book.id);
            btn.title = book.title;

            const imgUrl = book.image?.url || "https://placehold.co/150x220?text=No+Image";
            btn.style.backgroundImage = `url('${imgUrl}')`;
            btn.style.backgroundSize = "cover";
            btn.style.backgroundPosition = "center";

            btn.addEventListener("click", () => {
                if (selectedBooks.has(book.id)) {
                    selectedBooks.delete(book.id);
                    btn.classList.remove("selected");
                } else {
                    selectedBooks.add(book.id);
                    btn.classList.add("selected");
                }
                updateCount();
            });

            slideDiv.appendChild(btn);
        });

        container.appendChild(slideDiv);
    }

    document.querySelectorAll('.genre-button').forEach(btn => {
        const id = btn.getAttribute('data-book-id');
        if (selectedBooks.has(id)) {
            btn.classList.add('selected');
        }
    });

    setupSlides();
}

// ===============================
// SLIDES SETUP
// ===============================
function setupSlides() {
    const slides = document.querySelectorAll('.book-slide');
    slides.forEach((slide, i) => {
        slide.style.display = i === 0 ? "grid" : "none";
    });

    currentSlide = 1;
    updatePaginationText(); 

    prevArrow.disabled = true;
    nextArrow.disabled = slides.length <= 1;

    prevArrow.style.opacity = 0.3;
    nextArrow.style.opacity = nextArrow.disabled ? 0.3 : 1;
}

// ===============================
// UPDATE PAGINATION TEXT
// ===============================
function updatePaginationText() {
    pageIndicator.textContent = `Page ${currentSlide} of ${totalSlidesCount}`;
}

// ===============================
// UPDATE COUNT & BUTTONS
// ===============================
function updateCount() {
    statusSpan.textContent = `Selected: ${selectedBooks.size}`;
    
    finishBtn.disabled = selectedBooks.size < 3;
    finishBtn.style.opacity = finishBtn.disabled ? 0.6 : 1;
}

// ===============================
// SLIDE NAVIGATION
// ===============================
function navigateCarousel(direction) {
    const slides = document.querySelectorAll('.book-slide');
    const newSlide = currentSlide + direction;

    if (newSlide < 1 || newSlide > slides.length) return;

    document.querySelector(`.book-slide[data-slide="${currentSlide}"]`).style.display = "none";
    currentSlide = newSlide;
    document.querySelector(`.book-slide[data-slide="${currentSlide}"]`).style.display = "grid";

    updatePaginationText(); 

    prevArrow.disabled = currentSlide === 1;
    nextArrow.disabled = currentSlide === slides.length;

    prevArrow.style.opacity = prevArrow.disabled ? 0.3 : 1;
    nextArrow.style.opacity = nextArrow.disabled ? 0.3 : 1;
}

// ===============================
// DESELECT ALL
// ===============================
unselectAllBtn.addEventListener("click", () => {
    selectedBooks.clear();
    document.querySelectorAll('.genre-button.selected').forEach(btn =>
        btn.classList.remove('selected')
    );
    updateCount();
});

// ===============================
// SEARCH
// ===============================
let searchTimeout = null;
searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const keyword = searchInput.value.trim();
        if (!keyword) {
            renderBooksToSlides(allBooksOriginal);
            return;
        }
        
        totalCountDisplay.textContent = "Searching...";
        const books = await fetchBooks(keyword);
        
        if (!books || books.length === 0) {
            document.getElementById("bookGridContainer").innerHTML =
                "<div style='padding:20px; text-align:center; color:#777;'>No books found</div>";
            totalCountDisplay.textContent = "(Found 0 books)";
            pageIndicator.textContent = "Page 0 of 0";
            return;
        }

        renderBooksToSlides(books);
    }, 300);
});

// ===============================
// FINISH — SAVE TO BACKEND
// ===============================
finishBtn.addEventListener("click", async () => {
    if (selectedBooks.size < 3) return;

    let selectedGenres = JSON.parse(localStorage.getItem("selectedGenres") || "[]");
    let selectedAuthors = JSON.parse(localStorage.getItem("selectedAuthors") || "[]");
    let selectedBooksArray = Array.from(selectedBooks);

    if (!Array.isArray(selectedGenres)) selectedGenres = [];
    if (!Array.isArray(selectedAuthors)) selectedAuthors = [];
    if (!Array.isArray(selectedBooksArray)) selectedBooksArray = [];

    const token = localStorage.getItem("token");
    if (!token) {
        alert("You must login first.");
        return;
    }

    try {
        const res = await fetch("/api/preferences/save", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                preferred_genres: selectedGenres,
                preferred_authors: selectedAuthors,
                preferred_books: selectedBooksArray
            })
        });

        const json = await res.json();
        if (json.error) {
            alert("Error saving preferences");
            return;
        }

        showThankYou();

    } catch (err) {
        console.error("Save error:", err);
        alert("Failed to save preferences");
    }
});

// ===============================
// INITIAL LOAD
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    selectionPage.style.display = "block";
    thankYouPage.style.display = "none";
    loadBooks();
});