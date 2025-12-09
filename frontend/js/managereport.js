const API_BASE_URL = 'https://reading-journal.xyz';

document.addEventListener('DOMContentLoaded', () => {
    // ⚠️ ตรวจสอบ URL API ของคุณให้ถูกต้อง
    const API_URL = '/api/admin/reports';

    let reports = [];
    let currentPage = 1;
    const rowsPerPage = 10;
    let currentReportId = null; 

    // --- Elements ---
    const tableBody = document.getElementById('reportTableBody'); 
    const searchInput = document.getElementById('searchInput');
    const paginationContainer = document.getElementById('paginationContainer');
    const sortSelect = document.getElementById('sortReports');
    const filterStatusSelect = document.getElementById('filterStatus');

    // --- Modal Elements ---
    const modalOverlay = document.getElementById('reportDetailModal');
    const closeDetailModalBtn = document.getElementById('closeDetailModal');
    const modalTitle = document.getElementById('reportDetailTitle');
    const modalDesc = document.getElementById('reportDetailDescription');
    const modalDate = document.getElementById('reportCreatedAt'); 
    const modalImage = document.getElementById('detailImage');
    const modalPlaceholder = document.getElementById('placeholderImg');
    const modalNote = document.getElementById('reportManagementNote'); // ช่องบันทึกข้อความ Admin

    const btnMarkDone = document.getElementById('btnMarkDone');
    const btnMarkNotDone = document.getElementById('btnMarkNotDone');

    // --- Helper: Format Date ---
    function formatThaiDate(isoString) {
        if (!isoString || isoString === '0000-00-00 00:00:00') return "-";
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "-";
        return date.toLocaleString('en-GB', { 
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false 
        });
    }

    // ------------------------------------------------
    // 1. FETCH DATA
    // ------------------------------------------------
    async function fetchReports() {
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error('Failed to fetch reports');
            const data = await res.json();
            
            reports = data.map(item => ({
                id: item.report_id || item.id,
                title: item.title,
                description: item.description,
                image: item.image, 
                status: (item.is_done === 1 || item.status === 'done' || item.is_done === true) ? 'done' : 'not_done',
                created_at: item.created_at, 
                dateObj: item.created_at ? new Date(item.created_at) : new Date(0),
                managed_by: item.managed_by || '-',
                managed_at: item.managed_at || null,
                management_note: item.management_note || ''
            }));

            renderTable();
        } catch (err) {
            console.error(err);
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red; padding:20px;">Cannot connect to server</td></tr>';
            }
        }
    }

    // ------------------------------------------------
    // 2. RENDER TABLE
    // ------------------------------------------------
    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        let processedData = reports.filter(r => {
            const searchVal = searchInput.value.trim().toLowerCase();
            const matchSearch = r.id.toString().includes(searchVal) || r.title.toLowerCase().includes(searchVal);
            const statusVal = filterStatusSelect.value;
            const matchStatus = statusVal === 'all' || r.status === statusVal;
            return matchSearch && matchStatus;
        });

        const sortVal = sortSelect.value;
        processedData.sort((a, b) => {
            return sortVal === 'newest' ? b.dateObj - a.dateObj : a.dateObj - b.dateObj;
        });

        const totalPages = Math.ceil(processedData.length / rowsPerPage);
        if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
        
        const startIndex = (currentPage - 1) * rowsPerPage;
        const currentData = processedData.slice(startIndex, startIndex + rowsPerPage);

        if (currentData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#999;">No reports found</td></tr>';
            renderPagination(0);
            return;
        }

        currentData.forEach(r => {
            const tr = document.createElement('tr');
            const statusIcon = r.status === 'done' 
                ? '<i class="fas fa-check-circle" style="color: #2ec4b6; font-size:1.2rem;"></i>' 
                : '<i class="fas fa-clock" style="color: #fcc419; font-size:1.2rem;"></i>';

            tr.innerHTML = `
                <td style="text-align: center;">${r.id}</td>
                <td>${r.title}</td>
                <td>${r.description.length > 30 ? r.description.substring(0, 30) + '...' : r.description}</td>
                <td style="color: #666; font-size: 13px;">${formatThaiDate(r.created_at)}</td>
                <td style="color: #333; font-weight: 500;">${r.managed_by}</td>
                <td style="color: #666; font-size: 13px;">${formatThaiDate(r.managed_at)}</td>
                <td style="text-align: center;">${statusIcon}</td>
                <td style="text-align: center;">
                    <button class="btn-view" style="background: #49768B; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: 0.2s;">View</button>
                </td>
            `;
            
            tr.querySelector('.btn-view').addEventListener('click', (e) => {
                e.stopPropagation();
                openModal(r);
            });

            tableBody.appendChild(tr);
        });

        renderPagination(processedData.length);
    }

    // ------------------------------------------------
    // 3. PAGINATION
    // ------------------------------------------------
    function renderPagination(totalRows) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(totalRows / rowsPerPage);
        if (totalPages <= 1) return;

        const createBtn = (text, onClick, isActive, isDisabled) => {
            const div = document.createElement('div');
            div.innerHTML = text;
            div.className = String(text).includes('fa-') ? 'pagination-arrow' : 'pagination-number';
            if (isActive) div.classList.add('active');
            if (isDisabled) {
                div.style.opacity = '0.3'; div.style.cursor = 'not-allowed';
            } else {
                div.onclick = onClick;
            }
            return div;
        };

        paginationContainer.appendChild(createBtn('<i class="fas fa-chevron-left"></i>', () => { currentPage--; renderTable(); }, false, currentPage === 1));
        for (let i = 1; i <= totalPages; i++) {
            paginationContainer.appendChild(createBtn(i, () => { currentPage = i; renderTable(); }, i === currentPage));
        }
        paginationContainer.appendChild(createBtn('<i class="fas fa-chevron-right"></i>', () => { currentPage++; renderTable(); }, false, currentPage === totalPages));
    }

    // ------------------------------------------------
    // 4. REPORT DETAIL MODAL LOGIC
    // ------------------------------------------------
    function openModal(report) {
        currentReportId = report.id;
        modalTitle.value = report.title;
        modalDesc.value = report.description;
        if (modalDate) modalDate.value = formatThaiDate(report.created_at);
        modalNote.value = report.management_note;

        if (report.image && report.image.length > 50) { 
            modalImage.src = report.image;
            modalImage.style.display = 'block';
            modalPlaceholder.style.display = 'none';
        } else {
            modalImage.style.display = 'none';
            modalPlaceholder.style.display = 'flex';
        }

        if (report.status === 'done') {
            btnMarkDone.style.display = 'none';
            btnMarkNotDone.style.display = 'inline-block';
        } else {
            btnMarkDone.style.display = 'inline-block';
            btnMarkNotDone.style.display = 'none';
        }

        modalOverlay.style.display = 'flex';
    }

    function closeModal() {
        modalOverlay.style.display = 'none';
        currentReportId = null;
    }

    // ------------------------------------------------
    // 5. UPDATE STATUS API
    // ------------------------------------------------
    async function updateStatus(newStatus) {
        if (!currentReportId) return;
        const apiStatus = newStatus === 'done' ? 1 : 0;
        const adminName = localStorage.getItem('username') || 'Admin';
        const noteValue = modalNote.value;

        try {
            const res = await fetch(`${API_URL}/${currentReportId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    is_done: apiStatus,
                    management_note: noteValue,
                    managed_by: adminName
                })
            });

            if (res.ok) {
                const r = reports.find(item => item.id === currentReportId);
                if (r) {
                    r.status = newStatus;
                    r.management_note = noteValue;
                    if (newStatus === 'done') {
                        r.managed_by = adminName;
                        r.managed_at = new Date().toISOString();
                    }
                }
                closeModal();
                renderTable();
            } else {
                alert('Failed to update status');
            }
        } catch (err) {
            console.error(err);
            alert('Server error');
        }
    }

    // ------------------------------------------------
    // 6. LISTENERS
    // ------------------------------------------------
    if(searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
    if(sortSelect) sortSelect.addEventListener('change', () => { currentPage = 1; renderTable(); });
    if(filterStatusSelect) filterStatusSelect.addEventListener('change', () => { currentPage = 1; renderTable(); });
    if(closeDetailModalBtn) closeDetailModalBtn.addEventListener('click', closeModal);
    if(btnMarkDone) btnMarkDone.addEventListener('click', () => updateStatus('done'));
    if(btnMarkNotDone) btnMarkNotDone.addEventListener('click', () => updateStatus('not_done'));

    // เริ่มทำงาน
    fetchReports();
});
