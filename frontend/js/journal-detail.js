// js/journal-detail.js — Main journal logic: data load, timer, save

window.JournalApp = {
    currentReadingLogs: [],
    lastSessionSeconds: 0,
    totalTimeInSeconds: 0
};

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const journalId = params.get("id");
    const token = localStorage.getItem("token");

    // ============================================================
    // HELPERS
    // ============================================================

    function formatTime(sec) {
        const h = String(Math.floor(sec / 3600)).padStart(2, "0");
        const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
        const s = String(sec % 60).padStart(2, "0");
        return `${h} : ${m} : ${s}`;
    }

    function getCurrentTimestamp() {
        const now = new Date();
        return now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    function parseDBTime(timeStr) {
        if (!timeStr) return 0;
        const parts = timeStr.split(":").map(p => parseInt(p.replace(/\D/g, '')) || 0);
        if (parts.length < 3) return 0;
        return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    }

    function updateTotalTimeUI(totalSec) {
        const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
        const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
        const s = String(totalSec % 60).padStart(2, "0");
        const elH = document.getElementById("tt-h");
        const elM = document.getElementById("tt-m");
        const elS = document.getElementById("tt-s");
        if (elH) elH.textContent = h;
        if (elM) elM.textContent = m;
        if (elS) elS.textContent = s;
    }

    function addLogItem(seconds) {
        const list = document.getElementById("reading-log-list");
        if (!list) return;
        const li = document.createElement("li");
        li.className = "log-item";
        li.textContent = formatTime(seconds);
        list.prepend(li);
    }

    // ============================================================
    // LOAD DATA
    // ============================================================

    if (journalId) {
        try {
            const res = await fetch(`/api/journals/${journalId}`, {
                headers: { Authorization: `Bearer ${token || ""}` }
            });
            const data = await res.json();

            if (res.ok && data) {
                const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };
                setVal("title", data.title);
                setVal("author", data.author);
                setVal("review", data.review);
                if (data.startdate) setVal("start-date", data.startdate.split("T")[0]);
                if (data.enddate) setVal("end-date", data.enddate.split("T")[0]);

                const genreInput = document.getElementById("genre");
                if (genreInput && data.genre) {
                    genreInput.value = Array.isArray(data.genre)
                        ? data.genre.slice(0, 3).join(" / ")
                        : String(data.genre).replace(/[\[\]"]/g, '');
                }

                const imageUrl = data.book_image || data.image;
                if (imageUrl) {
                    let img = document.getElementById("cover-preview");
                    if (!img) img = document.querySelector(".book-cover img");
                    const addIcon = document.querySelector(".book-cover .add-icon");
                    if (img) {
                        img.src = imageUrl;
                        img.style.display = "block";
                        img.dataset.url = imageUrl;
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

                if (data.total_reading_time) {
                    window.JournalApp.totalTimeInSeconds = parseDBTime(data.total_reading_time);
                    updateTotalTimeUI(window.JournalApp.totalTimeInSeconds);
                }

                if (data.reading_log) {
                    try {
                        window.JournalApp.currentReadingLogs = (typeof data.reading_log === 'string')
                            ? JSON.parse(data.reading_log)
                            : data.reading_log;
                    } catch (e) {
                        window.JournalApp.currentReadingLogs = [];
                    }
                }
            }
        } catch (err) {
            console.error("Load error:", err);
        }
    }

    // ============================================================
    // UPLOAD / COVER PREVIEW
    // ============================================================

    const uploadBtn = document.getElementById("btn-trigger-upload");
    const fileInput = document.getElementById("file-upload-input");
    const coverPreview = document.getElementById("cover-preview");
    const addIcon = document.querySelector(".add-icon");

    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.unlockToManualMode();
            fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener("click", (e) => { e.stopPropagation(); });
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                if (coverPreview) { coverPreview.src = event.target.result; coverPreview.style.display = "block"; }
                if (addIcon) addIcon.style.display = "none";
            };
            reader.readAsDataURL(file);
        });
    }

    // ============================================================
    // SEARCH POPUP
    // ============================================================

    const searchPopup = document.getElementById("book-popup");
    const closeSearchBtn = document.getElementById("close-popup");
    const openSearchBtn = document.getElementById("add-book-card");

    if (closeSearchBtn && searchPopup) {
        closeSearchBtn.addEventListener("click", () => { searchPopup.classList.add("hidden"); });
    }
    if (openSearchBtn && searchPopup) {
        openSearchBtn.addEventListener("click", () => { searchPopup.classList.remove("hidden"); });
    }

    // ============================================================
    // UI: RATINGS + PLATFORM
    // ============================================================

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

    // ============================================================
    // TIMER
    // ============================================================

    let startTime = null;
    let elapsedTime = 0;
    let timerInterval = null;
    let isPaused = false;

    const liveTimerDisplay = document.querySelector(".live-timer");
    const startBtn = document.querySelector(".start-btn");
    const finishBtn = document.querySelector(".finish-btn");

    function updateLiveTimer() {
        const diff = Math.floor((Date.now() - startTime) / 1000);
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

            window.JournalApp.totalTimeInSeconds += sessionTime;
            window.JournalApp.lastSessionSeconds = sessionTime;

            updateTotalTimeUI(window.JournalApp.totalTimeInSeconds);
            addLogItem(sessionTime);
            elapsedTime = 0;
            if (liveTimerDisplay) liveTimerDisplay.textContent = "00 : 00 : 00";
            isPaused = false;
            if (startBtn) { startBtn.style.opacity = "1"; startBtn.disabled = false; }

            showToast("Info", "Timer finished. Don't forget to Save!", "info");
        });
    }

    // ============================================================
    // SAVE
    // ============================================================

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

            if (!genreVal) {
                showToast("Required", "Please select a genre.", "error");
                const genreEl = document.getElementById("genre");
                if (genreEl) genreEl.style.borderColor = "#ef4444";
                return;
            } else {
                const genreEl = document.getElementById("genre");
                if (genreEl) genreEl.style.borderColor = "#cbd5e1";
            }

            if (loadingOverlay) loadingOverlay.style.display = "flex";
            saveBtn.disabled = true;

            const getRating = (type) => {
                const el = document.querySelector(`.rating-block[data-type='${type}']`);
                return el ? parseInt(el.dataset.rating || 0) : 0;
            };

            let finalImage = null;
            const imgEl = document.getElementById("cover-preview");
            if (imgEl && imgEl.src && imgEl.src.length > 20) finalImage = imgEl.src;
            else { const anyImg = document.querySelector(".book-cover img"); if (anyImg && anyImg.src.length > 20) finalImage = anyImg.src; }

            let platformVal = null;
            const activePlat = document.querySelector(".plat-btn.active");
            if (activePlat) platformVal = activePlat.getAttribute("data-val") || activePlat.textContent.trim();

            const { totalTimeInSeconds, lastSessionSeconds, currentReadingLogs } = window.JournalApp;
            const h = String(Math.floor(totalTimeInSeconds / 3600)).padStart(2, "0");
            const m = String(Math.floor((totalTimeInSeconds % 3600) / 60)).padStart(2, "0");
            const s = String(totalTimeInSeconds % 60).padStart(2, "0");

            if (lastSessionSeconds > 0) {
                currentReadingLogs.push({ date: new Date().toISOString().split('T')[0], time: lastSessionSeconds });
            }

            const payload = {
                title: document.getElementById("title")?.value || "",
                author: document.getElementById("author")?.value || "",
                review: document.getElementById("review")?.value || "",
                genre: document.getElementById("genre")?.value || "",
                startdate: document.getElementById("start-date")?.value || null,
                enddate: document.getElementById("end-date")?.value || null,
                book_image: finalImage,
                image: finalImage,
                star_point: getRating("stars"),
                spicy_point: getRating("spicy"),
                drama_point: getRating("drama"),
                platform: platformVal,
                total_reading_time: `${h}:${m}:${s}`,
                reading_log: JSON.stringify(currentReadingLogs)
            };

            try {
                const url = journalId ? `/api/journals/${journalId}` : "/api/journals/add";
                const method = journalId ? "PUT" : "POST";
                const res = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    if (loadingOverlay) loadingOverlay.style.display = "none";
                    window.JournalApp.lastSessionSeconds = 0;
                    showToast("Success!", journalId ? "Journal saved successfully." : "Journal added successfully.", "success");
                    window.parent.postMessage(journalId ? "journalUpdated" : "journalAdded", "*");
                } else {
                    const errData = await res.json();
                    if (loadingOverlay) loadingOverlay.style.display = "none";
                    showToast("Error!", errData.message || "Save failed", "error");
                }
            } catch (error) {
                console.error(error);
                if (loadingOverlay) loadingOverlay.style.display = "none";
                await showAlert("Connection Error", "Could not connect to server", "error");
            } finally {
                saveBtn.disabled = false;
            }
        });
    }
});
