/**
 * ==============================================================================
 * SIDEBAR GLOBAL JS - SISTEM AUTOMASI PEKERJAAN ADMINISTRASI (APA)
 * BPS KABUPATEN RAJA AMPAT
 * ==============================================================================
 * Komponen sidebar terpadu yang dapat dipanggil di setiap halaman web.
 * Cara Penggunaan:
 *   1. Panggil stylesheet: <link rel="stylesheet" href="sidebar.css">
 *   2. Panggil script ini:  <script src="sidebar.js"></script>
 *
 * Fitur:
 *   - Sembunyikan & Tampilkan Sidebar (Collapse/Hide) dengan tombol & shortcut Ctrl+B
 *   - Auto-mount & Active menu highlighting
 *   - Auto-sinkronisasi data profil pengguna dari window.APA_AUTH
 *   - Responsive mobile drawer dengan backdrop overlay
 *   - Modal interaktif "Ganti Password" langsung dari sidebar
 *   - Fungsi Logout terintegrasi
 */

(function () {
    const APASidebar = {
        currentUser: null,
        activeMenuKey: 'profile', // 'profile' | 'password'
        isHidden: false,

        // Daftar Menu Default
        navItems: [
            {
                key: 'profile',
                label: 'Profil Pegawai',
                url: 'profile.html',
                icon: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>`
            },
            {
                key: 'password',
                label: 'Ganti Password',
                url: '#',
                action: 'openChangePasswordModal',
                icon: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>`
            }
        ],

        // Inisialisasi Utama
        init: function (options = {}) {
            this.detectActivePage();
            this.loadUserSession();
            this.loadHiddenState();
            this.mountComponents();
            this.attachEventListeners();
            this.renderUser();
            document.body.classList.add('has-apa-sidebar');

            // Terapkan preferensi sembunyikan jika tersimpan
            if (this.isHidden && window.innerWidth > 992) {
                document.body.classList.add('sidebar-hidden');
            }
        },

        // Ambil status tersimpan dari localStorage
        loadHiddenState: function () {
            try {
                this.isHidden = localStorage.getItem('apa_sidebar_hidden') === 'true';
            } catch {
                this.isHidden = false;
            }
        },

        // Deteksi halaman saat ini
        detectActivePage: function () {
            const path = window.location.pathname.toLowerCase();
            if (path.includes('users') || path.includes('user-management')) {
                this.activeMenuKey = 'users';
            } else if (path.includes('profile')) {
                this.activeMenuKey = 'profile';
            } else if (path.includes('login')) {
                this.activeMenuKey = 'password';
            }
        },

        // Ambil Daftar Menu (Khusus Admin mendapat menu Manajemen Pengguna)
        getNavItems: function () {
            const items = [
                {
                    key: 'profile',
                    label: 'Profil Pegawai',
                    url: 'profile.html',
                    icon: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>`
                }
            ];

            const isAdmin = this.currentUser && (
                this.currentUser.role === 'admin' || 
                (Array.isArray(this.currentUser.roles) && this.currentUser.roles.includes('admin'))
            );

            if (isAdmin) {
                items.push({
                    key: 'users',
                    label: 'Manajemen Pengguna',
                    url: 'users.html',
                    icon: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>`
                });
            }

            items.push({
                key: 'password',
                label: 'Ganti Password',
                url: '#',
                action: 'openChangePasswordModal',
                icon: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>`
            });

            return items;
        },

        // Ambil sesi user saat ini
        loadUserSession: function () {
            if (window.APA_AUTH && typeof window.APA_AUTH.getCurrentUser === 'function') {
                this.currentUser = window.APA_AUTH.getCurrentUser();
            }
            if (!this.currentUser) {
                try {
                    this.currentUser = JSON.parse(localStorage.getItem('apa_user') || sessionStorage.getItem('apa_user') || 'null');
                } catch {
                    this.currentUser = null;
                }
            }
        },

        // Mount HTML Elemen Sidebar ke DOM
        mountComponents: function () {
            // 1. Cek atau buat Mobile Topbar
            if (!document.getElementById('apaMobileTopbar')) {
                const mobileBar = document.createElement('header');
                mobileBar.className = 'apa-mobile-topbar';
                mobileBar.id = 'apaMobileTopbar';
                mobileBar.innerHTML = `
                    <a href="profile.html" class="apa-mobile-brand">
                        <div class="apa-mobile-brand-mark">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                            </svg>
                        </div>
                        <span>APA Portal</span>
                    </a>
                    <button class="apa-hamburger-btn" id="apaHamburgerBtn" title="Buka Menu" aria-label="Buka Menu">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                `;
                document.body.prepend(mobileBar);
            }

            // 2. Cek atau buat Backdrop Mobile
            if (!document.getElementById('apaSidebarBackdrop')) {
                const backdrop = document.createElement('div');
                backdrop.className = 'apa-sidebar-backdrop';
                backdrop.id = 'apaSidebarBackdrop';
                document.body.appendChild(backdrop);
            }

            // 3. Tombol Mengambang untuk Memunculkan Sidebar saat tersembunyi
            if (!document.getElementById('apaFloatingToggleBtn')) {
                const floatBtn = document.createElement('button');
                floatBtn.className = 'apa-floating-toggle-btn';
                floatBtn.id = 'apaFloatingToggleBtn';
                floatBtn.title = 'Tampilkan Sidebar (Ctrl+B)';
                floatBtn.setAttribute('aria-label', 'Tampilkan Sidebar');
                floatBtn.innerHTML = `
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                        <polyline points="14 9 17 12 14 15"></polyline>
                    </svg>
                `;
                document.body.appendChild(floatBtn);
            }

            // 4. Render / Update Elemen Sidebar
            let sidebarEl = document.getElementById('appSidebar') || document.querySelector('.sidebar') || document.querySelector('.apa-sidebar');

            if (!sidebarEl) {
                sidebarEl = document.createElement('aside');
                sidebarEl.id = 'appSidebar';
                const appShell = document.querySelector('.app-shell');
                if (appShell) {
                    appShell.prepend(sidebarEl);
                } else {
                    document.body.prepend(sidebarEl);
                }
            }

            // Pastikan class CSS terpasang
            sidebarEl.classList.add('apa-sidebar');

            // Render Struktur Konten Sidebar: Tombol Sembunyikan sejajar dengan Menu Pertama
            const navList = this.getNavItems();
            const firstItem = navList[0];
            const otherItems = navList.slice(1);

            sidebarEl.innerHTML = `
                <nav class="side-nav" id="apaSideNav">
                    <div class="sidebar-menu-row-first">
                        <a href="${firstItem.url}" 
                           class="nav-item ${this.activeMenuKey === firstItem.key ? 'active' : ''}" 
                           data-key="${firstItem.key}"
                           ${firstItem.action ? `data-action="${firstItem.action}"` : ''}>
                            ${firstItem.icon}
                            <span>${firstItem.label}</span>
                        </a>
                        <button class="apa-sidebar-hide-btn" id="apaSidebarHideBtn" title="Sembunyikan Sidebar (Ctrl+B)" aria-label="Sembunyikan Sidebar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                    </div>

                    ${otherItems.map(item => `
                        <a href="${item.url}" 
                           class="nav-item ${this.activeMenuKey === item.key ? 'active' : ''}" 
                           data-key="${item.key}"
                           ${item.action ? `data-action="${item.action}"` : ''}>
                            ${item.icon}
                            <span>${item.label}</span>
                        </a>
                    `).join('')}
                </nav>
            `;

            // 5. Modal Global Ganti Password
            this.mountPasswordModal();
        },

        // Render Data Pengguna (Sekarang ditampilkan di Topbar Global & sesuaikan menu admin)
        renderUser: function (user) {
            if (user) {
                const prevAdmin = this.currentUser && (this.currentUser.role === 'admin' || (Array.isArray(this.currentUser.roles) && this.currentUser.roles.includes('admin')));
                const newAdmin = user.role === 'admin' || (Array.isArray(user.roles) && user.roles.includes('admin'));
                this.currentUser = user;
                if (Boolean(prevAdmin) !== Boolean(newAdmin)) {
                    this.mountComponents();
                    this.attachEventListeners();
                }
            }
        },

        // Pasang Modal Ganti Password Global
        mountPasswordModal: function () {
            if (document.getElementById('apaChangePasswordModal')) return;

            const modal = document.createElement('div');
            modal.className = 'apa-modal-backdrop';
            modal.id = 'apaChangePasswordModal';
            modal.innerHTML = `
                <div class="apa-modal-card">
                    <div class="apa-modal-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 36px; height: 36px; border-radius: 10px; background: #edf6ff; display: grid; place-items: center; color: #1685f8;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                            </div>
                            <h3 class="apa-modal-title">Ganti Password Akun</h3>
                        </div>
                        <button class="apa-modal-close-btn" id="apaClosePasswordModal" title="Tutup">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    <form id="apaGlobalPasswordForm" onsubmit="return false;">
                        <div id="apaPasswordAlert" style="display: none; padding: 10px 14px; border-radius: 10px; font-size: 0.85rem; margin-bottom: 16px;"></div>

                        <div style="margin-bottom: 14px;">
                            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #13233f; margin-bottom: 6px;">Password Saat Ini</label>
                            <input type="password" id="apaOldPassword" required placeholder="Masukkan password saat ini"
                                style="width: 100%; padding: 11px 14px; border-radius: 10px; border: 1.5px solid #d6e9fc; font-size: 0.9rem; outline: none; box-sizing: border-box;">
                        </div>

                        <div style="margin-bottom: 14px;">
                            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #13233f; margin-bottom: 6px;">Password Baru</label>
                            <input type="password" id="apaNewPassword" required placeholder="Minimal 6 karakter kombinasi huruf & angka"
                                style="width: 100%; padding: 11px 14px; border-radius: 10px; border: 1.5px solid #d6e9fc; font-size: 0.9rem; outline: none; box-sizing: border-box;">
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #13233f; margin-bottom: 6px;">Konfirmasi Password Baru</label>
                            <input type="password" id="apaConfirmPassword" required placeholder="Ketik ulang password baru"
                                style="width: 100%; padding: 11px 14px; border-radius: 10px; border: 1.5px solid #d6e9fc; font-size: 0.9rem; outline: none; box-sizing: border-box;">
                        </div>

                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" id="apaCancelPasswordBtn" 
                                style="padding: 10px 18px; border-radius: 10px; border: 1px solid #d6e9fc; background: #ffffff; color: #64748b; font-weight: 600; cursor: pointer;">
                                Batal
                            </button>
                            <button type="submit" id="apaSavePasswordBtn"
                                style="padding: 10px 22px; border-radius: 10px; border: none; background: #1685f8; color: #ffffff; font-weight: 700; cursor: pointer;">
                                Simpan Password
                            </button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
        },

        // Pasang Event Listeners
        attachEventListeners: function () {
            // Tombol Sembunyikan Sidebar
            const hideBtn = document.getElementById('apaSidebarHideBtn');
            if (hideBtn) {
                hideBtn.addEventListener('click', () => {
                    this.hide();
                });
            }

            // Tombol Mengambang Tampilkan Kembali
            const floatBtn = document.getElementById('apaFloatingToggleBtn');
            if (floatBtn) {
                floatBtn.addEventListener('click', () => {
                    this.show();
                });
            }

            // Hamburger Mobile Toggle
            const hamburgerBtn = document.getElementById('apaHamburgerBtn');
            const backdrop = document.getElementById('apaSidebarBackdrop');

            if (hamburgerBtn) {
                hamburgerBtn.addEventListener('click', () => {
                    this.toggleMobileMenu();
                });
            }

            if (backdrop) {
                backdrop.addEventListener('click', () => {
                    this.closeMobileMenu();
                });
            }

            // Delegasi Klik Nav Items
            const nav = document.getElementById('apaSideNav');
            if (nav) {
                nav.addEventListener('click', (e) => {
                    const navItem = e.target.closest('.nav-item');
                    if (!navItem) return;

                    const action = navItem.dataset.action;
                    if (action === 'openChangePasswordModal') {
                        e.preventDefault();
                        this.openChangePasswordModal();
                        this.closeMobileMenu();
                    }
                });
            }

            // Logout Button
            const logoutBtn = document.getElementById('apaLogoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    this.handleLogout();
                });
            }

            // Modal Password Close Handlers
            const modal = document.getElementById('apaChangePasswordModal');
            const closeBtn = document.getElementById('apaClosePasswordModal');
            const cancelBtn = document.getElementById('apaCancelPasswordBtn');
            const form = document.getElementById('apaGlobalPasswordForm');

            if (closeBtn) closeBtn.addEventListener('click', () => this.closeChangePasswordModal());
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeChangePasswordModal());
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) this.closeChangePasswordModal();
                });
            }

            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.submitPasswordChange();
                });
            }

            // Shortcut Keyboard: Ctrl+B atau Cmd+B untuk toggle sidebar
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                    e.preventDefault();
                    this.toggleHide();
                }
            });
        },

        // Fungsi Sembunyikan Sidebar
        hide: function () {
            if (window.innerWidth <= 992) {
                this.closeMobileMenu();
            } else {
                document.body.classList.add('sidebar-hidden');
                this.isHidden = true;
                try {
                    localStorage.setItem('apa_sidebar_hidden', 'true');
                } catch {}
            }
        },

        // Fungsi Tampilkan Sidebar
        show: function () {
            if (window.innerWidth <= 992) {
                this.openMobileMenu();
            } else {
                document.body.classList.remove('sidebar-hidden');
                this.isHidden = false;
                try {
                    localStorage.setItem('apa_sidebar_hidden', 'false');
                } catch {}
            }
        },

        // Toggle Sembunyi / Tampil
        toggleHide: function () {
            if (window.innerWidth <= 992) {
                this.toggleMobileMenu();
            } else {
                if (document.body.classList.contains('sidebar-hidden')) {
                    this.show();
                } else {
                    this.hide();
                }
            }
        },

        // Toggle Drawer Mobile
        toggleMobileMenu: function () {
            const sidebar = document.getElementById('appSidebar');
            const backdrop = document.getElementById('apaSidebarBackdrop');
            if (sidebar && backdrop) {
                const isOpen = sidebar.classList.toggle('open');
                if (isOpen) {
                    backdrop.classList.add('show');
                } else {
                    backdrop.classList.remove('show');
                }
            }
        },

        openMobileMenu: function () {
            const sidebar = document.getElementById('appSidebar');
            const backdrop = document.getElementById('apaSidebarBackdrop');
            if (sidebar) sidebar.classList.add('open');
            if (backdrop) backdrop.classList.add('show');
        },

        closeMobileMenu: function () {
            const sidebar = document.getElementById('appSidebar');
            const backdrop = document.getElementById('apaSidebarBackdrop');
            if (sidebar) sidebar.classList.remove('open');
            if (backdrop) backdrop.classList.remove('show');
        },

        // Buka Modal Ganti Password
        openChangePasswordModal: function () {
            const modal = document.getElementById('apaChangePasswordModal');
            const alertBox = document.getElementById('apaPasswordAlert');
            const form = document.getElementById('apaGlobalPasswordForm');
            if (form) form.reset();
            if (alertBox) alertBox.style.display = 'none';
            if (modal) modal.classList.add('show');
        },

        closeChangePasswordModal: function () {
            const modal = document.getElementById('apaChangePasswordModal');
            if (modal) modal.classList.remove('show');
        },

        // Submit Ganti Password ke Supabase
        submitPasswordChange: async function () {
            const oldPwd = document.getElementById('apaOldPassword').value;
            const newPwd = document.getElementById('apaNewPassword').value;
            const confirmPwd = document.getElementById('apaConfirmPassword').value;
            const alertBox = document.getElementById('apaPasswordAlert');
            const saveBtn = document.getElementById('apaSavePasswordBtn');

            // Validasi lokal
            if (newPwd !== confirmPwd) {
                this.showPasswordAlert('Konfirmasi password tidak cocok dengan password baru.', 'error');
                return;
            }

            if (newPwd.length < 6 || !/[A-Za-z]/.test(newPwd) || !/[0-9]/.test(newPwd)) {
                this.showPasswordAlert('Password baru minimal 6 karakter dan wajib kombinasi huruf serta angka.', 'error');
                return;
            }

            const username = this.currentUser ? this.currentUser.username : '';
            if (!username) {
                this.showPasswordAlert('Sesi akun tidak terdeteksi. Silakan login kembali.', 'error');
                return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent = 'Menyimpan...';

            try {
                const sb = (window.APA_AUTH && window.APA_AUTH.getClient()) || window.supabaseClient;
                if (sb) {
                    const { data, error } = await sb.rpc('change_user_password', {
                        p_username: username,
                        p_old_password: oldPwd,
                        p_new_password: newPwd
                    });

                    if (error) {
                        this.showPasswordAlert('Gagal update database: ' + error.message, 'error');
                        saveBtn.disabled = false;
                        saveBtn.textContent = 'Simpan Password';
                        return;
                    }

                    if (data && !data.success) {
                        this.showPasswordAlert(data.message || 'Gagal mengubah password', 'error');
                        saveBtn.disabled = false;
                        saveBtn.textContent = 'Simpan Password';
                        return;
                    }
                }

                // Berhasil
                this.showPasswordAlert('✅ Password berhasil diperbarui!', 'success');
                setTimeout(() => {
                    this.closeChangePasswordModal();
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Simpan Password';
                }, 1200);

            } catch (err) {
                this.showPasswordAlert('Terjadi kesalahan jaringan: ' + err.message, 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Simpan Password';
            }
        },

        showPasswordAlert: function (msg, type) {
            const alertBox = document.getElementById('apaPasswordAlert');
            if (!alertBox) return;
            alertBox.style.display = 'block';
            alertBox.textContent = msg;
            if (type === 'success') {
                alertBox.style.background = '#dcfced';
                alertBox.style.color = '#07895f';
                alertBox.style.border = '1px solid #a7f3d0';
            } else {
                alertBox.style.background = '#fee2e2';
                alertBox.style.color = '#ef4444';
                alertBox.style.border = '1px solid #fecaca';
            }
        },

        // Handler Logout Global
        handleLogout: function () {
            if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
                if (window.APA_AUTH && typeof window.APA_AUTH.logout === 'function') {
                    window.APA_AUTH.logout('login.html');
                } else {
                    localStorage.removeItem('apa_user');
                    sessionStorage.removeItem('apa_user');
                    window.location.href = 'login.html';
                }
            }
        }
    };

    // Ekspos ke global window
    window.APASidebar = APASidebar;

    // Auto-init saat DOM Content Loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => APASidebar.init());
    } else {
        APASidebar.init();
    }
})();
