// js/journal-genre.js — Genre picker widget + lock/unlock API

document.addEventListener("DOMContentLoaded", () => {
    const genreInput = document.getElementById("genre");
    if (!genreInput) return;

    const genreWrapper = document.createElement("div");
    genreWrapper.className = "genre-wrapper";
    genreInput.parentNode.insertBefore(genreWrapper, genreInput);
    genreWrapper.appendChild(genreInput);

    const genrePopup = document.createElement("div");
    genrePopup.className = "genre-popup";

    const listContainer = document.createElement("div");
    listContainer.className = "genre-list-container";

    const commonGenres = [
        "Fantasy", "Sci-Fi", "Romance", "Mystery",
        "Thriller", "Horror", "Historical", "Biography",
        "Self-Help", "Business", "Psychology", "Comics/Manga",
        "Poetry", "Philosophy", "Art", "Travel"
    ];

    commonGenres.forEach(g => {
        const opt = document.createElement("div");
        opt.className = "genre-option";
        opt.textContent = g;
        opt.onclick = () => {
            genreInput.value = g;
            genrePopup.classList.remove("show");
        };
        listContainer.appendChild(opt);
    });

    const customContainer = document.createElement("div");
    customContainer.className = "genre-custom-box";

    const customInput = document.createElement("input");
    customInput.className = "genre-custom-input";
    customInput.placeholder = "+ Add custom genre...";

    const customBtn = document.createElement("button");
    customBtn.className = "genre-custom-btn";
    customBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';

    const addCustomHandler = (e) => {
        e.preventDefault();
        const val = customInput.value.trim();
        if (val) {
            genreInput.value = val;
            customInput.value = "";
            genrePopup.classList.remove("show");
        }
    };

    customBtn.onclick = addCustomHandler;
    customInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") addCustomHandler(e);
    });

    customContainer.appendChild(customInput);
    customContainer.appendChild(customBtn);
    genrePopup.appendChild(listContainer);
    genrePopup.appendChild(customContainer);
    genreWrapper.appendChild(genrePopup);

    genreInput.addEventListener("click", (e) => {
        if (!genreInput.hasAttribute("readonly")) {
            e.stopPropagation();
            genrePopup.classList.toggle("show");
        }
    });

    document.addEventListener("click", (e) => {
        if (!genreWrapper.contains(e.target)) {
            genrePopup.classList.remove("show");
        }
    });

    window.lockBookFromAPI = function(titleText, authorText, apiGenreData) {
        const titleInput = document.getElementById("title");
        if (titleInput) {
            titleInput.value = titleText || "";
            titleInput.setAttribute("readonly", true);
            titleInput.classList.add("input-locked");
        }

        const authorInput = document.getElementById("author");
        if (authorInput) {
            authorInput.value = authorText || "";
            authorInput.setAttribute("readonly", true);
            authorInput.classList.add("input-locked");
        }

        let finalGenre = "";
        if (Array.isArray(apiGenreData) && apiGenreData.length > 0) {
            finalGenre = apiGenreData.slice(0, 3).join(" / ");
        } else if (typeof apiGenreData === "string") {
            finalGenre = apiGenreData.replace(/[\[\]"']/g, '');
        }
        genreInput.value = finalGenre || "Unknown";
        genreInput.setAttribute("readonly", true);
        genreInput.classList.add("genre-locked");
        genrePopup.classList.remove("show");
    };

    window.unlockToManualMode = function() {
        const titleInput = document.getElementById("title");
        if (titleInput) {
            titleInput.removeAttribute("readonly");
            titleInput.classList.remove("input-locked");
            titleInput.value = "";
        }

        const authorInput = document.getElementById("author");
        if (authorInput) {
            authorInput.removeAttribute("readonly");
            authorInput.classList.remove("input-locked");
            authorInput.value = "";
        }

        genreInput.removeAttribute("readonly");
        genreInput.classList.remove("genre-locked");
        genreInput.value = "";
    };
});
