// users.js — Diekstrak dari users.html (cacheable)
let usersList = [];
        let currentAuthUser = null;

        // =====================================================================
        // AUTH GUARD: HANYA ADMIN YANG DAPAT MENGAKSES
        // =====================================================================
        function verifyAdminAccess() {
            currentAuthUser = window.APA_AUTH ? window.APA_AUTH.getCurrentUser() : null;
            if (!currentAuthUser) {
                try {
                    currentAuthUser = JSON.parse(localStorage.getItem('apa_user') || sessionStorage.getItem('apa_user') || 'null');
                } catch {
                    currentAuthUser = null;
                }
            }

            if (!currentAuthUser) {
                window.location.href = 'login.html';
                return false;
            }

            const isAdmin = currentAuthUser.role === 'admin' || (Array.isArray(currentAuthUser.roles) && currentAuthUser.roles.includes('admin'));
            if (!isAdmin) {
                alert('Akses Ditolak: Halaman Manajemen Pengguna hanya dapat diakses oleh Administrator.');
                window.location.href = 'profile.html';
                return false;
            }

            // Render Info Topbar & Sidebar
            if (window.APATopbar) window.APATopbar.renderUser(currentAuthUser);
            if (window.APASidebar) window.APASidebar.renderUser(currentAuthUser);

            return true;
        }

        // Jalankan Pengecekan Akses Segera
        if (!verifyAdminAccess()) {
            throw new Error('Akses Ditolak');
        }

        // =====================================================================
        // LOAD DATA USERS (SUPABASE + LOCAL STORAGE FALLBACK)
        // =====================================================================
        window.addEventListener('DOMContentLoaded', async () => {
            await loadUsers();
        });

        async function loadUsers() {
            let loadedFromSupabase = false;
            const sb = window.supabaseClient;

            if (sb) {
                try {
                    const { data, error } = await sb.rpc('admin_get_all_users');
                    if (!error && Array.isArray(data) && data.length > 0) {
                        usersList = data.map(u => ({
                            id: u.id,
                            username: u.username,
                            full_name: u.full_name,
                            role: u.role || 'user',
                            roles: Array.isArray(u.roles) ? u.roles : (u.role === 'admin' ? ['admin', 'user'] : ['user']),
                            must_change_password: Boolean(u.must_change_password),
                            pegawai_nip: u.pegawai_nip || '-',
                            status_kepegawaian: u.status_kepegawaian || 'aktif',
                            last_login: u.last_login
                        }));
                        loadedFromSupabase = true;
                    }
                } catch (err) {
                    console.warn("Gagal fetch dari Supabase admin_get_all_users RPC:", err);
                }
            }

            if (!loadedFromSupabase) {
                usersList = [];
                showToast('Gagal memuat daftar pengguna dari database. Periksa koneksi.');
            }

            renderUsersTable(usersList);
            updateStatsCounters();
        }

        function saveUsersToLocalStorage() {
            // Tidak lagi menyimpan direktori PII pengguna ke localStorage
        }

        // =====================================================================
        // RENDER TABEL & STATS
        // =====================================================================
        function renderUsersTable(data) {
            const tbody = document.getElementById('userTableBody');
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="table-empty-state">
                            <div class="table-empty-icon">🔍</div>
                            <div style="font-weight: 700;">Tidak ada pengguna yang cocok</div>
                            <div style="font-size: 0.8rem; margin-top: 4px;">Coba gunakan kata kunci pencarian atau filter yang berbeda.</div>
                        </td>
                    </tr>
                `;
                return;
            }

            data.forEach(user => {
                const tr = document.createElement('tr');
                const isRizalAkbar = user.username.toLowerCase() === 'rizal.akbar';
                const isAdmin = user.role === 'admin' || (Array.isArray(user.roles) && user.roles.includes('admin'));
                const isActive = (user.status_kepegawaian || 'aktif').toLowerCase() !== 'nonaktif' && (user.status_kepegawaian || 'aktif').toLowerCase() !== 'pensiun';

                const initials = (user.full_name || user.username).split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'US';

                // Badges Roles
                let rolesBadgesHtml = '';
                const rolesArr = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role || 'user'];
                if (rolesArr.includes('admin')) {
                    rolesBadgesHtml += `<span class="badge-role admin">🛡️ Admin</span>`;
                }
                if (rolesArr.includes('user')) {
                    rolesBadgesHtml += `<span class="badge-role user">👤 Pegawai</span>`;
                }

                // Format Waktu Terakhir Login
                let lastLoginText = '-';
                if (user.last_login) {
                    const d = new Date(user.last_login);
                    lastLoginText = !isNaN(d.getTime())
                        ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        : String(user.last_login);
                }

                tr.innerHTML = `
                    <td>
                        <div class="user-col">
                            <div class="user-avatar-circle ${isAdmin ? 'admin-avatar' : ''}">${escapeHtml(initials)}</div>
                            <div>
                                <div class="user-name-title">
                                    <span>${escapeHtml(user.full_name)}</span>
                                    ${isRizalAkbar ? '<span class="badge-permanent" title="Admin Tetap Sistem (Permanen)">⭐ Admin Tetap</span>' : ''}
                                </div>
                                <div class="user-username-sub">@${escapeHtml(user.username)}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div>${rolesBadgesHtml}</div>
                    </td>
                    <td>
                        <span class="badge-status ${isActive ? 'active' : 'inactive'}">
                            <span class="status-dot"></span>
                            <span>${isActive ? 'Aktif' : 'Nonaktif'}</span>
                        </span>
                    </td>
                    <td>
                        <span style="font-family: monospace; font-size: 0.85rem; color: #475569;">${escapeHtml(user.pegawai_nip || '-')}</span>
                    </td>
                    <td>
                        <span style="font-size: 0.82rem; color: #64748b;">${escapeHtml(lastLoginText)}</span>
                    </td>
                    <td>
                        <div class="action-btn-group" style="justify-content: flex-end;">
                            <!-- Tombol Kelola Role -->
                            <button class="btn-table-action" data-action="edit-role" data-username="${escapeHtml(user.username)}" title="Kelola Role & Hak Akses">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                            </button>

                            <!-- Tombol Reset Password -->
                            <button class="btn-table-action" data-action="reset-pwd" data-username="${escapeHtml(user.username)}" title="Reset Password">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5-4 4 1.5 1.5L9 14l-5 5H2v-2l5-5 1.5 1.5L12 10l-1.5-1.5 3.5-3.5 1.5 1.5 2-2z"></path><circle cx="16" cy="6" r="3"></circle></svg>
                            </button>

                            <!-- Tombol Hapus / Nonaktifkan (Terkunci untuk rizal.akbar) -->
                            <button class="btn-table-action delete ${isRizalAkbar ? 'disabled' : ''}" 
                                    data-action="delete-user" data-username="${escapeHtml(user.username)}"
                                    title="${isRizalAkbar ? 'Admin Tetap rizal.akbar dilindungi (tidak dapat dihapus)' : 'Hapus atau Nonaktifkan Pengguna'}" 
                                    ${isRizalAkbar ? 'disabled' : ''}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Event delegation aman untuk tombol aksi tabel user (menghindari inline onclick injection)
        document.getElementById('userTableBody')?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn || btn.disabled) return;
            const uname = btn.dataset.username || '';
            const action = btn.dataset.action;
            if (action === 'edit-role') openEditRoleModal(uname);
            else if (action === 'reset-pwd') openResetPasswordModal(uname);
            else if (action === 'delete-user') openDeleteModal(uname);
        });

        function updateStatsCounters() {
            document.getElementById('statTotalUsers').textContent = usersList.length;
            const admins = usersList.filter(u => u.role === 'admin' || (Array.isArray(u.roles) && u.roles.includes('admin')));
            document.getElementById('statTotalAdmins').textContent = admins.length;
            const actives = usersList.filter(u => (u.status_kepegawaian || 'aktif').toLowerCase() !== 'nonaktif' && (u.status_kepegawaian || 'aktif').toLowerCase() !== 'pensiun');
            document.getElementById('statActiveUsers').textContent = actives.length;
            const mustChange = usersList.filter(u => u.must_change_password);
            document.getElementById('statMustChangePwd').textContent = mustChange.length;
        }

        function handleFilterUsers() {
            const query = document.getElementById('searchUserInput').value.trim().toLowerCase();
            const roleFilter = document.getElementById('filterRoleSelect').value;
            const statusFilter = document.getElementById('filterStatusSelect').value;

            const filtered = usersList.filter(u => {
                const matchSearch = !query || 
                    (u.full_name && u.full_name.toLowerCase().includes(query)) ||
                    (u.username && u.username.toLowerCase().includes(query)) ||
                    (u.pegawai_nip && u.pegawai_nip.toLowerCase().includes(query));

                const isAdmin = u.role === 'admin' || (Array.isArray(u.roles) && u.roles.includes('admin'));
                let matchRole = true;
                if (roleFilter === 'admin') matchRole = isAdmin;
                else if (roleFilter === 'user') matchRole = !isAdmin || (Array.isArray(u.roles) && u.roles.includes('user'));

                const isActive = (u.status_kepegawaian || 'aktif').toLowerCase() !== 'nonaktif' && (u.status_kepegawaian || 'aktif').toLowerCase() !== 'pensiun';
                let matchStatus = true;
                if (statusFilter === 'active') matchStatus = isActive;
                else if (statusFilter === 'inactive') matchStatus = !isActive;

                return matchSearch && matchRole && matchStatus;
            });

            renderUsersTable(filtered);
        }

        // =====================================================================
        // FITUR 1: TAMBAH PENGGUNA BARU
        // =====================================================================
        function openAddUserModal() {
            document.getElementById('formAddUser').reset();
            document.getElementById('addPassword').value = '';
            document.getElementById('addRoleUserCheck').checked = true;
            document.getElementById('addRoleAdminCheck').checked = false;
            syncAddRoleCards();
            document.getElementById('alertAddUser').style.display = 'none';
            openModal('modalAddUser');
        }

        function toggleAddRole(role) {
            const check = role === 'user' ? document.getElementById('addRoleUserCheck') : document.getElementById('addRoleAdminCheck');
            check.checked = !check.checked;
            syncAddRoleCards();
        }

        function syncAddRoleCards() {
            const userCheck = document.getElementById('addRoleUserCheck');
            const adminCheck = document.getElementById('addRoleAdminCheck');
            document.getElementById('cardAddRoleUser').classList.toggle('selected', userCheck.checked);
            document.getElementById('cardAddRoleAdmin').classList.toggle('selected', adminCheck.checked);
        }

        async function submitAddUser(e) {
            e.preventDefault();
            const username = document.getElementById('addUsername').value.trim().toLowerCase();
            const fullName = document.getElementById('addFullName').value.trim();
            const nip = document.getElementById('addNip').value.trim();
            const password = document.getElementById('addPassword').value;
            const hasUserRole = document.getElementById('addRoleUserCheck').checked;
            const hasAdminRole = document.getElementById('addRoleAdminCheck').checked;

            // Validasi 4: User minimal memiliki 1 role
            if (!hasUserRole && !hasAdminRole) {
                showAlert('alertAddUser', 'danger', 'User minimal harus memiliki 1 role!');
                return;
            }

            // Validasi Username Duplikat
            if (usersList.some(u => u.username.toLowerCase() === username)) {
                showAlert('alertAddUser', 'danger', `Username "${username}" sudah digunakan!`);
                return;
            }

            const roles = [];
            if (hasAdminRole) roles.push('admin');
            if (hasUserRole) roles.push('user');
            const primaryRole = hasAdminRole ? 'admin' : 'user';

            // Kirim ke Supabase dan verifikasi respons { data, error }
            const sb = window.supabaseClient;
            if (!sb) {
                showAlert('alertAddUser', 'danger', 'Koneksi database tidak tersedia.');
                return;
            }
            const { data: rpcData, error: rpcErr } = await sb.rpc('admin_create_user', {
                p_username: username,
                p_full_name: fullName,
                p_password: password,
                p_roles: roles,
                p_nip: nip || null
            });
            if (rpcErr || (rpcData && rpcData.success === false)) {
                showAlert('alertAddUser', 'danger', (rpcData && rpcData.message) || (rpcErr && rpcErr.message) || 'Gagal menambahkan pengguna.');
                return;
            }

            await loadUsers();
            if (typeof handleFilterUsers === 'function') handleFilterUsers();
            closeModal('modalAddUser');
            showToast(`Pengguna "${fullName}" berhasil ditambahkan!`);
        }

        // =====================================================================
        // FITUR 3 & 4 & 5: KELOLA & MENCABUT ROLE PADA USER
        // =====================================================================
        function openEditRoleModal(username) {
            const user = usersList.find(u => u.username.toLowerCase() === username.toLowerCase());
            if (!user) return;

            document.getElementById('editRoleUsername').value = user.username;
            document.getElementById('editRoleFullName').textContent = user.full_name;
            document.getElementById('editRoleUsernameDisplay').textContent = '@' + user.username;

            const initials = (user.full_name || user.username).split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
            document.getElementById('editRoleAvatar').textContent = initials;

            const rolesArr = Array.isArray(user.roles) ? user.roles : [user.role || 'user'];
            const userCheck = document.getElementById('editRoleUserCheck');
            const adminCheck = document.getElementById('editRoleAdminCheck');
            const cardAdmin = document.getElementById('cardEditRoleAdmin');
            const cardUser = document.getElementById('cardEditRoleUser');
            const rizalAlert = document.getElementById('rizalAkbarProtectionAlert');

            userCheck.checked = rolesArr.includes('user');
            adminCheck.checked = rolesArr.includes('admin');

            // ATURAN 5: User rizal.akbar adalah admin tetap (role admin tidak bisa dicabut)
            if (user.username.toLowerCase() === 'rizal.akbar') {
                adminCheck.checked = true;
                adminCheck.disabled = true;
                cardAdmin.classList.add('disabled');
                rizalAlert.style.display = 'flex';
            } else {
                adminCheck.disabled = false;
                cardAdmin.classList.remove('disabled');
                rizalAlert.style.display = 'none';
            }

            document.getElementById('alertEditRole').style.display = 'none';
            handleRoleCheckChange();
            openModal('modalEditRole');
        }

        function handleRoleCheckChange() {
            const userCheck = document.getElementById('editRoleUserCheck');
            const adminCheck = document.getElementById('editRoleAdminCheck');
            document.getElementById('cardEditRoleUser').classList.toggle('selected', userCheck.checked);
            document.getElementById('cardEditRoleAdmin').classList.toggle('selected', adminCheck.checked);

            // Validasi realtime: minimal 1 role
            const btnSubmit = document.getElementById('btnSubmitRole');
            if (!userCheck.checked && !adminCheck.checked) {
                showAlert('alertEditRole', 'danger', 'Peringatan: User minimal harus memiliki 1 role aktif!');
                btnSubmit.disabled = true;
                btnSubmit.style.opacity = '0.5';
            } else {
                document.getElementById('alertEditRole').style.display = 'none';
                btnSubmit.disabled = false;
                btnSubmit.style.opacity = '1';
            }
        }

        async function submitEditRole(e) {
            e.preventDefault();
            const username = document.getElementById('editRoleUsername').value;
            const hasUserRole = document.getElementById('editRoleUserCheck').checked;
            const hasAdminRole = document.getElementById('editRoleAdminCheck').checked;

            // ATURAN 4: User minimal memiliki 1 role
            if (!hasUserRole && !hasAdminRole) {
                showAlert('alertEditRole', 'danger', 'User minimal harus memiliki 1 role!');
                return;
            }

            // ATURAN 5: rizal.akbar adalah admin tetap
            if (username.toLowerCase() === 'rizal.akbar' && !hasAdminRole) {
                showAlert('alertEditRole', 'danger', 'Role admin untuk rizal.akbar tidak dapat dicabut (Admin Tetap)!');
                return;
            }

            const newRoles = [];
            if (hasAdminRole) newRoles.push('admin');
            if (hasUserRole) newRoles.push('user');
            const primaryRole = hasAdminRole ? 'admin' : 'user';

            // Sync ke Supabase dengan validasi { data, error }
            const sb = window.supabaseClient;
            if (!sb) {
                showAlert('alertEditRole', 'danger', 'Koneksi database tidak tersedia.');
                return;
            }
            const { data: rpcData, error: rpcErr } = await sb.rpc('admin_update_user_roles', {
                p_username: username,
                p_roles: newRoles
            });
            if (rpcErr || (rpcData && rpcData.success === false)) {
                showAlert('alertEditRole', 'danger', (rpcData && rpcData.message) || (rpcErr && rpcErr.message) || 'Gagal memperbarui role.');
                return;
            }

            const userIndex = usersList.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
            if (userIndex !== -1) {
                usersList[userIndex].role = primaryRole;
                usersList[userIndex].roles = newRoles;
            }

            if (typeof handleFilterUsers === 'function') handleFilterUsers();
            else renderUsersTable(usersList);
            updateStatsCounters();
            closeModal('modalEditRole');
            showToast(`Role pengguna @${username} berhasil diperbarui!`);
        }

        // =====================================================================
        // FITUR 2: RESET PASSWORD USER OLEH ADMIN
        // =====================================================================
        function openResetPasswordModal(username) {
            const user = usersList.find(u => u.username.toLowerCase() === username.toLowerCase());
            if (!user) return;

            document.getElementById('resetPasswordUsername').value = user.username;
            document.getElementById('resetPasswordFullName').textContent = user.full_name;
            document.getElementById('resetPasswordUsernameDisplay').textContent = '@' + user.username;
            document.getElementById('newResetPasswordInput').value = '';
            document.getElementById('checkMustChangePwd').checked = true;

            openModal('modalResetPassword');
        }

        async function submitResetPassword(e) {
            e.preventDefault();
            const username = document.getElementById('resetPasswordUsername').value;
            const newPassword = document.getElementById('newResetPasswordInput').value;
            const mustChange = document.getElementById('checkMustChangePwd').checked;

            if (newPassword.length < 6) {
                alert('Password baru minimal 6 karakter!');
                return;
            }

            // Sync ke Supabase dengan validasi { data, error }
            const sb = window.supabaseClient;
            if (!sb) {
                alert('Koneksi database tidak tersedia.');
                return;
            }
            const { data: rpcData, error: rpcErr } = await sb.rpc('admin_reset_user_password', {
                p_username: username,
                p_new_password: newPassword,
                p_must_change_password: mustChange
            });
            if (rpcErr || (rpcData && rpcData.success === false)) {
                alert((rpcData && rpcData.message) || (rpcErr && rpcErr.message) || 'Gagal mereset password.');
                return;
            }

            const userIndex = usersList.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
            if (userIndex !== -1) {
                usersList[userIndex].must_change_password = mustChange;
            }

            updateStatsCounters();
            closeModal('modalResetPassword');
            showToast(`Password @${username} berhasil direset!`);
        }

        // =====================================================================
        // FITUR 1: NONAKTIFKAN & HAPUS PENGGUNA (DENGAN PROTEKSI RIZAL AKBAR)
        // =====================================================================
        function openDeleteModal(username) {
            // ATURAN 5: rizal.akbar tidak bisa dihapus atau dinonaktifkan
            if (username.toLowerCase() === 'rizal.akbar') {
                alert('Peringatan: Pengguna rizal.akbar adalah Admin Tetap Sistem dan tidak dapat dihapus atau dinonaktifkan!');
                return;
            }

            const user = usersList.find(u => u.username.toLowerCase() === username.toLowerCase());
            if (!user) return;

            document.getElementById('deleteTargetUsername').value = user.username;
            document.getElementById('deleteTargetFullName').textContent = user.full_name;
            document.getElementById('deleteTargetUsernameDisplay').textContent = user.username;

            openModal('modalDeleteUser');
        }

        async function confirmDeactivateUser() {
            const username = document.getElementById('deleteTargetUsername').value;
            if (username.toLowerCase() === 'rizal.akbar') return;

            const sb = window.supabaseClient;
            const userIndex = usersList.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
            if (!sb || userIndex === -1) return;

            const currentStatus = (usersList[userIndex].status_kepegawaian || 'aktif').toLowerCase();
            const nextStatus = currentStatus === 'nonaktif' ? 'aktif' : 'nonaktif';

            const { error } = await sb.from('data_pegawai')
                .update({ status_kepegawaian: nextStatus })
                .eq('username', username);
            if (error) {
                alert('Gagal mengubah status pengguna: ' + error.message);
                return;
            }

            usersList[userIndex].status_kepegawaian = nextStatus;
            if (typeof handleFilterUsers === 'function') handleFilterUsers();
            else renderUsersTable(usersList);
            updateStatsCounters();
            closeModal('modalDeleteUser');
            showToast(`Status pengguna @${username} diubah menjadi ${nextStatus}!`);
        }

        async function confirmDeleteUserPermanently() {
            const username = document.getElementById('deleteTargetUsername').value;
            if (username.toLowerCase() === 'rizal.akbar') return;

            const sb = window.supabaseClient;
            if (!sb) {
                alert('Koneksi database tidak tersedia.');
                return;
            }
            const { data: rpcData, error: rpcErr } = await sb.rpc('admin_delete_user', { p_username: username });
            if (rpcErr || (rpcData && rpcData.success === false)) {
                alert((rpcData && rpcData.message) || (rpcErr && rpcErr.message) || 'Gagal menghapus pengguna.');
                return;
            }

            usersList = usersList.filter(u => u.username.toLowerCase() !== username.toLowerCase());
            if (typeof handleFilterUsers === 'function') handleFilterUsers();
            else renderUsersTable(usersList);
            updateStatsCounters();
            closeModal('modalDeleteUser');
            showToast(`Pengguna @${username} berhasil dihapus permanen!`);
        }

        // =====================================================================
        // UTILITIES: MODAL, ALERT, TOAST, ESCAPE HTML
        // =====================================================================
        function openModal(id) {
            const m = document.getElementById(id);
            if (m) m.classList.add('show');
        }

        function closeModal(id) {
            const m = document.getElementById(id);
            if (m) m.classList.remove('show');
        }

        // Tutup modal jika klik backdrop
        document.querySelectorAll('.modal-backdrop').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });

        function showAlert(containerId, type, message) {
            const c = document.getElementById(containerId);
            if (!c) return;
            c.className = `alert-box ${type}`;
            c.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
            const msgDiv = document.createElement('div');
            msgDiv.textContent = String(message ?? '');
            c.appendChild(msgDiv);
            c.style.display = 'flex';
        }

        function showToast(msg) {
            const t = document.getElementById('toastNotify');
            const m = document.getElementById('toastNotifyMsg');
            if (t && m) {
                m.textContent = msg;
                t.classList.add('show');
                setTimeout(() => t.classList.remove('show'), 3500);
            }
        }

        function escapeHtml(text) {
            if (!text) return '';
            return String(text)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
