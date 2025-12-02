const API_BASE_URL = 'https://reading-journal.xyz';
document.addEventListener("DOMContentLoaded", async () => {
    /* ============================================================
       PART 1: JOURNAL MAIN LOGIC (Load, Save, Timer)
       ============================================================ */
    const params = new URLSearchParams(window.location.search);
    const journalId = params.get("id");
    const token = localStorage.getItem("token");
  
    function getCurrentTimestamp() {
        const now = new Date();
        return now.toLocaleDateString('th-TH') + ' ' + now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }
  
    // Variables
    let startTime = null;
    let elapsedTime = 0;
    let totalTimeInSeconds = 0; 
    let timerInterval = null;
    let isPaused = false;
  
    let currentReadingLogs = [];
    let lastSessionSeconds = 0;
  
    // Helpers
    function formatTime(sec) {
        const h = String(Math.floor(sec / 3600)).padStart(2, "0");
        const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
        const s = String(sec % 60).padStart(2, "0");
        return `${h} : ${m} : ${s}`;
    }
  
    function updateTotalTimeUI(totalSec) {
        const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
        const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
        const s = String(totalSec % 60).padStart(2, "0");
        const elH = document.getElementById("tt-h");
        const elM = document.getElementById("tt-m");
        const elS = document.getElementById("tt-s");
        if(elH) elH.textContent = h;
        if(elM) elM.textContent = m;
        if(elS) elS.textContent = s;
    }
  
    function addLogItem(seconds) {
        const list = document.getElementById("reading-log-list");
        if (!list) return;
        const li = document.createElement("li");
        li.className = "log-item"; 
        li.textContent = formatTime(seconds);
        list.prepend(li);
    }
  
    function parseDBTime(timeStr) {
        if (!timeStr) return 0;
        const parts = timeStr.split(":").map(p => parseInt(p.replace(/\D/g, '')) || 0);
        if (parts.length < 3) return 0;
        return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    }
  
    // Custom Modals & Toasts Helpers
    function showInputModal(title, placeholder, initialValue = "") {
        return new Promise((resolve) => {
            const modal = document.getElementById("custom-input-modal");
            const titleEl = document.getElementById("input-modal-title");
            const inputEl = document.getElementById("input-modal-field");
            const cancelBtn = document.getElementById("btn-input-cancel");
            const confirmBtn = document.getElementById("btn-input-confirm");
  
            titleEl.textContent = title;
            inputEl.value = initialValue;
            inputEl.placeholder = placeholder;
            modal.classList.remove("hidden");
            inputEl.focus();
  
            const confirmHandler = () => {
                const val = inputEl.value.trim();
                cleanup();
                resolve(val);
            };
  
            const cancelHandler = () => {
                cleanup();
                resolve(null);
            };
  
            const keyHandler = (e) => {
                if(e.key === "Enter") confirmHandler();
            };
  
            const cleanup = () => {
                modal.classList.add("hidden");
                confirmBtn.removeEventListener("click", confirmHandler);
                cancelBtn.removeEventListener("click", cancelHandler);
                inputEl.removeEventListener("keydown", keyHandler);
            };
  
            confirmBtn.addEventListener("click", confirmHandler);
            cancelBtn.addEventListener("click", cancelHandler);
            inputEl.addEventListener("keydown", keyHandler);
        });
    }
  
    function showToast(title, message, type = 'success') {
        const container = document.getElementById("toast-container");
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        
        let iconClass = "fa-circle-check";
        if (type === 'error') iconClass = "fa-circle-exclamation";
        if (type === 'info') iconClass = "fa-circle-info";
  
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
            toast.addEventListener("animationend", () => {
                toast.remove();
            });
        }, 3000);
    }
  
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
  
            modal.classList.remove("hidden");
            btn.focus();
  
            const closeHandler = () => {
                modal.classList.add("hidden");
                btn.removeEventListener("click", closeHandler);
                resolve();
            };
            btn.addEventListener("click", closeHandler);
        });
    }
  
    // Fix: Search Popup Controls
    const searchPopup = document.getElementById("book-popup");
    const closeSearchBtn = document.getElementById("close-popup");
    const openSearchBtn = document.getElementById("add-book-card"); 
  
    if (closeSearchBtn && searchPopup) {
        closeSearchBtn.addEventListener("click", () => {
            searchPopup.classList.add("hidden");
            const searchInput = document.getElementById("search-input");
            const searchResults = document.getElementById("search-results");
            if(searchInput) searchInput.value = "";
            if(searchResults) searchResults.innerHTML = "";
        });
    }
  
    if (openSearchBtn && searchPopup) {
        openSearchBtn.addEventListener("click", () => {
            searchPopup.classList.remove("hidden");
        });
    }
  
    // --- Load Data (Main Journal) ---
    if (journalId) {
      try {
        const res = await fetch(`/api/journals/${journalId}`, {
          headers: { Authorization: `Bearer ${token || ""}` },
        });
        const data = await res.json();
  
        if (res.ok && data) {
          const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ""; };
          setVal("title", data.title);
          setVal("author", data.author);
          setVal("review", data.review);
          if(data.startdate) setVal("start-date", data.startdate.split("T")[0]);
          if(data.enddate) setVal("end-date", data.enddate.split("T")[0]);
  
          const genreSelect = document.getElementById("genre");
          if (genreSelect && data.genre) {
              let genreValue = String(data.genre).trim();
              let found = Array.from(genreSelect.options).find(opt => opt.value === genreValue);
              if (!found) {
                 const opt = document.createElement("option");
                 opt.value = genreValue;
                 opt.text = genreValue;
                 genreSelect.add(opt, genreSelect.options[1]);
              }
              genreSelect.value = genreValue;
          }
  
          const imageUrl = data.book_image || data.image;
          if (imageUrl) {
              let img = document.getElementById("cover-preview");
              if (!img) { img = document.querySelector(".book-cover img"); }
              const addIcon = document.querySelector(".book-cover .add-icon");
              if (img) {
                  img.src = imageUrl;
                  img.style.display = "block";
                  img.dataset.url = imageUrl; 
                  img.setAttribute("referrerpolicy", "no-referrer");
                  if (addIcon) addIcon.style.display = "none";
              }
          }
  
          const ratingMap = { stars: data.star_point, spicy: data.spicy_point, drama: data.drama_point };
          Object.entries(ratingMap).forEach(([type, value]) => {
              const val = value || 0;
              const group = document.querySelector(`.rating-block[data-type="${type}"]`);
              if (group) {
                  group.dataset.rating = val;
                  group.querySelectorAll("i").forEach((icon, index) => icon.classList.toggle("filled", index < val));
              }
          });
  
          if (data.platform) {
              const dbPlat = data.platform.toLowerCase().trim();
              document.querySelectorAll(".plat-btn").forEach(btn => {
                  const btnVal = (btn.getAttribute("data-val") || btn.textContent).toLowerCase().trim();
                  if (btnVal === dbPlat) btn.classList.add("active");
                  else btn.classList.remove("active");
              });
          }
  
          if (data.total_reading_time) {
               totalTimeInSeconds = parseDBTime(data.total_reading_time);
               updateTotalTimeUI(totalTimeInSeconds);
          }
  
          if (data.reading_log) {
              try {
                  currentReadingLogs = (typeof data.reading_log === 'string') 
                      ? JSON.parse(data.reading_log) 
                      : data.reading_log;
              } catch (e) {
                  console.error("Error parsing reading log:", e);
                  currentReadingLogs = [];
              }
          }
  
        }
      } catch (err) {
        console.error("❌ Load Error:", err);
      }
    }
  
    // GENRE SELECTION LOGIC
    const genreSelect = document.getElementById("genre");
    if (genreSelect) {
        let previousValue = genreSelect.value;
        genreSelect.addEventListener("focus", function () { previousValue = this.value; });
  
        genreSelect.addEventListener("change", async function () {
            if (this.value === "__add_new__") {
                const newGenreName = await showInputModal("Add New Genre", "Enter genre name (e.g., Sci-Fi)");
                if (newGenreName) {
                    const newOption = document.createElement("option");
                    newOption.value = newGenreName;
                    newOption.text = newGenreName;
                    const lastIndex = this.options.length - 1;
                    this.add(newOption, this.options[lastIndex]);
                    this.value = newGenreName;
                    previousValue = newGenreName;
                    showToast("Success", `Added genre: ${newGenreName}`, "success");
                } else {
                    this.value = previousValue;
                }
            } else {
                previousValue = this.value;
            }
        });
    }
  
    // PHOTO UPLOAD LOGIC
    const uploadBtn = document.getElementById("btn-trigger-upload");
    const fileInput = document.getElementById("file-upload-input");
    const coverPreview = document.getElementById("cover-preview");
    const addIcon = document.querySelector(".add-icon");
  
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener("click", (e) => {
            e.preventDefault(); e.stopPropagation(); fileInput.click();
        });
    }
  
    if (fileInput) {
        fileInput.addEventListener("click", (e) => { e.stopPropagation(); });
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const base64String = event.target.result;
                    if(coverPreview) {
                        coverPreview.src = base64String;
                        coverPreview.style.display = "block";
                    }
                    if(addIcon) addIcon.style.display = "none";
                };
                reader.readAsDataURL(file);
            }
        });
    }
  
    // UI Interactions
    document.querySelectorAll(".rating-block").forEach((group) => {
      const icons = group.querySelectorAll("i");
      icons.forEach((icon, index) => {
        icon.addEventListener("click", () => {
          icons.forEach((i, j) => i.classList.toggle("filled", j <= index));
          group.dataset.rating = index + 1;
        });
      });
    });
  
    const platBtns = document.querySelectorAll(".plat-btn");
    platBtns.forEach(btn => {
        btn.addEventListener("click", function(e) {
            e.preventDefault(); 
            platBtns.forEach(b => b.classList.remove("active"));
            this.classList.add("active");
        });
    });
  
    // Timer Logic
    const liveTimerDisplay = document.querySelector(".live-timer");
    const startBtn = document.querySelector(".start-btn");
    const finishBtn = document.querySelector(".finish-btn");
  
    function updateLiveTimer() {
      const now = Date.now();
      const diff = Math.floor((now - startTime) / 1000);
      if (liveTimerDisplay) liveTimerDisplay.textContent = formatTime(elapsedTime + diff);
    }
  
    if (startBtn) {
        startBtn.addEventListener("click", () => {
            if (!timerInterval) {
              startTime = Date.now();
              timerInterval = setInterval(updateLiveTimer, 1000);
              isPaused = false;
              startBtn.style.opacity = "0.5";
              startBtn.disabled = true;
            }
        });
    }
  
    if (finishBtn) {
        finishBtn.addEventListener("click", () => {
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
            const diff = isPaused ? 0 : Math.floor((Date.now() - startTime) / 1000);
            const sessionTime = elapsedTime + diff;
            
            totalTimeInSeconds += sessionTime;
            lastSessionSeconds = sessionTime;
  
            updateTotalTimeUI(totalTimeInSeconds);
            addLogItem(sessionTime);
            elapsedTime = 0;
            if (liveTimerDisplay) liveTimerDisplay.textContent = "00 : 00 : 00";
            isPaused = false;
            if(startBtn) { startBtn.style.opacity = "1"; startBtn.disabled = false; }
            
            showToast("Info", "Timer finished. Don't forget to Save!", "info");
        });
    }
  
    // Save Button (Main Journal)
    const saveBtn = document.getElementById("save-btn");
    const loadingOverlay = document.getElementById("loading-overlay");
  
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        
        const titleVal = document.getElementById("title")?.value.trim();
        const genreVal = document.getElementById("genre")?.value;
  
        if (!titleVal) {
            showToast("Required", "Please enter book title.", "error");
            return;
        }
        if (!genreVal || genreVal === "") {
            showToast("Required", "Please select a genre.", "error");
            const genreEl = document.getElementById("genre");
            if(genreEl) genreEl.style.borderColor = "#ef4444";
            return;
        } else {
            const genreEl = document.getElementById("genre");
            if(genreEl) genreEl.style.borderColor = "#cbd5e1";
        }
  
        if(loadingOverlay) loadingOverlay.style.display = "flex";
        saveBtn.disabled = true;
  
        const getRating = (type) => { const el = document.querySelector(`.rating-block[data-type='${type}']`); return el ? parseInt(el.dataset.rating || 0) : 0; };
        
        let finalImage = null;
        const imgEl = document.getElementById("cover-preview");
        if (imgEl && imgEl.src && imgEl.src.length > 20) finalImage = imgEl.src;
        else { const anyImg = document.querySelector(".book-cover img"); if (anyImg && anyImg.src.length > 20) finalImage = anyImg.src; }
        
        let platformVal = null;
        const activePlat = document.querySelector(".plat-btn.active");
        if (activePlat) platformVal = activePlat.getAttribute("data-val") || activePlat.textContent.trim();
        
        const h = String(Math.floor(totalTimeInSeconds / 3600)).padStart(2, "0");
        const m = String(Math.floor((totalTimeInSeconds % 3600) / 60)).padStart(2, "0");
        const s = String(totalTimeInSeconds % 60).padStart(2, "0");
        const totalTimeString = `${h}:${m}:${s}`;
  
        if (lastSessionSeconds > 0) {
            currentReadingLogs.push({
                date: new Date().toISOString().split('T')[0],
                time: lastSessionSeconds
            });
        }
  
        const payload = {
          title: document.getElementById("title")?.value || "",
          author: document.getElementById("author")?.value || "",
          review: document.getElementById("review")?.value || "",
          genre: document.getElementById("genre")?.value || "",
          startdate: document.getElementById("start-date")?.value || null,
          enddate: document.getElementById("end-date")?.value || null,
          book_image: finalImage, image: finalImage, 
          star_point: getRating("stars"), 
          spicy_point: getRating("spicy"), 
          drama_point: getRating("drama"),
          platform: platformVal, 
          
          total_reading_time: totalTimeString,
          reading_log: JSON.stringify(currentReadingLogs)
        };
  
        try {
          const url = journalId ? `/api/journals/${journalId}` : "/api/journals/add";
          const method = journalId ? "PUT" : "POST";
          const res = await fetch(url, { method: method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
          
          if (res.ok) { 
              if(loadingOverlay) loadingOverlay.style.display = "none";
              lastSessionSeconds = 0;
              showToast("Success!", journalId ? "Journal saved successfully." : "Journal added successfully.", "success");
              window.parent.postMessage(journalId ? "journalUpdated" : "journalAdded", "*"); 
          } 
          else { 
              const errData = await res.json(); 
              if(loadingOverlay) loadingOverlay.style.display = "none";
              showToast("Error!", errData.message || "Save failed", "error");
          }
        } catch (error) { 
            console.error(error); 
            if(loadingOverlay) loadingOverlay.style.display = "none";
            await showAlert("Connection Error", "Could not connect to server", "error");
        } 
        finally { 
            saveBtn.disabled = false; 
        }
      });
    }
  
    /* ============================================================
       PART 2: CHAPTER MANAGER
       ============================================================ */
    const chapterPopup = document.getElementById("chapter-popup");
    const addChapterBtn = document.getElementById("add-chapter-btn");
    const closeChapterBtn = document.getElementById("close-chapter-popup");
    const saveChapterBtn = document.getElementById("save-chapter-data-btn");
    const addNewChapterBtn = document.getElementById("btn-add-new-chapter");
  
    const chaptersStore = {}; 
    let currentBookId = null;
    let currentChapterIndex = 0;
    let currentChapterData = null;
  
    function createEmptyChapter(num) {
        return { id: Date.now(), num: parseInt(num), review: "", stars: 0, drama: 0, spicy: 0, favPages: [], quotes: [], annotations: [] };
    }
  
    function sortChapters() {
        if (chaptersStore[currentBookId]) chaptersStore[currentBookId].sort((a, b) => a.num - b.num);
    }
  
    function renderChapterUI() {
      const chapters = chaptersStore[currentBookId];
      if (!chapters || chapters.length === 0) return;
  
      const prevBtn = document.getElementById("prev-chapter-btn");
      const nextBtn = document.getElementById("next-chapter-btn");
      if(prevBtn) prevBtn.disabled = (currentChapterIndex <= 0);
      if(nextBtn) nextBtn.disabled = (currentChapterIndex >= chapters.length - 1);
  
      currentChapterData = chapters[currentChapterIndex];
  
      const dropdown = document.getElementById("chapter-dropdown");
      if (dropdown) {
          dropdown.innerHTML = ""; 
          chapters.forEach((chap, index) => {
              const opt = document.createElement("option");
              opt.value = index; 
              opt.text = `Chapter ${chap.num}`;
              dropdown.appendChild(opt);
          });
          dropdown.value = currentChapterIndex;
      }
  
      document.getElementById("chapter-review").value = currentChapterData.review || "";
      updateIconVisuals("rating-stars", currentChapterData.stars, "fa-star");
      updateIconVisuals("rating-drama", currentChapterData.drama, "active-drop");
      updateIconVisuals("rating-spicy", currentChapterData.spicy, "active-fire");
      
      const favList = document.getElementById("fav-pages-list");
      favList.innerHTML = "";
      currentChapterData.favPages.forEach((page, idx) => {
          const span = document.createElement("span"); span.className = "badge"; span.textContent = page; span.onclick = () => { currentChapterData.favPages.splice(idx, 1); renderChapterUI(); };
          favList.appendChild(span);
      });
      
      renderList("quote-list", currentChapterData.quotes, "Quote");
      renderList("annotation-list", currentChapterData.annotations, "Annotation");
    }
  
    const chapterDropdown = document.getElementById("chapter-dropdown");
    if (chapterDropdown) {
      chapterDropdown.addEventListener("change", (e) => {
          currentChapterIndex = parseInt(e.target.value);
          renderChapterUI();
      });
    }
  
    document.getElementById("next-chapter-btn").onclick = () => { 
      if(chaptersStore[currentBookId] && currentChapterIndex < chaptersStore[currentBookId].length - 1) { 
          currentChapterIndex++; 
          renderChapterUI(); 
      } 
    };
    document.getElementById("prev-chapter-btn").onclick = () => { 
      if (currentChapterIndex > 0) { 
          currentChapterIndex--; 
          renderChapterUI(); 
      } 
    };
  
    function renderList(elId, arr, prefix) {
        const el = document.getElementById(elId); el.innerHTML = "";
        const previewArr = arr.slice(0, 3);
        
        previewArr.forEach((item, idx) => {
            let displayTxt = "Error";
            if (typeof item === 'string') {
                displayTxt = item;
            } else if (typeof item === 'object' && item !== null) {
                displayTxt = item.quote_text || item.text || item.note_text || "Unknown";
            }
  
            const div = document.createElement("div"); div.className = "c-item";
            
            div.innerHTML = `<span>${prefix} ${idx+1}: ${displayTxt}</span><i class="fa-solid fa-trash del-item"></i>`;
            
            div.querySelector(".del-item").onclick = () => { arr.splice(idx, 1); renderChapterUI(); };
            el.appendChild(div);
        });
  
        if (arr.length > 3) {
            const moreDiv = document.createElement("div");
            moreDiv.style.fontSize = "0.8rem";
            moreDiv.style.color = "#94a3b8";
            moreDiv.style.padding = "5px";
            moreDiv.textContent = `...and ${arr.length - 3} more`;
            el.appendChild(moreDiv);
        }
    }
  
    function updateIconVisuals(id, score, activeClass) {
        const icons = document.querySelectorAll(`#${id} i`);
        icons.forEach((icon, idx) => {
            const val = idx + 1;
            icon.classList.remove("filled", "active-drop", "active-fire", "fa-solid", "fa-regular");
            if (activeClass === "fa-star") { icon.classList.add("fa-regular"); if(val <= score) { icon.classList.remove("fa-regular"); icon.classList.add("fa-solid", "filled"); }}
            else { icon.classList.add("fa-solid"); if(val <= score) icon.classList.add(activeClass); }
        });
    }
  
    if (addChapterBtn) {
        addChapterBtn.addEventListener("click", async () => {
            const urlParams = new URLSearchParams(window.location.search);
            currentBookId = urlParams.get("id");
            if(!currentBookId) { await showAlert("Warning", "Please save the journal first!", "info"); return; }
            if (!chaptersStore[currentBookId]) {
                try {
                    const res = await fetch(`/api/journals/${currentBookId}/chapters`, { headers: { Authorization: `Bearer ${token}` } });
                    if(res.ok) {
                        const fetchedData = await res.json();
                        chaptersStore[currentBookId] = (fetchedData.length > 0) ? fetchedData : [createEmptyChapter(1)];
                    } else chaptersStore[currentBookId] = [createEmptyChapter(1)];
                } catch(e) { chaptersStore[currentBookId] = [createEmptyChapter(1)]; }
            }
            currentChapterIndex = 0; sortChapters();
            const mainTitle = document.getElementById("title").value;
            document.getElementById("chapter-book-title").textContent = mainTitle || "Untitled";
            let coverSrc = ""; const coverImg = document.getElementById("cover-preview");
            if(coverImg && coverImg.src.length > 20) coverSrc = coverImg.src;
            else { const imgInCover = document.querySelector(".book-cover img"); if(imgInCover) coverSrc = imgInCover.src; }
            if(coverSrc) document.getElementById("chapter-cover-img").src = coverSrc;
            chapterPopup.classList.remove("hidden"); renderChapterUI();
        });
    }
  
    if (closeChapterBtn) closeChapterBtn.addEventListener("click", () => { chapterPopup.classList.add("hidden"); });
  
    const setupRating = (id, key) => { document.querySelectorAll(`#${id} i`).forEach((icon, idx) => { icon.addEventListener("click", () => { if(currentChapterData) { currentChapterData[key] = idx + 1; renderChapterUI(); } }); }); };
    setupRating("rating-stars", "stars"); setupRating("rating-drama", "drama"); setupRating("rating-spicy", "spicy");
  
    document.getElementById("btn-add-fav-page").onclick = async () => { const val = await showInputModal("Add Page", "e.g., 42"); if(val && currentChapterData) { currentChapterData.favPages.push(val); renderChapterUI(); } };
    
    document.getElementById("btn-add-quote").onclick = async () => { 
        const val = await showInputModal("Add Quote", "..."); 
        if(val && currentChapterData) { 
            currentChapterData.quotes.push({ text: val, timestamp: getCurrentTimestamp() }); 
            renderChapterUI(); 
        } 
    };
    
    document.getElementById("btn-add-annotation").onclick = async () => { 
        const val = await showInputModal("Add Note", "..."); 
        if(val && currentChapterData) { 
            currentChapterData.annotations.push({ text: val, timestamp: getCurrentTimestamp() }); 
            renderChapterUI(); 
        } 
    };
  
    document.getElementById("chapter-review").addEventListener("input", (e) => { if(currentChapterData) currentChapterData.review = e.target.value; });
  
    if (addNewChapterBtn) {
      addNewChapterBtn.onclick = async () => {
          const input = await showInputModal("New Chapter Number", "e.g., 15");
          if (!input) return; 
          const newNum = parseInt(input);
          if (isNaN(newNum)) { await showAlert("Invalid", "Enter valid number!", "error"); return; }
          const chapters = chaptersStore[currentBookId];
          const existing = chapters.find(c => c.num === newNum);
          if (existing) { await showAlert("Exists", `Chapter ${newNum} exists!`, "info"); currentChapterIndex = chapters.indexOf(existing); renderChapterUI(); return; }
          chapters.push(createEmptyChapter(newNum)); sortChapters();
          currentChapterIndex = chapters.findIndex(c => c.num === newNum); renderChapterUI();
      };
    }
  
    if (saveChapterBtn) {
        saveChapterBtn.addEventListener("click", async () => {
            if (!currentBookId) {
                await showAlert("Error", "Journal ID missing! Please save the journal details first.", "error");
                return;
            }
  
            sortChapters(); 
            const chaptersToSave = chaptersStore[currentBookId];
  
            if (!chaptersToSave || chaptersToSave.length === 0) { 
                await showAlert("Info", "No chapters created yet.", "info"); 
                return; 
            }
  
            const originalText = saveChapterBtn.innerText;
            saveChapterBtn.innerText = "Saving..."; 
            saveChapterBtn.disabled = true;
  
            try {
                const response = await fetch(`/api/journals/${currentBookId}/chapters`, {
                    method: "POST", 
                    headers: { 
                        "Content-Type": "application/json", 
                        "Authorization": `Bearer ${token}` 
                    },
                    body: JSON.stringify({ chapters: chaptersToSave })
                });
  
                const result = await response.json();
  
                if (response.ok) {
                    await showAlert("Success", "Chapters saved successfully!", "success");
                } else {
                    throw new Error(result.error || result.message || "Unknown server error");
                }
  
            } catch (error) { 
                console.error("❌ Save Failed:", error); 
                await showAlert("Error", "Failed to save: " + error.message, "error"); 
            } finally { 
                saveChapterBtn.innerText = originalText; 
                saveChapterBtn.disabled = false; 
            }
        });
    }
  
    /* ============================================================
       PART 3: SEE ALL MODAL LOGIC (New Code)
       ============================================================ */
    
    const seeAllModal = document.getElementById("see-all-modal");
    const seeAllTitle = document.getElementById("see-all-modal-title");
    const seeAllList = document.getElementById("see-all-content-list");
    const closeSeeAllBtn = document.getElementById("btn-close-see-all");
    const addInModalBtn = document.getElementById("btn-add-in-modal");
  
    let currentSeeAllType = null; // "quotes" or "annotations"
  
    function openSeeAllModal(type) {
        if (!currentChapterData) return;
  
        currentSeeAllType = type;
        seeAllModal.classList.remove("hidden");
        
        seeAllTitle.textContent = (type === "quotes") ? "All Quotes" : "All Annotations";
        
        renderSeeAllList();
    }
  
    function renderSeeAllList() {
        seeAllList.innerHTML = "";
        
        const dataArr = (currentSeeAllType === "quotes") 
                        ? currentChapterData.quotes 
                        : currentChapterData.annotations;
  
        if (dataArr.length === 0) {
            seeAllList.innerHTML = `<div style="text-align:center; color:#94a3b8; margin-top:20px;">No items yet.</div>`;
            return;
        }
  
        dataArr.forEach((item, index) => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "see-all-item";
            
            let textContent = item;
            let timeContent = "";
  
            if (typeof item === 'object' && item !== null) {
                textContent = item.quote_text || item.text || item.note_text || "Unknown";
                if (item.created_at || item.timestamp) {
                   const t = item.created_at || item.timestamp;
                   try {
                     const dateObj = new Date(t);
                     if(!isNaN(dateObj)) {
                        timeContent = dateObj.toLocaleDateString('th-TH') + ' ' + dateObj.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'});
                     } else {
                        timeContent = t;
                     }
                   } catch(e) { timeContent = t; }
                }
            }
  
            itemDiv.innerHTML = `
                <div class="see-all-content" style="flex: 1;">
                    <div class="see-all-text" style="font-size: 1rem;">${index + 1}. ${textContent}</div>
                    ${timeContent ? `<div style="font-size: 0.75rem; color: #64748b; margin-top: 5px; margin-left: 15px;">🕒 ${timeContent}</div>` : ''}
                </div>
                <i class="fa-solid fa-trash see-all-del" title="Delete" style="cursor:pointer; color:#ef4444; padding:5px;"></i>
            `;
  
            itemDiv.style.display = "flex";
            itemDiv.style.justifyContent = "space-between";
            itemDiv.style.alignItems = "center";
            itemDiv.style.padding = "10px";
            itemDiv.style.borderBottom = "1px solid #f1f5f9";
  
            itemDiv.querySelector(".see-all-del").addEventListener("click", () => {
                dataArr.splice(index, 1);
                renderSeeAllList(); 
                renderChapterUI(); 
            });
  
            seeAllList.appendChild(itemDiv);
        });
    }
  
    const btnSeeAllQuotes = document.getElementById("btn-see-all-quotes");
    if (btnSeeAllQuotes) {
        btnSeeAllQuotes.addEventListener("click", (e) => {
            e.preventDefault();
            openSeeAllModal("quotes");
        });
    }
  
    const btnSeeAllAnnotations = document.getElementById("btn-see-all-annotations");
    if (btnSeeAllAnnotations) {
        btnSeeAllAnnotations.addEventListener("click", (e) => {
            e.preventDefault();
            openSeeAllModal("annotations");
        });
    }
  
    if (closeSeeAllBtn) {
        closeSeeAllBtn.addEventListener("click", () => {
            seeAllModal.classList.add("hidden");
        });
    }
  
    if (addInModalBtn) {
        addInModalBtn.addEventListener("click", async () => {
            const typeName = (currentSeeAllType === "quotes") ? "Quote" : "Note";
            const val = await showInputModal(`Add New ${typeName}`, "Type here...");
            
            if (val && currentChapterData) {
                const newItem = { text: val, timestamp: getCurrentTimestamp() };
  
                if (currentSeeAllType === "quotes") {
                    currentChapterData.quotes.push(newItem);
                } else {
                    currentChapterData.annotations.push(newItem);
                }
                
                renderSeeAllList();
                renderChapterUI();
            }
        });
    }

    /* ============================================================
       PART 4: STATISTICS CHART (Chart.js)
       ============================================================ */

    let myChart = null; 
    const btnOpenStats = document.getElementById("btn-open-stats");
    const statsModal = document.getElementById("stats-modal");
    const btnCloseStats = document.getElementById("btn-close-stats");
    const timeSelector = document.getElementById("time-range-selector");

    if (btnOpenStats) {
        btnOpenStats.addEventListener("click", (e) => {
            e.preventDefault();
            if (typeof lastSessionSeconds !== 'undefined' && lastSessionSeconds > 0) {
                showToast("Warning", "Please save your new reading time first!", "error");
                return;
            }
            statsModal.classList.remove("hidden");
            updateChart("week");
        });
    }

    if (btnCloseStats) {
        btnCloseStats.addEventListener("click", () => {
            statsModal.classList.add("hidden");
        });
    }

    if (timeSelector) {
        timeSelector.addEventListener("change", (e) => {
            updateChart(e.target.value);
        });
    }

    // ... (ส่วนบนของไฟล์เหมือนเดิม)

    function updateChart(rangeType) {
        const ctx = document.getElementById('readingChart').getContext('2d'); // เพิ่ม getContext('2d') เพื่อสร้าง Gradient
        
        // --- 1. สร้าง Gradient สีฟ้าสวยๆ ---
        // ไล่สีจากบนลงล่าง (ฟ้าเข้ม -> ฟ้าจาง)
        let gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)'); // สีฟ้าเข้ม (#3b82f6)
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)'); // สีฟ้าจางเกือบใส

        const rawLogs = currentReadingLogs || []; 
        let labels = [];
        let dataPoints = [];
        let xTitle = "";
        
        const today = new Date();
        
        // --- 2. ปรับการแสดงผล Label วันที่ให้สวยขึ้น ---
        if (rangeType === 'week') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                
                // เก็บค่า Date String ไว้เช็คข้อมูล (Format เดิม: YYYY-MM-DD)
                const checkDateStr = d.toISOString().split('T')[0];
                
                // สร้าง Label สวยๆ เช่น "Tue 25"
                const options = { weekday: 'short', day: 'numeric' }; 
                // ถ้าอยากได้ภาษาไทยให้แก้ 'en-US' เป็น 'th-TH'
                const prettyLabel = d.toLocaleDateString('en-US', options); 
                
                labels.push(prettyLabel);
                
                const sumSeconds = rawLogs
                    .filter(log => log.date === checkDateStr)
                    .reduce((acc, curr) => acc + curr.time, 0);
                dataPoints.push((sumSeconds / 60).toFixed(2));
            }
            xTitle = "Last 7 Days";

        } else if (rangeType === 'month') {
            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
            const currentYear = today.getFullYear();
            const monthName = today.toLocaleString('en-US', { month: 'short' }); // เช่น Nov

            for (let i = 1; i <= daysInMonth; i++) {
                const dayStr = String(i).padStart(2, '0');
                const fullDate = `${currentYear}-${currentMonth}-${dayStr}`;
                
                // Label แสดงแค่วันที่ เช่น "01", "02"
                labels.push(dayStr);

                const sumSeconds = rawLogs
                    .filter(log => log.date === fullDate)
                    .reduce((acc, curr) => acc + curr.time, 0);
                dataPoints.push((sumSeconds / 60).toFixed(2));
            }
            xTitle = `${monthName} ${currentYear}`;

        } else if (rangeType === 'year') {
            const currentYear = today.getFullYear();
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            labels = monthNames;

            for (let i = 0; i < 12; i++) {
                const sumSeconds = rawLogs
                    .filter(log => {
                        const logDate = new Date(log.date);
                        return logDate.getMonth() === i && logDate.getFullYear() === currentYear;
                    })
                    .reduce((acc, curr) => acc + curr.time, 0);
                dataPoints.push((sumSeconds / 60).toFixed(2));
            }
            xTitle = `Year ${currentYear}`;
        }

        document.getElementById("chart-description").innerText = `Total reading time (Minutes) - ${xTitle}`;

        if (myChart) {
            myChart.destroy();
        }

        // --- 3. Config Chart ใหม่ให้ Modern ---
        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Minutes',
                    data: dataPoints,
                    backgroundColor: gradient, // ใช้ Gradient ที่สร้างไว้
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                    borderRadius: 6, // มุมโค้งมน
                    borderSkipped: false, // โค้งทั้ง 4 มุม (หรือเอาออกถ้าอยากให้โค้งแค่บน)
                    barThickness: 'flex',
                    maxBarThickness: 40, // ขยายขนาดแท่งสูงสุดให้ดูเต็มขึ้น
                    hoverBackgroundColor: 'rgba(37, 99, 235, 0.9)' // สีตอนเอาเมาส์ชี้เข้มขึ้น
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart' // Animation นุ่มๆ ตอนกราฟขึ้น
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMax: 10, // ✅ บังคับให้กราฟสูงอย่างน้อย 10 นาที (แก้ปัญหากราฟดูโล่งตอนเลขน้อยๆ)
                        border: { display: false }, // ซ่อนเส้นแกน Y ซ้ายสุด
                        grid: {
                            color: '#f1f5f9', // เส้น Grid สีจางๆ
                            tickLength: 0 // ซ่อนขีดเล็กๆ หน้าตัวเลข
                        },
                        ticks: { 
                            font: { family: "'Prompt', sans-serif", size: 11 },
                            color: '#64748b',
                            padding: 10
                        }
                    },
                    x: {
                        grid: { display: false }, // ซ่อนเส้น Grid แนวตั้ง
                        border: { display: false },
                        ticks: { 
                            font: { family: "'Prompt', sans-serif", size: 11 },
                            color: '#64748b'
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { family: "'Prompt', sans-serif", size: 13 },
                        bodyFont: { family: "'Prompt', sans-serif", size: 13 },
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: false, // ซ่อนสีสี่เหลี่ยมใน Tooltip
                        callbacks: {
                            label: function(context) {
                                let val = context.parsed.y;
                                return `⏱ ${val} mins`;
                            }
                        }
                    }
                }
            }
        });
    }

})