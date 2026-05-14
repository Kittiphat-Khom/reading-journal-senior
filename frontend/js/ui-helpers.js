function showToast(title, message, type = 'success') {
    const container = document.getElementById("toast-container");
    if (!container) { alert(`${title}: ${message}`); return; }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let iconClass = "fa-circle-check";
    if (type === 'error') iconClass = "fa-circle-exclamation";
    if (type === 'info') iconClass = "fa-circle-info";

    toast.innerHTML = `
        <div class="toast-icon"><i class="fa-solid ${iconClass}"></i></div>
        <div class="toast-content"><h4>${title}</h4><p>${message}</p></div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "fadeOutRight 0.5s forwards";
        toast.addEventListener("animationend", () => toast.remove());
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
        modal.style.display = "flex";
        btn.focus();

        const closeHandler = () => {
            modal.classList.add("hidden");
            modal.style.display = "";
            btn.removeEventListener("click", closeHandler);
            resolve();
        };
        btn.addEventListener("click", closeHandler);
    });
}

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

        const confirmHandler = () => { cleanup(); resolve(inputEl.value.trim()); };
        const cancelHandler = () => { cleanup(); resolve(null); };
        const keyHandler = (e) => { if (e.key === "Enter") confirmHandler(); };

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
