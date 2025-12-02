// ===================================================
//  GLOBAL VARIABLES
// ===================================================
let currentUser = null;
let currentBookData = null;

// ===================================================
//  INITIALIZATION
// ===================================================
document.addEventListener("DOMContentLoaded", () => {
    loadUser();
    loadAllCategories();
    setupModalButtons();
    setupModalClose();
    
    // ✅ Setup Logout
    setupLogoutModal();

    // ✅ ตั้งค่าปุ่ม OK ของ Custom Alert
    const btnAlert = document.getElementById("btn-alert-ok");
    if(btnAlert) btnAlert.addEventListener("click", closeAlert);
});

// ===================================================
//  ✅ CUSTOM ALERT HELPER
// ===================================================
function showAlert(title, message, type = 'success') {
    return new Promise((resolve) => {
        const modal = document.getElementById("custom-alert-modal");
        const titleEl = document.getElementById("alert-title");
        const msgEl = document.getElementById("alert-message");
        const iconEl = document.getElementById("alert-icon");
        const btn = document.getElementById("btn-alert-ok");

        titleEl.textContent = title;
        msgEl.textContent = message;

        if (type === 'success') {
            iconEl.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i>';
        } else if (type === 'error') {
            iconEl.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color: #ef4444;"></i>';
        } else {
            iconEl.innerHTML = '<i class="fa-solid fa-circle-info" style="color: #3b82f6;"></i>';
        }

        modal.style.display = "flex"; 
        btn.focus();
        modal.dataset.resolve = resolve;
    });
}

function closeAlert() {
    const modal = document.getElementById("custom-alert-modal");
    modal.style.display = "none";
}

// ===================================================
//  🔐 USER AUTHENTICATION
// ===================================================
async function loadUser() {
    try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/users/me", {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Auth failed");
        const user = await res.json();
        currentUser = user;
        const userNameEl = document.getElementById("user-name");
        const userEmailEl = document.getElementById("user-email");
        if (userNameEl) userNameEl.textContent = user.username || "Unknown User";
        if (userEmailEl) userEmailEl.textContent = user.email || "-";
    } catch (err) {
        console.error("Error loading user:", err);
        const userNameEl = document.getElementById("user-name");
        const userEmailEl = document.getElementById("user-email");
        if (userNameEl) userNameEl.textContent = "Guest";
        if (userEmailEl) userEmailEl.textContent = "Not logged in";
        currentUser = null;
    }
}

// ===================================================
//  🛠️ HELPER: จัดรูปแบบข้อมูลหนังสือ
// ===================================================
function mapBookData(b, defaultGenre = "General") {
    const rawDesc = b.default_cover_edition?.description || b.description || "";
    const stripped = rawDesc.replace(/<[^>]*>/g, "").trim();
    const shortDesc = stripped.length > 300 ? stripped.slice(0, 297) + "..." : (stripped || "No description available.");

    return {
        title: b.title || "Untitled",
        cover: b.image?.url || "",
        author: b.contributions?.[0]?.author?.name || "Unknown Author",
        description: shortDesc,
        genre: defaultGenre
    };
}

// ===================================================
//  🔍 SEARCH SYSTEM (GraphQL)
// ===================================================
const searchBtn = document.getElementById("search-btn");
const searchInput = document.getElementById("search-input");

if (searchBtn) searchBtn.addEventListener("click", runSearch);
if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") runSearch();
    });
}

async function runSearch() {
    const term = document.getElementById("search-input").value.trim();
    if (!term) return;

    logSearchToBackend(term);

    const resultSection = document.getElementById("search-result-section");
    const grid = document.getElementById("search-results");

    if (grid) grid.innerHTML = "";

    const books = await searchBooks(term);

    if (!books || books.length === 0) {
        if (grid) grid.innerHTML = `<p style="color:#fff; padding:10px;">No result found.</p>`;
        if (resultSection) resultSection.style.display = "block";
        return;
    }

    if (grid) {
        books.forEach(b => {
            grid.appendChild(createBookCard(b));
        });
    }

    if (resultSection) resultSection.style.display = "block";
}

