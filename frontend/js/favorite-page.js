// ✅ 1. แก้เป็นโดเมนจริง (ไม่ต้องมี /api ต่อท้ายตรงนี้)
const API_BASE_URL = 'https://reading-journal.xyz';
let currentFavBook = null; 

// เริ่มทำงานเมื่อโหลดหน้าเสร็จ
document.addEventListener("DOMContentLoaded", () => {
  loadUser();       
  loadFavorites();  
  setupGlobalEvents(); 
});

// ===================================================
//  1. GLOBAL UI SETUP & SIDEBAR
// ===================================================
function setupGlobalEvents() {
    // Sidebar Toggle
    const overlay = document.getElementById("overlay");
    if(overlay) overlay.addEventListener("click", toggleSidebar);

    // Close Modals on Outside Click
    window.onclick = function(event) {
        const bookModal = document.getElementById('bookModal');
        const logoutModal = document.getElementById("logoutModal");
        const overlay = document.getElementById("overlay");

        if (event.target === bookModal) closeBookModal();
        if (event.target === logoutModal) closeLogoutModal();
        if (event.target === overlay) toggleSidebar();
    }
}

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("active");
    document.getElementById("overlay").classList.toggle("show");
}

// ===================================================
//  2. LOGOUT LOGIC
// ===================================================
window.openLogoutModal = function(event) {
    if(event) event.preventDefault();
    document.getElementById("logoutModal").classList.add("active");
}

window.closeLogoutModal = function() {
    document.getElementById("logoutModal").classList.remove("active");
}

window.confirmLogoutAction = function() {
    const btn = document.getElementById("confirmLogoutBtn");
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing out...';
    btn.disabled = true;
    setTimeout(() => {
        localStorage.clear();
        window.location.href = "log-in-page.html";
    }, 800);
}

// ===================================================
//  3. BOOK DETAIL MODAL
// ===================================================
window.openBookDetail = function(book) {
    currentFavBook = book;
    const modal = document.getElementById('bookModal');
    const img = document.getElementById('modal-img');
    const title = document.getElementById('modal-title');
    const author = document.getElementById('modal-author');
    const desc = document.getElementById('modal-desc');
    
    img.src = (book.book_image && book.book_image.startsWith('http')) 
        ? book.book_image 
        : "https://via.placeholder.com/150x220?text=No+Image";
        
    title.textContent = book.title || "Untitled";
    author.textContent = "by " + (book.author || "Unknown");
    desc.textContent = book.description || "This book currently has no description available.";
    
    modal.classList.add('active');
}

window.closeBookModal = function() {
    document.getElementById('bookModal').classList.remove('active');
}

// ===================================================
//  4. DATA LOADING (User & Favorites)
// ===================================================
async function loadUser() {
  try {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "log-in-page.html"; return; }

    // ✅ 2. เติม /api ในการเรียก fetch
    const res = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Auth failed");
    const user = await res.json();
    
    const nameEl = document.getElementById("user-name");
    const emailEl = document.getElementById("user-email");
    if(nameEl) nameEl.textContent = user.username || "Unknown";
    if(emailEl) emailEl.textContent = user.email || "No Email";

  } catch (err) {
    localStorage.removeItem("token");
    window.location.href = "log-in-page.html";
  }
}

async function loadFavorites() {
  const token = localStorage.getItem("token");
  const grid = document.getElementById("favorite-grid");
  const emptyMsg = document.getElementById("empty-message");

  if(!grid) return;

  try {
    // ✅ เติม /api
    const res = await fetch(`${API_BASE_URL}/api/favorites`, {
      method: "GET",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
    });

    const books = await res.json();
    grid.innerHTML = "";

    if (!books || books.length === 0) {
      grid.style.display = "none";
      if(emptyMsg) emptyMsg.style.display = "flex"; 
      return;
    }

    grid.style.display = "grid"; 
    if(emptyMsg) emptyMsg.style.display = "none";

    books.forEach(book => {
      const card = createFavoriteCard(book);
      grid.appendChild(card);
    });

  } catch (err) {
    console.error("Error loading favorites:", err);
  }
}

