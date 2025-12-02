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
    const pref = JSON.parse(localStorage.getItem("preference") || "{}");
    if (Array.isArray(pref.authors)) {
        selectedAuthors = new Set(pref.authors);
        console.log("📌 Loaded saved authors =", pref.authors);
    }
}

function saveLocalAuthors() {
    let pref = JSON.parse(localStorage.getItem("preference") || "{}");
    pref.authors = Array.from(selectedAuthors);
    
    localStorage.setItem("preference", JSON.stringify(pref));
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
let allAuthors = [];
let filteredAuthors = [];
let currentPage = 0;

// ============================
// API SEARCH
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
// LOAD AUTHORS (พร้อมระบบ Force Injection)
// ============================
async function loadAuthors() {
    const query = `
        query GetAllAuthorsFromBooks {
            books {
                contributions {
                    author {
                        id
                        name
                        slug
                    }
                }
            }
        }
    `;

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query })
        });

        const result = await res.json();
        const rawBooks = result?.data?.books;

        if (!rawBooks || !Array.isArray(rawBooks)) {
            authorGrid.innerHTML = `<div class="error">Failed to load authors</div>`;
            return;
        }

        // 1. ดึงข้อมูลดิบจาก API (เท่าที่ API ส่งมาให้)
        let list = [];
        rawBooks.forEach(book => {
            book?.contributions?.forEach(c => {
                if (c?.author) list.push(c.author);
            });
        });

        // ตัวช่วยทำ Key สำหรับเช็คชื่อซ้ำ
        const normalize = t => t.toLowerCase().replace(/[^a-z0-9]/g, "");
        const uniqueMap = {};
        
        // ใส่ข้อมูลจาก API ลง Map
        list.forEach(a => {
            if (a && a.name) {
                const key = normalize(a.name);
                if (!uniqueMap[key]) {
                    uniqueMap[key] = {
                        id: a.id || `temp-${key}`,
                        name: a.name,
                        slug: a.slug || a.name.toLowerCase().replace(/\s+/g, '-') // สร้าง slug สำรองถ้าไม่มี
                    };
                }
            }
        });

        // ==================================================
        // ✅ [FIXED] ส่วนสำคัญ: บังคับสร้างชื่อเหล่านี้ถ้ายังไม่มี
        // ==================================================
        const priorityList = [
            "Rebecca Yarros", "Suzanne Collins", "Emily Henry", "Taylor Jenkins Reid",
            "Freida McFadden", "Abby Jimenez", "Ali Hazelwood", "Clare Leslie Hall",
            "Carley Fortune", "Fredrik Backman", "Charlotte McConaghy", "Lauren Roberts",
            "Alice Feeney", "Devney Perry", "SenLinYu", "Rachel Gillig",
            "Jeneva Rose", "B.K. Borison", "R.F. Kuang", "Elsie Silver"
        ];

        // วนลูปเช็ค: ถ้าชื่อ VIP ไหนไม่อยู่ใน uniqueMap ให้สร้างขึ้นมาเลย!
        priorityList.forEach(vipName => {
            const key = normalize(vipName);
            if (!uniqueMap[key]) {
                // สร้างข้อมูลเทียมขึ้นมา (เพื่อให้มีปุ่มกด)
                uniqueMap[key] = {
                    id: `forced-${key}`, 
                    name: vipName,
                    // สร้าง slug แบบมาตรฐาน (ตัวพิมพ์เล็ก เว้นวรรคเป็นขีด) เพื่อให้ Database เข้าใจได้
                    slug: vipName.toLowerCase().replace(/\s+/g, '-') 
                };
            }
        });

        // แปลงกลับเป็น Array
        const allData = Object.values(uniqueMap);

        // ==================================================
        // ✅ ระบบแยกตะกร้า (Bucket Sort) เพื่อเรียงลำดับ
        // ==================================================
        
        // สร้าง Index Map เพื่อความเร็ว
        const priorityIndexMap = {};
        priorityList.forEach((name, index) => {
            priorityIndexMap[normalize(name)] = index;
        });

        const vipAuthors = [];    
        const otherAuthors = []; 

        allData.forEach(author => {
            const nName = normalize(author.name);
            if (priorityIndexMap.hasOwnProperty(nName)) {
                vipAuthors.push(author);
            } else {
                otherAuthors.push(author);
            }
        });

        // เรียง VIP ตามลำดับเป๊ะๆ
        vipAuthors.sort((a, b) => {
            const indexA = priorityIndexMap[normalize(a.name)];
            const indexB = priorityIndexMap[normalize(b.name)];
            return indexA - indexB;
        });

        // เรียงคนอื่นตาม A-Z
        otherAuthors.sort((a, b) => a.name.localeCompare(b.name));

        // รวมร่าง
        allAuthors = [...vipAuthors, ...otherAuthors];

        // Finish
        filteredAuthors = allAuthors;
        currentPage = 0;
        renderFilteredAuthors();

    } catch (err) {
        console.error("Failed to load authors:", err);
        authorGrid.innerHTML = `<div class="error">Failed to load authors (API Error)</div>`;
    }
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
});

skipBtn.addEventListener("click", () => {
    // 1. ล้างค่าที่เลือกทิ้ง (เพราะกด Skip แปลว่าไม่เอาที่เลือกไว้)
    selectedAuthors.clear();
    
    // 2. บันทึกค่าว่างลง LocalStorage (เพื่อล้างของเก่าถ้ามี)
    saveLocalAuthors(); 

    // 3. ไปหน้าถัดไป
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

// ============================
// BACK BUTTON
// ============================
backBtn.addEventListener("click", () => {
    selectedAuthors.clear(); 
    saveLocalAuthors(); 
    window.location.href = "manage-pre-genre.html";
});

searchInput.addEventListener("input", async () => {
    const keyword = searchInput.value.trim();

    if (keyword === "") {
        filteredAuthors = allAuthors;
    } else {
        filteredAuthors = await searchAuthorsFromAPI(keyword);
    }

    currentPage = 0;
    renderFilteredAuthors();
});

// ============================
// INITIALIZATION
// ============================
let pref = JSON.parse(localStorage.getItem("preference") || "{}");
pref.authors = []; 
localStorage.setItem("preference", JSON.stringify(pref));
localStorage.removeItem("selectedAuthors"); 

selectedAuthors.clear(); 
loadAuthors();