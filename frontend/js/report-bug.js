document.addEventListener('DOMContentLoaded', async () => {
    
    const API_BASE_URL = ''; 
    const token = localStorage.getItem('token'); 

    if (!token) {
        console.warn("No token found. Redirecting...");
        window.location.href = "log-in-page.html";
        return;
    }

    // ✅ 1. เรียกฟังก์ชันดึงข้อมูล User (เพื่อให้ Sidebar หายหมุน)
    await fetchUserInfo(token);

    // ==========================================
    // 👤 ฟังก์ชันดึงข้อมูล User
    // ==========================================
    async function fetchUserInfo(token) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to fetch user info");

            const user = await res.json();
            
            // อัปเดต Sidebar
            const nameEl = document.getElementById('user-name');
            const emailEl = document.getElementById('user-email');
            
            if (nameEl) nameEl.textContent = user.username || "User";
            if (emailEl) emailEl.textContent = user.email || "";

        } catch (err) {
            console.error("Auth Error:", err);
            // ถ้า Token หมดอายุ ให้เด้งออก
            // localStorage.clear();
            // window.location.href = "log-in-page.html";
        }
    }

    // ==========================================
    // 🔴 HISTORY MODAL LOGIC
    // ==========================================
    const openHistoryBtn = document.getElementById('openHistoryBtn');
    const historyModal = document.getElementById('historyModal');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');

    if (openHistoryBtn) {
        openHistoryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (historyModal) {
                historyModal.classList.add('active');
                fetchReportHistory(); 
            }
        });
    }

    if (closeHistoryBtn && historyModal) {
        closeHistoryBtn.addEventListener('click', () => historyModal.classList.remove('active'));
        historyModal.addEventListener('click', (e) => {
            if (e.target === historyModal) historyModal.classList.remove('active');
        });
    }

    // ==========================================
    // 🟢 SUBMIT REPORT LOGIC
    // ==========================================
    const submitBtn = document.getElementById('submitBtn');
    const reportTitle = document.getElementById('reportTitle');
    const reportDesc = document.getElementById('reportDesc');
    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const uploadBox = document.getElementById('uploadBox');

    // Image Preview
    if (imageUpload) {
        imageUpload.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                if (file.size > 15 * 1024 * 1024) { 
                    alert("File size too large (Max 15MB)");
                    this.value = ""; return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = 'block';
                    if(uploadPlaceholder) uploadPlaceholder.style.display = 'none';
                    fileNameDisplay.textContent = file.name;
                    fileNameDisplay.style.display = 'block';
                    uploadBox.style.borderColor = '#0EA5E9'; 
                    uploadBox.style.backgroundColor = '#F0F9FF';
                }
                reader.readAsDataURL(file);
            } else {
                resetUploadBox();
            }
        });
    }

    function resetUploadBox() {
        imagePreview.src = "";
        imagePreview.style.display = 'none';
        if(uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
        fileNameDisplay.style.display = 'none';
        uploadBox.style.borderColor = ''; 
        uploadBox.style.backgroundColor = ''; 
    }

    // Submit Action
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const title = reportTitle.value.trim();
            const description = reportDesc.value.trim();
            const file = imageUpload.files[0];

            if (!title || !description) {
                alert("Please fill in both title and description.");
                return;
            }

            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            if (file) formData.append('reportImage', file);

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Submitting...';

                const response = await fetch(`${API_BASE_URL}/api/reports/add`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    // Show Success View
                    const formView = document.getElementById('report-form-view');
                    const successView = document.getElementById('report-success-view');
                    if(formView) formView.style.display = 'none';
                    if(successView) {
                        successView.style.display = 'flex';
                        successView.classList.add('fade-in');
                    }
                } else {
                    throw new Error(result.message || 'Submission failed');
                }
            } catch (error) {
                console.error('Error:', error);
                alert("Failed to submit: " + error.message);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Submit Report</span> <i class="fa-solid fa-paper-plane"></i>';
            }
        });
    }

    // ==========================================
    // 🟡 FETCH HISTORY FUNCTION
    // ==========================================
    async function fetchReportHistory() {
        const listContainer = document.getElementById('historyList');
        if (!listContainer) return;

        try {
            listContainer.innerHTML = `<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading...</p></div>`;

            const response = await fetch(`${API_BASE_URL}/api/reports/history`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to fetch history");
            const reports = await response.json();

            if (reports.length === 0) {
                listContainer.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>No reports found.</p></div>`;
                return;
            }

            let html = '';
            reports.forEach(report => {
                const date = new Date(report.created_at).toLocaleDateString('en-GB', { // 👈 เปลี่ยนเป็น en-GB
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
                });
                
                const isDone = report.is_done === 1;
                const statusClass = isDone ? 'status-done' : 'status-pending';
                const statusText = isDone ? 'Resolved' : 'Pending';
                const statusIcon = isDone ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-regular fa-clock"></i>';
                
                const noteHtml = report.management_note 
                    ? `<div style="margin-top:4px; font-size:0.85rem; color:#64748B;"><i class="fa-solid fa-reply fa-rotate-180" style="margin-right:4px;"></i> Admin: ${report.management_note}</div>` 
                    : '';

                html += `
                <div class="history-item">
                    <div class="item-left">
                        <div class="item-icon"><i class="fa-solid fa-bug"></i></div>
                        <div class="item-details">
                            <h4>${report.title}</h4>
                            <div class="item-date"><i class="fa-regular fa-calendar"></i> ${date}</div>
                            ${noteHtml}
                        </div>
                    </div>
                    <div class="status-badge ${statusClass}">${statusIcon} ${statusText}</div>
                </div>`;
            });
            listContainer.innerHTML = html;

        } catch (error) {
            console.error("History Error:", error);
            listContainer.innerHTML = `<div class="empty-state" style="color:#EF4444"><i class="fa-solid fa-circle-exclamation"></i><p>Error loading reports.</p></div>`;
        }
    }
    
    // LOGOUT
    const logoutBtn = document.getElementById("logout-btn");
    if(logoutBtn) {
        logoutBtn.addEventListener("click", () => {
             localStorage.clear();
             window.location.href = "log-in-page.html";
        });
    }
});