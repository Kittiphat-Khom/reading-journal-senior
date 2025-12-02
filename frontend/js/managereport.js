const API_BASE_URL = 'https://reading-journal.xyz';

document.addEventListener('DOMContentLoaded', () => {
    // ⚠️ ตรวจสอบ Port และ URL ของ API ให้ถูกต้อง
    const API_URL = '/api/admin/reports';

    let reports = [];
    let currentPage = 1;
    const rowsPerPage = 10;
    let currentReportId = null; 

    // --- Elements (ตารางและปุ่มค้นหา) ---
    const tableBody = document.getElementById('reportTableBody'); 
    const searchInput = document.getElementById('searchInput');
    const paginationContainer = document.getElementById('paginationContainer');
    const sortSelect = document.getElementById('sortReports');
    const filterStatusSelect = document.getElementById('filterStatus');

    // --- Elements (Modal รายละเอียด) ---
    const modalOverlay = document.getElementById('reportDetailModal');
    const closeDetailModalBtn = document.getElementById('closeDetailModal');
    const modalTitle = document.getElementById('reportDetailTitle');
    const modalDesc = document.getElementById('reportDetailDescription');
    const modalDate = document.getElementById('reportCreatedAt'); 
    const modalImage = document.getElementById('detailImage');
    const modalPlaceholder = document.getElementById('placeholderImg');
    
    // ✅ Element ใหม่: ช่อง Management Note (วิธีการแก้ไข)
    const modalNote = document.getElementById('reportManagementNote');

    const btnMarkDone = document.getElementById('btnMarkDone');
    const btnMarkNotDone = document.getElementById('btnMarkNotDone');

    // --- Helper: Format Date ---
    function formatThaiDate(isoString) {
        if (!isoString || isoString === '0000-00-00 00:00:00') return "-";
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "-";

        // รูปแบบวันที่: 25 Nov 2025, 14:30
        return date.toLocaleString('en-GB', { 
            year: 'numeric',
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false 
        });
    }

    // ------------------------------------------------
    // 1. FETCH DATA (ดึงข้อมูล)
    // ------------------------------------------------
    async function fetchReports() {
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error('Failed to fetch reports');
            const data = await res.json();
            
            // Map ข้อมูลให้ตรงกับโครงสร้างที่เราใช้งาน
            reports = data.map(item => ({
                id: item.report_id || item.id,
                title: item.title,
                description: item.description,
                image: item.image, 
                status: (item.is_done === 1 || item.status === 'done' || item.is_done === true) ? 'done' : 'not_done',
                created_at: item.created_at, 
                dateObj: item.created_at ? new Date(item.created_at) : new Date(0),
                
                // ✅ รับค่าคอลัมน์ใหม่จาก Backend
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
    // 2. RENDER TABLE (แสดงตาราง)
    // ------------------------------------------------
    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        // Filter: กรองตามคำค้นหาและสถานะ
        let processedData = reports.filter(r => {
            const searchVal = searchInput.value.trim().toLowerCase();
            const matchSearch = r.id.toString().includes(searchVal) || r.title.toLowerCase().includes(searchVal);
            const statusVal = filterStatusSelect.value;
            const matchStatus = statusVal === 'all' || r.status === statusVal;
            return matchSearch && matchStatus;
        });

        // Sort: เรียงลำดับ
        const sortVal = sortSelect.value;
        processedData.sort((a, b) => {
            return sortVal === 'newest' ? b.dateObj - a.dateObj : a.dateObj - b.dateObj;
        });

        // Pagination: แบ่งหน้า
        const totalPages = Math.ceil(processedData.length / rowsPerPage);
        if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
        
        const startIndex = (currentPage - 1) * rowsPerPage;
        const currentData = processedData.slice(startIndex, startIndex + rowsPerPage);

        // กรณีไม่มีข้อมูล
        if (currentData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#999;">No reports found</td></tr>';
            renderPagination(0);
            return;
        }

        // วนลูปสร้างแถวตาราง
        currentData.forEach(r => {
            const tr = document.createElement('tr');
            const statusIcon = r.status === 'done' 
                ? '<i class="fas fa-check-circle" style="color: #2ec4b6; font-size:1.2rem;"></i>' 
                : '<i class="fas fa-clock" style="color: #fcc419; font-size:1.2rem;"></i>';

            tr.innerHTML = `
                <td>${r.id}</td>
                <td>${r.title}</td>
                <td>${r.description.length > 40 ? r.description.substring(0, 40) + '...' : r.description}</td>
                
                <td style="color: #666; font-size: 13px;">${formatThaiDate(r.created_at)}</td>

                <td style="color: #333; font-weight: 500;">${r.managed_by}</td>
                <td style="color: #666; font-size: 13px;">${formatThaiDate(r.managed_at)}</td>

                <td style="text-align: center;">${statusIcon}</td>
                <td style="text-align: center;">
                    <button class="btn-view" style="background: #49768B; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: 0.2s;">View</button>
                </td>
            `;
            
            // ปุ่ม View
            tr.querySelector('.btn-view').addEventListener('click', (e) => {
                e.stopPropagation();
                openModal(r);
            });

            tableBody.appendChild(tr);
        });

        renderPagination(processedData.length);
    }

    // ------------------------------------------------
    // 3. PAGINATION (ตัวแบ่งหน้า)
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
    // 4. MODAL LOGIC (หน้าต่างรายละเอียด)
    // ------------------------------------------------
    function openModal(report) {
        currentReportId = report.id;
        modalTitle.value = report.title;
        modalDesc.value = report.description;
        if (modalDate) modalDate.value = formatThaiDate(report.created_at);

        // ✅ แสดง Note เดิมที่เคยบันทึกไว้ (ถ้ามี)
        modalNote.value = report.management_note;

        // แสดงรูปภาพ
        if (report.image && report.image.length > 50) { 
            modalImage.src = report.image;
            modalImage.style.display = 'block';
            modalPlaceholder.style.display = 'none';
        } else {
            modalImage.style.display = 'none';
            modalPlaceholder.style.display = 'flex';
        }

        // จัดการปุ่ม (ถ้า Done แล้ว ให้ซ่อนปุ่ม Done)
        if (report.status === 'done') {
            btnMarkDone.style.display = 'none';
            btnMarkNotDone.style.display = 'inline-block';
            // modalNote.disabled = true; // เอาคอมเมนต์ออกถ้าต้องการห้ามแก้ไขเมื่อเสร็จแล้ว
        } else {
            btnMarkDone.style.display = 'inline-block';
            btnMarkNotDone.style.display = 'none';
            modalNote.disabled = false;
        }

        modalOverlay.style.display = 'flex';
    }

    function closeModal() {
        modalOverlay.style.display = 'none';
        currentReportId = null;
    }

    // ------------------------------------------------
    // 5. UPDATE STATUS API (บันทึกข้อมูล)
    // ------------------------------------------------
    async function updateStatus(newStatus) {
        if (!currentReportId) return;
        const apiStatus = newStatus === 'done' ? 1 : 0;
        
        // ✅ 1. ดึงชื่อ Admin จาก LocalStorage
        const adminName = localStorage.getItem('username') || 'Admin';

        // ✅ 2. ดึงค่า Note จาก Input
        const noteValue = modalNote.value;

        try {
            const res = await fetch(`${API_URL}/${currentReportId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    is_done: apiStatus,
                    management_note: noteValue, // ส่ง Note ไปด้วย
                    managed_by: adminName       // ส่งชื่อคนทำไปด้วย
                })
            });

            if (res.ok) {
                // ✅ Update Local Data ทันทีเพื่อให้ UI เปลี่ยนไม่ต้องโหลดใหม่
                const r = reports.find(item => item.id === currentReportId);
                if (r) {
                    r.status = newStatus;
                    r.management_note = noteValue;
                    
                    if (newStatus === 'done') {
                        r.managed_by = adminName;
                        r.managed_at = new Date().toISOString(); // ใส่วันที่ปัจจุบันทันที
                    } else {
                        // ถ้ากด Not Done จะเคลียร์ค่า หรือคงไว้ก็ได้ (ที่นี่เลือกคงไว้เพื่อ history)
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
    // 6. LISTENERS (ดักจับเหตุการณ์)
    // ------------------------------------------------
    if(searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
    if(sortSelect) sortSelect.addEventListener('change', () => { currentPage = 1; renderTable(); });
    if(filterStatusSelect) filterStatusSelect.addEventListener('change', () => { currentPage = 1; renderTable(); });

    if(closeDetailModalBtn) closeDetailModalBtn.addEventListener('click', closeModal);
    
    // ปุ่ม Save/Mark Done
    if(btnMarkDone) btnMarkDone.addEventListener('click', () => updateStatus('done'));
    if(btnMarkNotDone) btnMarkNotDone.addEventListener('click', () => updateStatus('not_done'));

    // เริ่มการทำงาน
    fetchReports();
});