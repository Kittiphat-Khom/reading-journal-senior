// js/layoutsidebar.js

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Render Sidebar
    renderSidebar();

    // 2. Highlight เมนูปัจจุบัน
    highlightActiveMenu();

    // 3. โหลดข้อมูล User (ชื่อ/อีเมล)
    await fetchUserDataSidebar();
});

function renderSidebar() {
    // หาตำแหน่งที่จะวาง Sidebar (เราจะวางแทนที่ <div id="sidebar-container">)
    const container = document.getElementById("sidebar-container");
    if (!container) return;

    const sidebarHTML = `
    <aside class="sidebar" id="sidebar">
        <div class="sidebar-top">
            <div class="user">
                <div class="avatar"><i class="fa-solid fa-user"></i></div>
                <div class="user-info">
                    <div class="user-name" id="sidebar-username">Loading...</div>
                    <div class="user-sub" id="sidebar-email">Fetching...</div>
                </div>
                <button class="close-btn" onclick="toggleSidebar()">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        </div>

        <div class="sidebar-middle">
            <ul class="menu">
                <li><a href="dashboard-page.html"><i class="fa-solid fa-book-open"></i>Manage Reading Journals</a></li>
                <li><a href="favorite-page.html"><i class="fa-solid fa-heart"></i>Manage Favorite List</a></li>
                <li><a href="search-page.html"><i class="fa-solid fa-magnifying-glass"></i>Search Book</a></li>
                <li><a href="recommend-page.html"><i class="fa-solid fa-lightbulb"></i>Search Recommended Book</a></li>
                <li><a href="report-bug.html"><i class="fa-solid fa-bug"></i>Bug Report</a></li>
            </ul>
        </div>

        <div class="sidebar-bottom">
            <button class="logout-btn" onclick="openLogoutModal(event)">
                <i class="fa-solid fa-right-from-bracket"></i> Log out
            </button>
        </div>
    </aside>
    
    <div id="overlay" class="overlay" onclick="toggleSidebar()"></div>
    `;

    container.innerHTML = sidebarHTML;
}

function highlightActiveMenu() {
    // ดึงชื่อไฟล์ปัจจุบัน เช่น "dashboard-page.html"
    const currentPage = window.location.pathname.split("/").pop();
    
    const links = document.querySelectorAll(".menu a");
    links.forEach(link => {
        // ดึง href ของลิงก์ (เช่น "dashboard-page.html")
        const href = link.getAttribute("href");
        
        // ถ้าหน้าปัจจุบันตรงกับลิงก์ ให้ใส่ class active
        if (href === currentPage) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
}

// ฟังก์ชัน Toggle Sidebar (เปิด/ปิด)
window.toggleSidebar = function() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    if (sidebar && overlay) {
        sidebar.classList.toggle("active");
        overlay.classList.toggle("show");
    }
};

// ฟังก์ชันดึงข้อมูล User มาแสดงใน Sidebar
async function fetchUserDataSidebar() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const nameEl = document.getElementById("sidebar-username");
    const emailEl = document.getElementById("sidebar-email");

    if (!nameEl) return;

    try {
        const res = await fetch("/api/users/me", {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const user = await res.json();
            nameEl.textContent = user.username;
            emailEl.textContent = user.email || "User";
        }
    } catch (err) {
        console.error("Sidebar user fetch error:", err);
    }
}