// ===================================================
//  5. CREATE CARD & EVENTS
// ===================================================
function createFavoriteCard(book) {
  const card = document.createElement("div");
  card.classList.add("fav-card");

  const imageUrl = (book.book_image && book.book_image.startsWith('http')) 
    ? book.book_image : "https://via.placeholder.com/150x220?text=No+Cover";
  const targetId = book.favor_id || book.id; 

  card.innerHTML = `
    <div class="fav-img-wrapper" style="cursor: pointer;">
      <img src="${imageUrl}" alt="${book.title}" loading="lazy" />
      <div class="fav-overlay">
         <button class="remove-btn" data-id="${targetId}" data-title="${book.title}">
            <i class="fa-solid fa-trash"></i>
         </button>
      </div>
    </div>
    <div class="fav-info">
      <h3 class="fav-title">${book.title}</h3>
      <p class="fav-author">by ${book.author || "Unknown"}</p>
      <span class="fav-genre">${book.genre || "General"}</span>
    </div>
  `;

  const img = card.querySelector("img");
  img.addEventListener("click", () => {
      window.openBookDetail(book);
  });

  const removeBtn = card.querySelector(".remove-btn");
  removeBtn.addEventListener("click", async (e) => {
    e.stopPropagation(); 
    const idToDelete = removeBtn.getAttribute("data-id");
    const bookTitle = removeBtn.getAttribute("data-title");
    
    if(typeof showConfirm === 'function') {
        const confirmed = await showConfirm(bookTitle);
        if(confirmed) deleteFavorite(idToDelete, card);
    } else if(confirm(`Remove "${bookTitle}"?`)) {
        deleteFavorite(idToDelete, card);
    }
  });

  return card;
}

// ===================================================
//  6. ADD TO LIBRARY LOGIC
// ===================================================
window.addToLibraryFromFav = async function() {
    if (!currentFavBook) return;

    const btn = document.getElementById('addToLibBtn');
    const oldText = btn ? btn.innerHTML : 'Add';
    if(btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';
        btn.disabled = true;
    }

    const payload = {
        user_id: currentFavBook.user_id, 
        title: currentFavBook.title,
        author: currentFavBook.author,
        genre: currentFavBook.genre,
        book_image: currentFavBook.book_image
    };

    if (!payload.user_id) {
         try {
            const token = localStorage.getItem("token");
            // ✅ เติม /api
            const userRes = await fetch(`${API_BASE_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` }});
            const userData = await userRes.json();
            payload.user_id = userData.user_id;
         } catch(e) { console.error("User ID missing"); }
    }

    try {
        // ✅ เติม /api
        const res = await fetch(`${API_BASE_URL}/api/journals/add-by-id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok) {
            showToast("Success", `Added "${payload.title}" to library!`, "success");
            closeBookModal();
        } else {
            showToast("Error", "Failed: " + (result.error || "Unknown error"), "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Error", "Network connection failed", "error");
    } finally {
        if(btn) {
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
    }
}

// ===================================================
//  7. DELETE & TOAST UTILITIES
// ===================================================
async function deleteFavorite(favId, cardElement) {
    const token = localStorage.getItem("token");
    try {
        // ✅ เติม /api
        const res = await fetch(`${API_BASE_URL}/api/favorites/${favId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if(res.ok) {
            showToast("Removed", "Book removed", "success");
            cardElement.remove();
            
            const grid = document.getElementById("favorite-grid");
            if(grid && grid.children.length === 0) {
                grid.style.display = "none";
                document.getElementById("empty-message").style.display = "flex";
            }
        } else {
            showToast("Error", "Failed to remove", "error");
        }
    } catch(err) {
        console.error(err);
        showToast("Error", "Server error", "error");
    }
}

function showConfirm(bookTitle) {
    return new Promise((resolve) => {
        const modal = document.getElementById("custom-confirm-modal");
        const textEl = document.getElementById("confirm-text");
        const btnYes = document.getElementById("btn-confirm-yes");
        const btnCancel = document.getElementById("btn-confirm-cancel");

        textEl.textContent = `Remove "${bookTitle}" from favorites?`;
        modal.classList.add("show");

        const handleYes = () => { cleanup(); resolve(true); };
        const handleCancel = () => { cleanup(); resolve(false); };
        
        const cleanup = () => {
            modal.classList.remove("show");
            btnYes.removeEventListener("click", handleYes);
            btnCancel.removeEventListener("click", handleCancel);
        };

        btnYes.addEventListener("click", handleYes);
        btnCancel.addEventListener("click", handleCancel);
    });
}

function showToast(title, message, type = 'success') {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    let iconClass = type === 'error' ? "fa-circle-exclamation" : "fa-circle-check";
    
    toast.innerHTML = `
        <div class="toast-icon"><i class="fa-solid ${iconClass}"></i></div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "fadeOutRight 0.5s forwards";
        toast.addEventListener("animationend", () => toast.remove());
    }, 3000);
}