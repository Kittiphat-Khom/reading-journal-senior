/* js/favorite-page.js - Full Fixed Version */

const API_BASE_URL = 'https://reading-journal.xyz';

// Global Variables
let currentFavBook = null;
let currentUser = null; // เก็บ User ไว้ใช้ ไม่ต้อง fetch ซ้ำบ่อยๆ

// ===================================================
//  INITIALIZATION
// ===================================================
document.addEventListener("DOMContentLoaded", () => {
    loadUser();       
    loadFavorites();  
    setupGlobalEvents(); 
});

// ===================================================
//  1. GLOBAL UI SETUP & EVENTS
// ===================================================
function setupGlobalEvents() {
    // Sidebar Toggle (เผื่อกรณีคลิก overlay)
    const overlay = document.getElementById("overlay");
    if(overlay) overlay.addEventListener("click", toggleSidebar);

    // ✅ ใช้ addEventListener แทน onclick เพื่อไม่ให้ทับกับ layoutsidebar.js
    window.addEventListener("click", (event) => {
        const bookModal = document.getElementById('bookModal');
        const logoutModal = document.getElementById("logoutModal");
        const overlay = document.getElementById("overlay");
        const sidebar = document.getElementById("sidebar");

        // ปิด Modal หนังสือเมื่อคลิกพื้นหลัง
        if (bookModal && event.target === bookModal) closeBookModal();
        
        // ปิด Modal Logout เมื่อคลิกพื้นหลัง
        if (logoutModal && event.target === logoutModal) closeLogoutModal();

        // ปิด Sidebar เมื่อคลิก Overlay
        if (sidebar && sidebar.classList.contains("active") && event.target === overlay) {
            toggleSidebar();
        }
    });
}

// ต้องเป็น Global function เพราะ HTML เรียกใช้ onclick="toggleSidebar()"
window.toggleSidebar = function() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    
    // เช็คก่อนว่ามี element ไหม (บางที layoutsidebar.js อาจจะจัดการเรื่องนี้แล้ว)
    if(sidebar) sidebar.classList.toggle("active");
    if(overlay) overlay.classList.toggle("show");
}

// ===================================================
//  2. LOGOUT LOGIC (Global Functions for HTML onclick)
// ===================================================
window.openLogoutModal = function(event) {
    if(event) {
        event.preventDefault();
        event.stopPropagation(); // กันไม่ให้ event bubble ไปโดน listener อื่น
    }
    const modal = document.getElementById("logoutModal");
    if(modal) modal.classList.add("active");
}

window.closeLogoutModal = function() {
    const modal = document.getElementById("logoutModal");
    if(modal) modal.classList.remove("active");
}

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
    
    if(!modal) return;

    img.src = (book.book_image && book.book_image.startsWith('http')) 
        ? book.book_image 
        : "https://via.placeholder.com/150x220?text=No+Image";
        
    title.textContent = book.title || "Untitled";
    author.textContent = "by " + (book.author || "Unknown");
    desc.textContent = book.description || "This book currently has no description available.";
    
    modal.classList.add('active');
}

window.closeBookModal = function() {
    const modal = document.getElementById('bookModal');
    if(modal) modal.classList.remove('active');
}

// ===================================================
//  4. DATA LOADING (User & Favorites)
// ===================================================
async function loadUser() {
  try {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "log-in-page.html"; return; }

    const res = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Auth failed");
    
    const user = await res.json();
    currentUser = user; // ✅ เก็บเข้าตัวแปร Global ไว้ใช้ต่อ
    
    const nameEl = document.getElementById("user-name");
    const emailEl = document.getElementById("user-email");
    if(nameEl) nameEl.textContent = user.username || "Unknown";
    if(emailEl) emailEl.textContent = user.email || "No Email";

  } catch (err) {
    console.warn("User load error:", err);
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
    const res = await fetch(`${API_BASE_URL}/api/favorites`, {
      method: "GET",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
    });

    if(res.status === 401) {
        window.location.href = "log-in-page.html";
        return;
    }

    const books = await res.json();
    grid.innerHTML = "";

    // ✅ ป้องกัน Error: ตรวจสอบว่า books เป็น Array จริงหรือไม่
    if (!books || !Array.isArray(books) || books.length === 0) {
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
    if(grid) grid.innerHTML = '<p style="color:red; text-align:center; grid-column:1/-1;">Failed to load data.</p>';
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
  
  // ใช้ favor_id สำหรับลบ หรือ id ถ้าไม่มี favor_id
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

  // คลิกรูปเพื่อดูรายละเอียด
  const img = card.querySelector("img");
  if(img) {
      img.addEventListener("click", () => {
          window.openBookDetail(book);
      });
  }

  // คลิกปุ่มลบ
  const removeBtn = card.querySelector(".remove-btn");
  if(removeBtn) {
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
  }

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

    // สร้าง payload
    const payload = {
        title: currentFavBook.title,
        author: currentFavBook.author,
        genre: currentFavBook.genre,
        book_image: currentFavBook.book_image
    };

    // ใช้ currentUser ที่โหลดมาแล้ว ถ้ามี
    if (currentUser && currentUser.user_id) {
        payload.user_id = currentUser.user_id;
    } else {
        // Fallback: ถ้าไม่มี currentUser ให้ fetch ใหม่ (กันพลาด)
         try {
            const token = localStorage.getItem("token");
            const userRes = await fetch(`${API_BASE_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` }});
            const userData = await userRes.json();
            payload.user_id = userData.user_id;
         } catch(e) { console.error("User ID missing logic error"); }
    }

    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/journals/add-by-id`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok) {
            showToast("Success", `Added "${payload.title}" to library!`, "success");
            closeBookModal();
        } else {
            showToast("Error", "Failed: " + (result.error || result.message || "Unknown error"), "error");
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
        const res = await fetch(`${API_BASE_URL}/api/favorites/${favId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if(res.ok) {
            showToast("Removed", "Book removed", "success");
            
            // Animation ตอนลบ
            cardElement.style.opacity = '0';
            cardElement.style.transform = 'scale(0.9)';
            
            setTimeout(() => {
                cardElement.remove();
                // เช็คว่าหมดหรือยัง ถ้าหมดให้โชว์ Empty Message
                const grid = document.getElementById("favorite-grid");
                if(grid && grid.children.length === 0) {
                    grid.style.display = "none";
                    const emptyMsg = document.getElementById("empty-message");
                    if(emptyMsg) emptyMsg.style.display = "flex";
                }
            }, 300);

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

        if(!modal) {
            // Fallback ถ้าไม่มี Modal HTML
            resolve(confirm(`Remove "${bookTitle}"?`));
            return;
        }

        textEl.textContent = `Remove "${bookTitle}" from favorites?`;
        modal.classList.add("show");

        // สร้าง handler เพื่อให้ removeEventListener ได้ถูกต้อง
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
    if(!container) {
        alert(`${title}: ${message}`);
        return;
    }

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
    
    // Auto remove
    setTimeout(() => {
        toast.style.animation = "fadeOutRight 0.5s forwards";
        toast.addEventListener("animationend", () => toast.remove());
    }, 3000);
}