async function searchBooks(searchTerm, page = 1) {
    const queryTerm = searchTerm?.trim() || "book";
    const query = `
    query Search($query: String!, $page: Int!) {
      search(query: $query, query_type: "Book", per_page: 30, page: $page) {
        results
      }
    }
  `;

    try {
        const response = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query,
                variables: { query: queryTerm, page }
            })
        });

        if (!response.ok) return [];

        const json = await response.json();
        let raw = json.data?.search?.results;
        if (typeof raw === "string") raw = JSON.parse(raw);

        const hits = raw?.hits || [];

        return hits
            .map(item => {
                const doc = item.document || {};
                return {
                    title: doc.title || "Untitled",
                    cover: doc.image?.url || "",
                    author: doc.author_names?.[0] || doc.authors?.[0] || "Unknown Author",
                    description: doc.description || "",
                    genre: "General"
                };
            })
            .filter(b =>
                b.cover &&
                b.cover.startsWith("https://assets.hardcover.app/") &&
                /\.(jpg|jpeg|png|webp)$/i.test(b.cover)
            );

    } catch (error) {
        console.error("GraphQL Error:", error);
        return [];
    }
}

// ===================================================
//  📚 CATEGORY FETCHING
// ===================================================

async function fetchTrendingBooks() {
    const query = `query GetTrendingBooks { books(where: { users_read_count: { _gte: 50 } } order_by: { users_read_count: desc } limit: 150 ) { id title description image { url } contributions { author { name } } } }`;
    try {
        const res = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
        if (!res.ok) return [];
        const json = await res.json();
        return (json.data?.books || []).map(b => mapBookData(b, "Trending")).filter(b => b.cover.startsWith("https://assets.hardcover.app/"));
    } catch (err) { console.error(err); return []; }
}

async function fetchNewPopularBooks() {
    const query = `query GetNewAndPopularBooks { books(where: { _and: [ { created_at: { _gte: "2024-01-01" }}, { users_read_count: { _gte: 5 }} ] } order_by: { created_at: desc } limit: 150 ) { id title created_at users_read_count image { url } contributions { author { name } } description } }`;
    try {
        const res = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
        if (!res.ok) return [];
        const json = await res.json();
        return (json.data?.books || []).map(b => mapBookData(b, "New & Popular")).filter(b => b.cover.startsWith("https://assets.hardcover.app/"));
    } catch (err) { console.error(err); return []; }
}

async function fetchTopRatedBooks() {
    const query = `query GetTopRatedBooks { books(where: { rating: { _gte: 4.5 }, description: { _is_null: false, _neq: "" } } order_by: { rating: desc } limit: 150 ) { id title rating image { url } contributions { author { name } } description } }`;
    try {
        const res = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
        if (!res.ok) return [];
        const json = await res.json();
        return (json.data?.books || []).map(b => mapBookData(b, "Top Rated")).filter(b => b.cover.startsWith("https://assets.hardcover.app/"));
    } catch (err) { console.error(err); return []; }
}

async function fetchBooksByGenre(genreName) {
    const query = `query GetTopRatedBooksByGenre($genre: String!) { books(where: { _and: [ { rating: { _gte: 3.8 }}, { list_books: { list: { name: { _eq: $genre }}}} ] } order_by: { description: asc } limit: 150 ) { id title rating description image { url } contributions { author { name } } } }`;
    try {
        const res = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, variables: { genre: genreName } })
        });
        if (!res.ok) return [];
        const json = await res.json();
        return (json.data?.books || []).map(b => mapBookData(b, genreName)).filter(b => b.cover.startsWith("https://assets.hardcover.app/"));
    } catch (err) {
        console.error("Genre fetch error for", genreName, err);
        return [];
    }
}

// ===================================================
//  📁 CATEGORY MANAGEMENT
// ===================================================
const genreMap = {
    "Fantasy": "Fantasy",
    "Mystery & Thriller": "Mystery & Thriller",
    "Romance": "Romance",
    "Sci-Fi Spotlight": "Science Fiction",
    "Young Adult": "Young Adult",
    "Adventure": "Adventure",
    "Comic & Manga": "Manga"
};

function loadAllCategories() {
    loadCategoryBooks("Trending Now", "cat-trending");
    loadCategoryBooks("Top Rated", "cat-top-rated");
    loadCategoryBooks("New & Popular", "cat-new-popular");

    loadCategoryBooks("Fantasy", "cat-fantasy");
    loadCategoryBooks("Mystery & Thriller", "cat-mystery");
    loadCategoryBooks("Romance", "cat-romance");
    loadCategoryBooks("Sci-Fi Spotlight", "cat-scifi");
    loadCategoryBooks("Young Adult", "cat-young-adult");
    loadCategoryBooks("Adventure", "cat-adventure");
    loadCategoryBooks("Comic & Manga", "cat-comic");
}

