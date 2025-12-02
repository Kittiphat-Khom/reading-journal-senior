const API_BASE_URL = 'https://reading-journal.xyz';

document.addEventListener('DOMContentLoaded', () => {
    // ⚠️ ตรวจสอบ Port
    const API_URL = '/api/admin/users';

    let users = [];
    let currentPage = 1;
    const rowsPerPage = 10;

    // --- Elements ---
    const userTableBody = document.getElementById('userTableBody'); 
    const searchInput = document.getElementById('searchUser'); 
    const searchBtn = document.getElementById('searchBtnUser');
    const paginationContainer = document.getElementById('paginationUsers'); 
    const sortDateSelect = document.getElementById('sortUser');
    const selectAllButton = document.getElementById('selectAllBtn');

    // Modals & Forms
    const addUserIcon = document.getElementById('addUserIcon');
    const addUserModalOverlay = document.getElementById('addUserModalOverlay');
    const addUserModalCancelBtn = document.getElementById('addUserModalCancelBtn');
    const addUserModalDoneBtn = document.getElementById('addUserModalDoneBtn');
    const addUserModalForm = document.getElementById('addUserModalForm');
    const addUsernameInput = document.getElementById('addUsername');
    const addEmailInput = document.getElementById('addEmail');
    const addPasswordInput = document.getElementById('addPassword');

    const editDataIcon = document.getElementById('editDataIcon');
    const editModalOverlay = document.getElementById('editModalOverlay');
    const editModalCancelBtn = document.getElementById('editModalCancelBtn');
    const editModalConfirmBtn = document.getElementById('editModalConfirmBtn');
    const editUserIdInput = document.getElementById('editUserId');
    const editUsernameInput = document.getElementById('editUsername');
    const editEmailInput = document.getElementById('editEmail');
    // const editPasswordInput = document.getElementById('editPassword');

    const deleteIcon = document.getElementById('deleteIcon');
    const deleteModalOverlay = document.getElementById('deleteModalOverlay');
    const deleteModalCancelBtn = document.getElementById('deleteModalCancelBtn');
    const deleteModalConfirmBtn = document.getElementById('deleteModalConfirmBtn');

    // ✅ ฟังก์ชันจัดรูปแบบวันที่ให้ปลอดภัย (แก้ปัญหา Invalid Date)
    function formatUserDate(dateString) {
        if (!dateString) return "-"; // ถ้าไม่มีข้อมูล ให้ขีด -
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "-"; // ถ้าแปลงไม่ได้ ให้ขีด -
        
        // คืนค่าเป็น วัน/เดือน/ปี (เช่น 26/11/2023)
        return date.toLocaleDateString('en-GB');
    }

    // ------------------------------------------------
    // 1. FETCH USERS
    // ------------------------------------------------
    async function fetchUsers() {
        if (!userTableBody) return;

        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            
            // 🛠️ DEBUG: ดูว่าข้อมูล created_at ส่งมาจริงไหม
            console.log("User Data from API:", data); 

            users = data.map(u => ({
                ...u,
                // ใช้ created_at สำหรับ sort (ถ้าไม่มีให้ใช้เวลา 0)
                created_at_obj: u.created_at ? new Date(u.created_at) : new Date(0),
                selected: false
            }));

            renderTable();
        } catch (err) {
            console.error(err);
            userTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red; padding: 20px;">Cannot load users</td></tr>';
        }
    }

    // ------------------------------------------------
    // 2. RENDER TABLE
    // ------------------------------------------------
    function renderTable() {
        if (!userTableBody) return;
        userTableBody.innerHTML = '';

        // Filter
        let processedData = users.filter(u => {
            const term = searchInput ? searchInput.value.trim().toLowerCase() : '';
            const matchId = u.user_id && u.user_id.toString().includes(term);
            const matchName = u.username && u.username.toLowerCase().includes(term);
            return matchId || matchName;
        });

        // Sort
        if (sortDateSelect) {
            const sortVal = sortDateSelect.value;
            processedData.sort((a, b) => {
                return sortVal === 'newest' ? b.created_at_obj - a.created_at_obj : a.created_at_obj - b.created_at_obj;
            });
        }

        // Pagination
        const totalPages = Math.ceil(processedData.length / rowsPerPage);
        if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
        const startIndex = (currentPage - 1) * rowsPerPage;
        const currentData = processedData.slice(startIndex, startIndex + rowsPerPage);

        if (currentData.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">No users found</td></tr>';
            renderPagination(0);
            return;
        }

        currentData.forEach(u => {
            const tr = document.createElement('tr');
            
            const isChecked = u.selected ? 'checked' : '';
            const rowBg = u.selected ? 'background-color: #f0f8ff;' : '';
            tr.style = rowBg;

            // ✅ ใช้ formatUserDate ตรงช่อง Created At
            tr.innerHTML = `
                <td style="text-align: center;">
                    <input type="checkbox" class="user-checkbox" data-id="${u.user_id}" ${isChecked}>
                </td>
                <td>${u.user_id}</td>
                <td>${u.username}</td>
                <td>${u.email}</td>
                <td>${formatUserDate(u.created_at)}</td> 
            `;

            tr.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    u.selected = !u.selected;
                    renderTable();
                }
            });

            const checkbox = tr.querySelector('.user-checkbox');
            checkbox.addEventListener('change', (e) => {
                u.selected = e.target.checked;
                renderTable();
            });

            userTableBody.appendChild(tr);
        });

        updateSelectAllButtonState();
        renderPagination(processedData.length);
    }

    // ------------------------------------------------
    // 3. PAGINATION & HELPER
    // ------------------------------------------------
    function renderPagination(totalRows) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(totalRows / rowsPerPage);
        if (totalPages <= 1) return;

        const createBtn = (text, onClick, isActive) => {
            const div = document.createElement('div');
            div.innerHTML = text;
            div.className = String(text).includes('fa-') ? 'pagination-arrow' : 'pagination-number';
            if (isActive) div.classList.add('active');
            div.onclick = onClick;
            return div;
        };

        paginationContainer.appendChild(createBtn('<i class="fas fa-chevron-left"></i>', () => { currentPage--; renderTable(); }, false));
        for (let i = 1; i <= totalPages; i++) {
            paginationContainer.appendChild(createBtn(i, () => { currentPage = i; renderTable(); }, i === currentPage));
        }
        paginationContainer.appendChild(createBtn('<i class="fas fa-chevron-right"></i>', () => { currentPage++; renderTable(); }, false));
    }

    function updateSelectAllButtonState() {
        if (!selectAllButton) return;
        const allSelected = users.length > 0 && users.every(u => u.selected);
        selectAllButton.textContent = allSelected ? 'Deselect All' : 'Select All';
    }

    if (selectAllButton) {
        selectAllButton.addEventListener('click', () => {
            const allSelected = users.length > 0 && users.every(u => u.selected);
            users.forEach(u => u.selected = !allSelected);
            renderTable();
        });
    }

    function getCheckedUserIds() {
        return users.filter(u => u.selected).map(u => u.user_id);
    }

    // ------------------------------------------------
    // 4. CRUD OPERATIONS (Add, Edit, Delete)
    // ------------------------------------------------
    if (addUserIcon) addUserIcon.addEventListener('click', () => addUserModalOverlay.style.display = 'flex');
    if (addUserModalCancelBtn) addUserModalCancelBtn.addEventListener('click', () => addUserModalOverlay.style.display = 'none');
    
    if (addUserModalDoneBtn) {
        addUserModalDoneBtn.addEventListener('click', async () => {
            try {
                const res = await fetch(`${API_URL}/add`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: addUsernameInput.value,
                        email: addEmailInput.value,
                        password: addPasswordInput.value
                    })
                });
                if (res.ok) {
                    addUserModalOverlay.style.display = 'none';
                    addUserModalForm.reset();
                    fetchUsers();
                } else {
                    alert('Error adding user');
                }
            } catch (err) { console.error(err); }
        });
    }

    if (editDataIcon) {
        editDataIcon.addEventListener('click', () => {
            const checkedIds = getCheckedUserIds();
            if (checkedIds.length !== 1) {
                alert('Please select exactly one user to edit.');
                return;
            }
            const user = users.find(u => u.user_id === checkedIds[0]);
            if (user) {
                editUserIdInput.value = user.user_id;
                editUsernameInput.value = user.username;
                editEmailInput.value = user.email;
                // editPasswordInput.value = ''; 
                editModalOverlay.style.display = 'flex';
            }
        });
    }
    
    if (editModalCancelBtn) editModalCancelBtn.addEventListener('click', () => editModalOverlay.style.display = 'none');
    if (editModalConfirmBtn) {
        editModalConfirmBtn.addEventListener('click', async () => {
            try {
                const id = editUserIdInput.value;
                const body = {
                    username: editUsernameInput.value,
                    email: editEmailInput.value
                };
                // if (editPasswordInput.value) body.password = editPasswordInput.value;

                const res = await fetch(`${API_URL}/update/${id}`, {
                        method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                if (res.ok) {
                    editModalOverlay.style.display = 'none';
                    fetchUsers();
                } else alert('Error updating user');
            } catch (err) { console.error(err); }
        });
    }

    if (deleteIcon) {
        deleteIcon.addEventListener('click', () => {
            const checkedIds = getCheckedUserIds();
            if (checkedIds.length === 0) return alert('Select user to delete');
            deleteModalOverlay.style.display = 'flex';
        });
    }
    if (deleteModalCancelBtn) deleteModalCancelBtn.addEventListener('click', () => deleteModalOverlay.style.display = 'none');
    if (deleteModalConfirmBtn) {
        deleteModalConfirmBtn.addEventListener('click', async () => {
            const checkedIds = getCheckedUserIds();
            try {
                await Promise.all(checkedIds.map(id => fetch(`${API_URL}/delete/${id}`, { method: 'DELETE' })));
                deleteModalOverlay.style.display = 'none';
                fetchUsers();
            } catch (err) { console.error(err); }
        });
    }

    // Listeners
    if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
    if (sortDateSelect) sortDateSelect.addEventListener('change', renderTable);

    fetchUsers();
});