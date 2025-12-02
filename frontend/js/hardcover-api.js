/* ============================
   Config & State
============================ */
// ✅ ใช้ proxy server ของเราแทน Hardcover ตรง ๆ
const API_URL = "/api/search";

let currentPage = 1;
let currentSearch = "";
let hasMore = false;

/* ============================
   🔹 ฟังก์ชันรีเซ็ตสถานะ
============================ */
function resetSearchUI() {
  console.log("🔁 resetSearchUI()");
  currentPage = 1;
  currentSearch = "";
  hasMore = false;

  const searchInput = document.getElementById("search-input");
  const resultsBox = document.getElementById("search-results");
  const pagination = document.getElementById("pagination");

  // ไม่เคลียร์ค่า input ถ้า user กำลังพิมพ์อยู่ แต่เคลียร์ผลลัพธ์
  // แต่ถ้ารีเซ็ตจากภายนอก (เช่น ปิด popup) ค่อยเคลียร์ input
  if (resultsBox) resultsBox.innerHTML = "";
  
  // Reset Pagination DOM
  if (pagination) {
    pagination.innerHTML = `
      <button id="prev-page" disabled>Prev</button>
      <span id="page-info">Page 1</span>
      <button id="next-page" disabled>Next</button>
    `;
  }
}


/* ============================
   🔍 ค้นหาหนังสือ (ผ่าน proxy) - Modified
============================ */
async function searchBooks(searchTerm, page = 1) {
  const queryTerm = searchTerm?.trim() || "book";

  // 1️⃣ แก้ตรงนี้: เปลี่ยน per_page จาก 10 เป็น 20 (ดึงมาเผื่อโดนคัดออก)
  const query = `
    query Search($query: String!, $page: Int!) {
      search(query: $query, query_type: "Book", per_page: 20, page: $page) {
        results
      }
    }
  `;

  try {
    console.log(`🔹 Searching: "${queryTerm}" | Page: ${page}`);
    
    const resultsBox = document.getElementById("search-results");
    if (page === 1 && resultsBox) {
        resultsBox.innerHTML = `<p style="text-align:center;color:#888;">Loading...</p>`;
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { query: queryTerm, page },
      }),
    });

    const result = await response.json();
    if (result.errors) {
      console.error("❌ GraphQL errors:", result.errors);
      return [];
    }

    const rawResults = result.data?.search?.results;
    if (!rawResults) return [];

    const parsed = typeof rawResults === "string" ? JSON.parse(rawResults) : rawResults;
    const hits = parsed.hits || [];

    // 2️⃣ กรองข้อมูล: เอาเฉพาะที่มี doc.image.url เท่านั้น
    const validHits = hits.filter(item => {
        const doc = item.document || {};
        // เช็คว่ามี object image และมี url อยู่ข้างในไหม
        return doc.image && doc.image.url;
    });

    // เช็คว่ายังมีหน้าถัดไปไหม (เช็คจาก hits เดิมที่ดึงมา 20 ตัว)
    hasMore = hits.length === 20; 

    // 3️⃣ แปลงข้อมูล (Map)
    const books = validHits.map((item) => {
      const doc = item.document || {};

      let author =
        doc.author_names?.[0] ||
        doc.contributions?.find(
          (c) => c.author && c.contribution === "Author"
        )?.author.name ||
        (Array.isArray(doc.authors)
          ? doc.authors[0]
          : typeof doc.authors === "string"
          ? doc.authors
          : undefined) ||
        doc.contributors?.[0] ||
        "Unknown author";

      const genre =
        doc.genre ||
        doc.genres?.[0] ||
        doc.subjects?.[0] ||
        doc.categories?.[0] ||
        "Unknown genre";

      // ไม่ต้องใส่ fallback placeholder แล้ว เพราะเรากรองออกไปแล้ว
      const image = doc.image.url; 

      return {
        title: doc.title || "Untitled",
        author,
        genre,
        image,
      };
    });

    currentPage = page;
    updatePaginationUI();

    // 4️⃣ ตัดให้เหลือ 10 เล่มเท่าเดิม เพื่อความสวยงาม (Replacement)
    return books.slice(0, 10);

  } catch (error) {
    console.error("💥 Fetch error:", error);
    const resultsBox = document.getElementById("search-results");
    if (resultsBox) resultsBox.innerHTML = `<p style="text-align:center;color:red;">Error fetching data</p>`;
    return [];
  }
}

/* ============================
   📖 แสดงผลหนังสือ (popup)
============================ */
function renderResults(items) {
  const resultsBox = document.getElementById("search-results");
  if (!resultsBox) return;
  
  resultsBox.innerHTML = "";

  if (items.length === 0) {
    resultsBox.innerHTML = `<p style="text-align:center;color:#999;">No results found</p>`;
    renderPagination(); // เรียกเพื่อให้ปุ่ม Next/Prev ทำงานถูก state
    return;
  }

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "book-result";
    div.innerHTML = `
      <div class="book-card">
        <div class="book-cover-container">
          <img src="${item.image}" alt="book cover" class="book-cover"/>
          <button class="add-book-overlay">Add Book</button>
        </div>
        <div class="book-info">
          <h4>${item.title}</h4>
          <p style="font-size:0.85rem; color:#666;">${item.author}</p>
        </div>
      </div>
    `;

    div.querySelector(".add-book-overlay").addEventListener("click", () => {
      selectBook(item);
    });

    resultsBox.appendChild(div);
  });

  renderPagination();
}