async function loadCategoryBooks(categoryName, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let books = [];
    if (categoryName === "Trending Now") books = await fetchTrendingBooks();
    else if (categoryName === "New & Popular") books = await fetchNewPopularBooks();
    else if (categoryName === "Top Rated") books = await fetchTopRatedBooks();
    else if (genreMap[categoryName]) books = await fetchBooksByGenre(genreMap[categoryName]);

    if (!books || books.length === 0) return;

    const displayBooks = books.slice(0, 30);
    container.innerHTML = "";

    displayBooks.forEach(book => container.appendChild(createBookCard(book)));
}

// ===================================================
//  ✨ CREATE BOOK CARD
// ===================================================
function createBookCard(book) {
    const card = document.createElement("div");
    card.classList.add("book-card");

    const imageUrl = book.cover || book.image || book.coverImage;

    card.innerHTML = `
      <div class="card-cover" style="background-image: url('${imageUrl}');"></div>
      <div class="card-info">
          <div class="card-title" title="${book.title}">${book.title}</div>
          <div class="card-author">${book.author}</div>
      </div>
  `;

    card.addEventListener("click", () => {
        openBookModal({
            ...book, 
            image: imageUrl, 
            genre: book.genre || "General"
        });
    });

    return card;
}

function scrollGrid(containerId, direction) {
    const container = document.getElementById(containerId);
    const scrollAmount = 400;

    if (direction === 'left') {
        container.scrollLeft -= scrollAmount;
    } else {
        container.scrollLeft += scrollAmount;
    }
}

function scrollLeftSearch() { scrollGrid("search-results", "left"); }
function scrollRightSearch() { scrollGrid("search-results", "right"); }

// ===================================================
//  🖼️ MODAL & ADD TO DB LOGIC
// ===================================================

function openBookModal(book) {
    currentBookData = book;

    document.getElementById("modalImage").src = book.image;
    document.getElementById("modalTitle").textContent = book.title;
    document.getElementById("modalAuthor").textContent = book.author;
    document.getElementById("modalDescription").textContent = book.description || "No description available.";

    document.getElementById("bookModal").style.display = "flex";
}

function setupModalButtons() {
    const addLibBtn = document.getElementById("addLibraryBtn");
    if (addLibBtn) {
        const newBtn = addLibBtn.cloneNode(true);
        addLibBtn.parentNode.replaceChild(newBtn, addLibBtn);
        newBtn.addEventListener("click", () => addToJournal());
    }

    const favBtn = document.getElementById("addFavouriteBtn");
    if (favBtn) {
        const newFav = favBtn.cloneNode(true);
        favBtn.parentNode.replaceChild(newFav, favBtn);
        newFav.addEventListener("click", () => addToFavorite());
    }
}

function setupModalClose() {
    const modal = document.getElementById("bookModal");
    const closeBtn = document.querySelector("#bookModal .close-btn");

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });
}

// ===================================================
//  🚀 API ACTIONS
// ===================================================

async function addToJournal() {
    if (!currentUser) {
        await showAlert("Please Login", "You must be logged in to add books.", "info");
        return;
    }
    if (!currentBookData) return;

    // ส่ง description ไปด้วย (เผื่อ backend พร้อมรับ)
    const payload = {
        user_id: currentUser.user_id || currentUser.id,
        title: currentBookData.title,
        author: currentBookData.author,
        genre: currentBookData.genre,
        book_image: currentBookData.image,
        description: currentBookData.description || "No description available."
    };

    try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/journals/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });


        if (res.ok) {
            await showAlert("Success!", "Added to Reading Journal! 📚", "success");
            document.getElementById("bookModal").style.display = "none";
        } else {
            const err = await res.json();
            await showAlert("Error", "Failed to add: " + (err.message || "Unknown Error"), "error");
        }
    } catch (error) {
        console.error("Error adding to journal:", error);
        await showAlert("Connection Error", "Could not connect to server.", "error");
    }
}

