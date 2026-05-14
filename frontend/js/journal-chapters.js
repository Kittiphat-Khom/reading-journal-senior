// js/journal-chapters.js — Chapter Manager + See All Modal

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");

    const chapterPopup = document.getElementById("chapter-popup");
    const addChapterBtn = document.getElementById("add-chapter-btn");
    const closeChapterBtn = document.getElementById("close-chapter-popup");
    const saveChapterBtn = document.getElementById("save-chapter-data-btn");
    const addNewChapterBtn = document.getElementById("btn-add-new-chapter");

    const chaptersStore = {};
    let currentBookId = null;
    let currentChapterIndex = 0;
    let currentChapterData = null;

    // ============================================================
    // HELPERS
    // ============================================================

    function createEmptyChapter(num) {
        return { id: Date.now(), num: parseInt(num), review: "", stars: 0, drama: 0, spicy: 0, favPages: [], quotes: [], annotations: [] };
    }

    function sortChapters() {
        if (chaptersStore[currentBookId]) chaptersStore[currentBookId].sort((a, b) => a.num - b.num);
    }

    function getCurrentTimestamp() {
        const now = new Date();
        return now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    function updateIconVisuals(id, score, activeClass) {
        const icons = document.querySelectorAll(`#${id} i`);
        icons.forEach((icon, idx) => {
            const val = idx + 1;
            icon.classList.remove("filled", "active-drop", "active-fire", "fa-solid", "fa-regular");
            if (activeClass === "fa-star") {
                icon.classList.add("fa-regular");
                if (val <= score) { icon.classList.remove("fa-regular"); icon.classList.add("fa-solid", "filled"); }
            } else {
                icon.classList.add("fa-solid");
                if (val <= score) icon.classList.add(activeClass);
            }
        });
    }

    function renderList(elId, arr, prefix) {
        const el = document.getElementById(elId);
        el.innerHTML = "";
        const previewArr = arr.slice(0, 3);

        previewArr.forEach((item, idx) => {
            let displayTxt = "Error";
            if (typeof item === 'string') {
                displayTxt = item;
            } else if (typeof item === 'object' && item !== null) {
                displayTxt = item.quote_text || item.text || item.note_text || "Unknown";
            }

            const div = document.createElement("div");
            div.className = "c-item";
            div.innerHTML = `<span>${prefix} ${idx + 1}: ${displayTxt}</span><i class="fa-solid fa-trash del-item"></i>`;
            div.querySelector(".del-item").onclick = () => { arr.splice(idx, 1); renderChapterUI(); };
            el.appendChild(div);
        });

        if (arr.length > 3) {
            const moreDiv = document.createElement("div");
            moreDiv.style.cssText = "font-size:0.8rem;color:#94a3b8;padding:5px;";
            moreDiv.textContent = `...and ${arr.length - 3} more`;
            el.appendChild(moreDiv);
        }
    }

    function renderChapterUI() {
        const chapters = chaptersStore[currentBookId];
        if (!chapters || chapters.length === 0) return;

        const prevBtn = document.getElementById("prev-chapter-btn");
        const nextBtn = document.getElementById("next-chapter-btn");
        if (prevBtn) prevBtn.disabled = (currentChapterIndex <= 0);
        if (nextBtn) nextBtn.disabled = (currentChapterIndex >= chapters.length - 1);

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
            const span = document.createElement("span");
            span.className = "badge";
            span.textContent = page;
            span.onclick = () => { currentChapterData.favPages.splice(idx, 1); renderChapterUI(); };
            favList.appendChild(span);
        });

        renderList("quote-list", currentChapterData.quotes, "Quote");
        renderList("annotation-list", currentChapterData.annotations, "Annotation");
    }

    // ============================================================
    // CHAPTER NAVIGATION
    // ============================================================

    const chapterDropdown = document.getElementById("chapter-dropdown");
    if (chapterDropdown) {
        chapterDropdown.addEventListener("change", (e) => {
            currentChapterIndex = parseInt(e.target.value);
            renderChapterUI();
        });
    }

    document.getElementById("next-chapter-btn").onclick = () => {
        if (chaptersStore[currentBookId] && currentChapterIndex < chaptersStore[currentBookId].length - 1) {
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

    // ============================================================
    // RATING SETUP
    // ============================================================

    const setupRating = (id, key) => {
        document.querySelectorAll(`#${id} i`).forEach((icon, idx) => {
            icon.addEventListener("click", () => {
                if (currentChapterData) { currentChapterData[key] = idx + 1; renderChapterUI(); }
            });
        });
    };
    setupRating("rating-stars", "stars");
    setupRating("rating-drama", "drama");
    setupRating("rating-spicy", "spicy");

    // ============================================================
    // OPEN / CLOSE CHAPTER POPUP
    // ============================================================

    if (addChapterBtn) {
        addChapterBtn.addEventListener("click", async () => {
            const urlParams = new URLSearchParams(window.location.search);
            currentBookId = urlParams.get("id");
            if (!currentBookId) { await showAlert("Warning", "Please save the journal first!", "info"); return; }

            if (!chaptersStore[currentBookId]) {
                try {
                    const res = await fetch(`/api/journals/${currentBookId}/chapters`, { headers: { Authorization: `Bearer ${token}` } });
                    if (res.ok) {
                        const fetchedData = await res.json();
                        chaptersStore[currentBookId] = (fetchedData.length > 0) ? fetchedData : [createEmptyChapter(1)];
                    } else {
                        chaptersStore[currentBookId] = [createEmptyChapter(1)];
                    }
                } catch (e) { chaptersStore[currentBookId] = [createEmptyChapter(1)]; }
            }

            currentChapterIndex = 0;
            sortChapters();

            const mainTitle = document.getElementById("title").value;
            document.getElementById("chapter-book-title").textContent = mainTitle || "Untitled";

            let coverSrc = "";
            const coverImg = document.getElementById("cover-preview");
            if (coverImg && coverImg.src.length > 20) coverSrc = coverImg.src;
            else { const imgInCover = document.querySelector(".book-cover img"); if (imgInCover) coverSrc = imgInCover.src; }
            if (coverSrc) document.getElementById("chapter-cover-img").src = coverSrc;

            chapterPopup.classList.remove("hidden");
            renderChapterUI();
        });
    }

    if (closeChapterBtn) closeChapterBtn.addEventListener("click", () => { chapterPopup.classList.add("hidden"); });

    // ============================================================
    // ADD ITEMS
    // ============================================================

    document.getElementById("btn-add-fav-page").onclick = async () => {
        const val = await showInputModal("Add Page", "e.g., 42");
        if (val && currentChapterData) { currentChapterData.favPages.push(val); renderChapterUI(); }
    };

    document.getElementById("btn-add-quote").onclick = async () => {
        const val = await showInputModal("Add Quote", "...");
        if (val && currentChapterData) {
            currentChapterData.quotes.push({ text: val, timestamp: getCurrentTimestamp() });
            renderChapterUI();
        }
    };

    document.getElementById("btn-add-annotation").onclick = async () => {
        const val = await showInputModal("Add Note", "...");
        if (val && currentChapterData) {
            currentChapterData.annotations.push({ text: val, timestamp: getCurrentTimestamp() });
            renderChapterUI();
        }
    };

    document.getElementById("chapter-review").addEventListener("input", (e) => {
        if (currentChapterData) currentChapterData.review = e.target.value;
    });

    // ============================================================
    // ADD NEW CHAPTER
    // ============================================================

    if (addNewChapterBtn) {
        addNewChapterBtn.onclick = async () => {
            const input = await showInputModal("New Chapter Number", "e.g., 15");
            if (!input) return;
            const newNum = parseInt(input);
            if (isNaN(newNum)) { await showAlert("Invalid", "Enter valid number!", "error"); return; }
            const chapters = chaptersStore[currentBookId];
            const existing = chapters.find(c => c.num === newNum);
            if (existing) {
                await showAlert("Exists", `Chapter ${newNum} exists!`, "info");
                currentChapterIndex = chapters.indexOf(existing);
                renderChapterUI();
                return;
            }
            chapters.push(createEmptyChapter(newNum));
            sortChapters();
            currentChapterIndex = chapters.findIndex(c => c.num === newNum);
            renderChapterUI();
        };
    }

    // ============================================================
    // SAVE CHAPTERS
    // ============================================================

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
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify({ chapters: chaptersToSave })
                });

                const result = await response.json();
                if (response.ok) {
                    await showAlert("Success", "Chapters saved successfully!", "success");
                } else {
                    throw new Error(result.error || result.message || "Unknown server error");
                }
            } catch (error) {
                await showAlert("Error", "Failed to save: " + error.message, "error");
            } finally {
                saveChapterBtn.innerText = originalText;
                saveChapterBtn.disabled = false;
            }
        });
    }

    // ============================================================
    // SEE ALL MODAL (Quotes & Annotations)
    // ============================================================

    const seeAllModal = document.getElementById("see-all-modal");
    const seeAllTitle = document.getElementById("see-all-modal-title");
    const seeAllList = document.getElementById("see-all-content-list");
    const closeSeeAllBtn = document.getElementById("btn-close-see-all");
    const addInModalBtn = document.getElementById("btn-add-in-modal");

    let currentSeeAllType = null;

    function openSeeAllModal(type) {
        if (!currentChapterData) return;
        currentSeeAllType = type;
        seeAllModal.classList.remove("hidden");
        seeAllTitle.textContent = (type === "quotes") ? "All Quotes" : "All Annotations";
        renderSeeAllList();
    }

    function renderSeeAllList() {
        seeAllList.innerHTML = "";
        const dataArr = (currentSeeAllType === "quotes") ? currentChapterData.quotes : currentChapterData.annotations;

        if (dataArr.length === 0) {
            seeAllList.innerHTML = `<div style="text-align:center;color:#94a3b8;margin-top:20px;">No items yet.</div>`;
            return;
        }

        dataArr.forEach((item, index) => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "see-all-item";
            itemDiv.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid #f1f5f9;";

            let textContent = item;
            let timeContent = "";

            if (typeof item === 'object' && item !== null) {
                textContent = item.quote_text || item.text || item.note_text || "Unknown";
                const t = item.created_at || item.timestamp;
                if (t) {
                    try {
                        const dateObj = new Date(t);
                        timeContent = !isNaN(dateObj)
                            ? dateObj.toLocaleDateString('en-GB') + ' ' + dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
                            : t;
                    } catch (e) { timeContent = t; }
                }
            }

            itemDiv.innerHTML = `
                <div style="flex:1;">
                    <div style="font-size:1rem;">${index + 1}. ${textContent}</div>
                    ${timeContent ? `<div style="font-size:0.75rem;color:#64748b;margin-top:5px;margin-left:15px;">🕒 ${timeContent}</div>` : ''}
                </div>
                <i class="fa-solid fa-trash see-all-del" style="cursor:pointer;color:#ef4444;padding:5px;"></i>
            `;

            itemDiv.querySelector(".see-all-del").addEventListener("click", () => {
                dataArr.splice(index, 1);
                renderSeeAllList();
                renderChapterUI();
            });

            seeAllList.appendChild(itemDiv);
        });
    }

    const btnSeeAllQuotes = document.getElementById("btn-see-all-quotes");
    if (btnSeeAllQuotes) btnSeeAllQuotes.addEventListener("click", (e) => { e.preventDefault(); openSeeAllModal("quotes"); });

    const btnSeeAllAnnotations = document.getElementById("btn-see-all-annotations");
    if (btnSeeAllAnnotations) btnSeeAllAnnotations.addEventListener("click", (e) => { e.preventDefault(); openSeeAllModal("annotations"); });

    if (closeSeeAllBtn) closeSeeAllBtn.addEventListener("click", () => { seeAllModal.classList.add("hidden"); });

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
});