/* ============================
   📄 Pagination
============================ */
function renderPagination() {
  const pagination = document.getElementById("pagination");
  if (!pagination) return;

  // ถ้าไม่มีการค้นหาค้างอยู่ ไม่ต้องโชว์ Pagination
  if (!currentSearch.trim()) {
    pagination.innerHTML = "";
    return;
  }

  pagination.innerHTML = `
    <button id="prev-page" ${currentPage <= 1 ? "disabled" : ""}>Prev</button>
    <span id="page-info">Page ${currentPage}</span>
    <button id="next-page" ${!hasMore ? "disabled" : ""}>Next</button>
  `;

  document.getElementById("prev-page").onclick = async () => {
    if (currentSearch && currentPage > 1) {
      const results = await searchBooks(currentSearch, currentPage - 1);
      renderResults(results);
    }
  };

  document.getElementById("next-page").onclick = async () => {
    if (currentSearch && hasMore) {
      const results = await searchBooks(currentSearch, currentPage + 1);
      renderResults(results);
    }
  };
}

function updatePaginationUI() {
  const pageInfo = document.getElementById("page-info");
  if (pageInfo) pageInfo.textContent = `Page ${currentPage}`;

  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");

  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = !hasMore;
}

/* ============================
   🪄 Popup + Search Handler (Main Logic)
============================ */
document.addEventListener("DOMContentLoaded", () => {
  const popup = document.getElementById("book-popup");
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn"); // ✅ ปุ่มค้นหา (ถ้ามี)
  const addBookCard = document.getElementById("add-book-card");
  const resultsBox = document.getElementById("search-results");

  // 🔹 ฟังก์ชันกลางสำหรับสั่งค้นหา
  async function performSearch() {
    if (!searchInput) return;
    const searchTerm = searchInput.value.trim();

    // ถ้าเป็นค่าว่าง ให้เคลียร์ผลลัพธ์
    if (searchTerm.length === 0) {
        resetSearchUI();
        return;
    }

    console.log("🚀 Triggering Search for:", searchTerm);
    
    // Log ไป Backend
    logSearchToBackend(searchTerm);

    currentSearch = searchTerm;
    currentPage = 1;

    const results = await searchBooks(searchTerm, 1);
    renderResults(results);
  }

  // ✅ 1. เมื่อกด Enter ในช่อง Input
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault(); // กัน Submit Form
        performSearch();
    }
  });

  // ✅ 2. เมื่อคลิกปุ่มค้นหา (Search Button)
  searchBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    performSearch();
  });

  // ✅ 3. เมื่อลบข้อความจนหมด ให้เคลียร์ผลลัพธ์ทันที (UX)
  searchInput?.addEventListener("input", (e) => {
    if (e.target.value.trim().length === 0) {
        resetSearchUI();
    }
  });

  // ✅ 4. เปิด Popup (Add Book) - แก้ไขให้เปิดมาหน้าโล่งๆ
  addBookCard?.addEventListener("click", async () => {
    popup.classList.remove("hidden");
    
    // เคลียร์ค่า input เก่า
    if (searchInput) searchInput.value = "";
    
    // รีเซ็ต UI ให้โล่ง (ลบผลลัพธ์เก่าทิ้ง)
    resetSearchUI();

    // โฟกัสเพื่อให้พิมพ์ได้เลย
    requestAnimationFrame(() => {
      if (searchInput) searchInput.focus();
    });

    // ❌ ลบส่วนสุ่มหนังสือ (Random Queries) ออกไปแล้ว
  });

  // ✅ 5. ปิด popup เมื่อคลิกด้านนอก
  popup?.addEventListener("click", (e) => {
    if (e.target === popup) {
      popup.classList.add("hidden");
      resetSearchUI();
      if(searchInput) searchInput.value = ""; // เคลียร์ text ทิ้งเมื่อปิด
    }
  });
});

/* ============================
   ✅ เลือกหนังสือ (Add Book Logic)
============================ */
function selectBook(book) {
  const addCard = document.querySelector(".add-book");
  if (!addCard) return;

  let coverContainer = addCard.querySelector(".book-cover");
  if (!coverContainer) {
    coverContainer = document.createElement("div");
    coverContainer.className = "book-cover";
    addCard.prepend(coverContainer);
  }

  coverContainer.innerHTML = `
    <img src="${book.image}" alt="${book.title}" class="selected-book-cover" />
  `;

  const placeholder = addCard.querySelector(".add-icon");
  if (placeholder) placeholder.style.display = "none";

  const popup = document.getElementById("book-popup");
  popup.classList.add("hidden");

  const titleInput = document.getElementById("title");
  const authorInput = document.getElementById("author");
  const genreSelect = document.getElementById("genre");

  if (titleInput) titleInput.value = book.title || "";
  if (authorInput) authorInput.value = book.author || "";

  if (genreSelect) {
    const currentOptions = Array.from(genreSelect.options).map(opt => opt.text.toLowerCase());
    const genreName = book.genre?.trim() || "Unknown";

    if (!currentOptions.includes(genreName.toLowerCase())) {
      const newOption = document.createElement("option");
      newOption.value = genreName.toLowerCase().replace(/\s+/g, "-");
      newOption.text = genreName;

      const addNewOption = genreSelect.querySelector('option[value="__add_new__"]');
      if (addNewOption) {
        genreSelect.insertBefore(newOption, addNewOption);
      } else {
        genreSelect.appendChild(newOption);
      }
    }
    const match = Array.from(genreSelect.options).find(
      (opt) => opt.text.toLowerCase() === genreName.toLowerCase()
    );
    genreSelect.value = match ? match.value : "";
  }

  console.log("✅ Added book:", book);
}

/* ============================
   🕵️‍♂️ LOG SEARCH HELPER
============================ */
function logSearchToBackend(queryText) {
    const userStr = localStorage.getItem("user");
    if (!userStr) return; 
    
    let userId = null;
    try { userId = JSON.parse(userStr).id || JSON.parse(userStr).user_id; } catch(e) {}
    
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