// ✅ FIX: ส่ง Description ไป Favorite และแก้ URL เป็น /toggle
async function addToFavorite() {
    if (!currentUser) {
        await showAlert("Please Login", "You must be logged in to add favorites.", "info");
        return;
    }
    if (!currentBookData) return;

    const payload = {
        user_id: currentUser.user_id || currentUser.id, // ✅ ต้องมี user_id สำหรับ /toggle
        title: currentBookData.title,
        author: currentBookData.author,
        genre: currentBookData.genre,
        book_image: currentBookData.image,
        description: currentBookData.description || "No description available." // ✅ ส่ง description ไปด้วย
    };

    try {
        const token = localStorage.getItem("token");
        // ✅ ยิงไปที่ /api/favorites/toggle (ตาม Backend ที่แก้ไว้)
        const res = await fetch("/api/favorites/toggle", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const result = await res.json();
            // เช็คสถานะว่า Added หรือ Removed แล้วแจ้งเตือนให้ถูก
            if (result.status === 'added') {
                 await showAlert("Success!", "Added to Favorites! ❤️", "success");
            } else {
                 await showAlert("Removed", "Removed from Favorites", "info");
            }
            document.getElementById("bookModal").style.display = "none";
        } else {
            const err = await res.json();
            await showAlert("Error", "Failed to add: " + (err.message || "Unknown Error"), "error");
        }
    } catch (error) {
        console.error("Error adding to favorites:", error);
        await showAlert("Connection Error", "Could not connect to server.", "error");
    }
}

function logSearchToBackend(queryText) {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;

    let userId = null;
    try { userId = JSON.parse(userStr).id || JSON.parse(userStr).user_id; } catch (e) { }

    if (!userId || !queryText || queryText.trim().length < 2) return;

    fetch('/api/search/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: userId,
            query: queryText
        })
    }).catch(err => console.warn("Log search failed:", err));
}

async function openSeeAllModal(categoryName) {
    const modal = document.getElementById("seeAllModal");
    const titleEl = document.getElementById("seeAllTitle");
    const gridEl = document.getElementById("seeAllGrid");

    titleEl.textContent = categoryName;
    gridEl.innerHTML = '<p style="text-align:center; width:100%; color:#666; grid-column: 1/-1; margin-top:20px;">Loading books...</p>';
    modal.style.display = "flex";

    let books = [];

    if (categoryName === "Trending Now") books = await fetchTrendingBooks();
    else if (categoryName === "New & Popular") books = await fetchNewPopularBooks();
    else if (categoryName === "Top Rated") books = await fetchTopRatedBooks();
    else if (genreMap[categoryName]) books = await fetchBooksByGenre(genreMap[categoryName]);

    grid.innerHTML = "";

    if (!books || books.length === 0) {
        grid.innerHTML = '<p style="text-align:center; width:100%; grid-column: 1/-1;">No books found.</p>';
        return;
    }

    books.forEach(book => {
        const card = createBookCard(book);
        grid.appendChild(card);
    });
}

function closeSeeAllModal() {
    document.getElementById("seeAllModal").style.display = "none";
}

window.addEventListener("click", (event) => {
    const seeAllModal = document.getElementById("seeAllModal");
    if (event.target === seeAllModal) {
        seeAllModal.style.display = "none";
    }
});

// ===================================================
//  🔥 LOGOUT LOGIC (Global Functions) 🔥
// ===================================================

function setupLogoutModal() {
    // Placeholder for setup logic if needed
}

// 1. ฟังก์ชันเปิด Modal
window.openLogoutModal = function(event) {
    if(event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const modal = document.getElementById("logoutModal");
    if (modal) {
        modal.classList.add("active");
    }
}

// 2. ฟังก์ชันปิด Modal
window.closeLogoutModal = function() {
    const modal = document.getElementById("logoutModal");
    if (modal) modal.classList.remove("active");
}

// 3. ฟังก์ชันยืนยันการออกระบบ
window.confirmLogoutAction = function() {
    const btn = document.getElementById("confirmLogoutBtn");
    if(btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing out...';
        btn.disabled = true;
    }
    
    setTimeout(() => {
        localStorage.clear();
        window.location.href = "log-in-page.html";
    }, 800);
}

// ปิด Modal เมื่อคลิกพื้นหลัง
window.addEventListener("click", (e) => {
    const modal = document.getElementById("logoutModal");
    if (e.target === modal) {
        closeLogoutModal();
    }
});