// js/dashboard-page.js — Dashboard: journal list, pagination, popup

let allBooksData = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

// ============================================================
// UTILITIES
// ============================================================

function formatDate(isoString) {
    if (!isoString) return "Just now";
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function showConfirm() {
    return new Promise((resolve) => {
        const modal = document.getElementById("custom-confirm-modal");
        const btnYes = document.getElementById("btn-confirm-yes");
        const btnCancel = document.getElementById("btn-confirm-cancel");
        modal.style.display = "flex";
        const handleYes = () => { cleanup(); resolve(true); };
        const handleCancel = () => { cleanup(); resolve(false); };
        const cleanup = () => {
            modal.style.display = "none";
            btnYes.removeEventListener("click", handleYes);
            btnCancel.removeEventListener("click", handleCancel);
        };
        btnYes.addEventListener("click", handleYes);
        btnCancel.addEventListener("click", handleCancel);
    });
}

// ============================================================
// LOAD & RENDER
// ============================================================

async function loadJournals() {
    const token = localStorage.getItem("token");
    const grid = document.getElementById("book-grid");
    const totalCountEl = document.getElementById("total-books");
    const paginationEl = document.getElementById("pagination-controls");

    grid.innerHTML = `<p style="color:#555; grid-column:1/-1; text-align:center;">⏳ Loading...</p>`;

    try {
        const res = await fetch("/api/journals", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        allBooksData = await res.json();

        if (totalCountEl) totalCountEl.innerHTML = `<i class="fa-solid fa-book-open"></i> Total Books: ${allBooksData.length}`;

        if (!allBooksData || allBooksData.length === 0) {
            paginationEl.style.display = "none";
            renderEmptyState(grid);
            return;
        }
        currentPage = 1;
        renderPage(currentPage);
    } catch (err) {
        console.error("Error loading books:", err);
        grid.innerHTML = `<p style="color:red;">❌ Error loading data</p>`;
    }
}

function renderPage(page) {
    const grid = document.getElementById("book-grid");
    const paginationEl = document.getElementById("pagination-controls");
    const prevBtn = document.getElementById("prev-page-btn");
    const nextBtn = document.getElementById("next-page-btn");
    const pageInfo = document.getElementById("page-indicator");

    grid.innerHTML = "";
    const totalItems = allBooksData.length + 1;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const booksToShow = allBooksData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (booksToShow.length === 0) grid.classList.add("center-single-item");
    else grid.classList.remove("center-single-item");

    booksToShow.forEach(book => grid.appendChild(createBookCard(book)));

    if (booksToShow.length < ITEMS_PER_PAGE) {
        const holder = document.createElement("div");
        holder.className = "book-item placeholder";
        holder.onclick = () => openJournalPopup();
        holder.innerHTML = `<div class="placeholder-content"><i class="fa-solid fa-plus placeholder-icon"></i><h3>Add New Book</h3></div>`;
        grid.appendChild(holder);
    }

    if (totalPages > 1) {
        paginationEl.style.display = "flex";
        pageInfo.textContent = `Page ${page} of ${totalPages}`;
        prevBtn.disabled = (page === 1);
        nextBtn.disabled = (page === totalPages);
    } else {
        paginationEl.style.display = "none";
    }
}

function changePage(direction) {
    const totalPages = Math.ceil((allBooksData.length + 1) / ITEMS_PER_PAGE);
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderPage(currentPage);
    }
}

function createBookCard(book) {
    const item = document.createElement("div");
    item.className = "book-item";
    item.onclick = () => openJournalPopup(book.id);
    const displayImage = book.book_image || book.image || 'https://placehold.co/150x220?text=No+Image';
    const genre = book.genre && book.genre !== 'unknown-genre' ? book.genre : 'Book';
    const dateStr = formatDate(book.updated_at);
    item.innerHTML = `
        <div class="book-cover-wrapper">
            <img src="${displayImage}" alt="${book.title}" onerror="this.onerror=null; this.src='https://placehold.co/150x220?text=Error';"/>
            <div class="action-overlay">
                <button class="delete-btn" onclick="deleteJournal(event, ${book.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
        <div class="book-info">
            <h3>${book.title}</h3>
            <p>${book.author || "Unknown Author"}</p>
            <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
                <span class="genre-badge">${genre}</span>
                <div class="book-date"><i class="fa-regular fa-clock"></i> Last edited: ${dateStr}</div>
            </div>
        </div>
    `;
    return item;
}

function renderEmptyState(grid) {
    grid.innerHTML = "";
    grid.classList.add("center-single-item");
    const holder = document.createElement("div");
    holder.className = "book-item placeholder";
    holder.onclick = () => openJournalPopup();
    holder.innerHTML = `<div class="placeholder-content"><i class="fa-solid fa-plus placeholder-icon"></i><h3>Add your first book</h3></div>`;
    grid.appendChild(holder);
}

// ============================================================
// DELETE
// ============================================================

async function deleteJournal(event, id) {
    event.stopPropagation();
    const confirmed = await showConfirm();
    if (!confirmed) return;
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/api/journals/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { showToast("Success", "Journal deleted successfully", "success"); loadJournals(); }
        else { showToast("Error", "Failed to delete journal", "error"); }
    } catch (err) {
        console.error(err);
        showToast("Error", "Server connection failed", "error");
    }
}

// ============================================================
// JOURNAL POPUP
// ============================================================

function openJournalPopup(bookId) {
    const popup = document.getElementById("journalPopup");
    popup.classList.add("show");
    document.getElementById("journalFrame").src = bookId ? `journal-detail.html?id=${bookId}` : "journal-detail.html";
}

function closeJournalPopup() {
    document.getElementById("journalPopup").classList.remove("show");
    document.getElementById("journalFrame").src = "";
}

// ============================================================
// LOGOUT
// ============================================================

window.openLogoutModal = function(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    document.getElementById("logoutModal").classList.add("active");
};

window.closeLogoutModal = function() {
    document.getElementById("logoutModal").classList.remove("active");
};

window.confirmLogoutAction = function() {
    const btn = document.getElementById("confirmLogoutBtn");
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing out...'; btn.disabled = true; }
    setTimeout(() => { localStorage.clear(); window.location.href = "log-in-page.html"; }, 800);
};

window.addEventListener("click", (e) => {
    if (e.target === document.getElementById("logoutModal")) closeLogoutModal();
});

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "log-in-page.html"; return; }
    await loadJournals();
});

window.addEventListener("message", async (event) => {
    if (event.data === "journalAdded" || event.data === "journalUpdated") {
        closeJournalPopup();
        await loadJournals();
        showToast("Saved", "Journal saved successfully", "success");
    }
    if (event.data === "closePopup") closeJournalPopup();
});
