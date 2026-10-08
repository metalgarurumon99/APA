/**
 * ==============================================================================
 * TOPBAR GLOBAL JS - SISTEM AUTOMASI PEKERJAAN ADMINISTRASI (APA)
 * BPS KABUPATEN RAJA AMPAT
 * ==============================================================================
 * Komponen Topbar terpadu yang dapat dipanggil di setiap halaman web.
 * Cara Penggunaan:
 *   1. Panggil stylesheet: <link rel="stylesheet" href="topbar.css">
 *   2. Panggil script ini:  <script src="topbar.js"></script>
 *
 * Fitur:
 *   - Pojok kiri: Logo website, nama "APA", arti "Automasi Pekerjaan Administrasi", & favicon otomatis
 *   - Pojok kanan: Tanggal hari ini real-time, icon notifikasi, foto profil, role badge, dan dropdown logout
 *   - Terintegrasi penuh dengan window.APA_AUTH
 */

(function () {
    const APATopbar = {
        currentUser: null,
        dateTimer: null,

        init: function () {
            this.setFavicon();
            this.loadUserSession();
            this.mountTopbar();
            this.updateCurrentDate();
            this.startDateTimer();
            this.renderUser();
            this.attachEventListeners();
            document.body.classList.add('has-apa-topbar');
        },

        // 1. Ganti Favicon ke Assets/ART logo.svg
        setFavicon: function () {
            try {
                let link = document.querySelector("link[rel*='icon']");
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'shortcut icon';
                    document.head.appendChild(link);
                }
                link.type = 'image/svg+xml';
                link.href = 'Assets/ART logo.svg';
            } catch (err) {
                console.warn('Gagal mengatur favicon:', err);
            }
        },

        // 2. Ambil sesi pengguna saat ini
        loadUserSession: function () {
            if (window.APA_AUTH && typeof window.APA_AUTH.getCurrentUser === 'function') {
                this.currentUser = window.APA_AUTH.getCurrentUser();
            }
            if (!this.currentUser) {
                this.currentUser = {
                    username: 'frida',
                    full_name: 'Frida Irian S. Ompusunggu',
                    role: 'user',
                    foto_url: null
                };
            }
        },

        // 3. Format Tanggal Bahasa Indonesia (contoh: Kamis, 8 Oktober 2026 pukul 15.05)
        formatIndonesianDateTime: function () {
            const now = new Date();
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const months = [
                'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
            ];

            const dayName = days[now.getDay()];
            const date = now.getDate();
            const monthName = months[now.getMonth()];
            const year = now.getFullYear();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');

            return `${dayName}, ${date} ${monthName} ${year} pukul ${hours}.${minutes}`;
        },

        updateCurrentDate: function () {
            const dateEl = document.getElementById('topbarCurrentDate');
            if (dateEl) {
                dateEl.textContent = this.formatIndonesianDateTime();
            }
        },

        startDateTimer: function () {
            if (this.dateTimer) clearInterval(this.dateTimer);
            this.dateTimer = setInterval(() => {
                this.updateCurrentDate();
            }, 30000); // Perbarui setiap 30 detik
        },

        // 4. Mount Elemen Topbar ke DOM
        mountTopbar: function () {
            if (document.getElementById('apaGlobalTopbar')) return;

            const header = document.createElement('header');
            header.className = 'apa-topbar';
            header.id = 'apaGlobalTopbar';

            header.innerHTML = `
                <!-- Pojok Kiri: Logo + Nama Website + Arti Nama Website -->
                <div class="topbar-left">
                    <a href="profile.html" class="topbar-brand">
                        <img src="Assets/ART logo.svg" alt="Logo APA" class="topbar-logo" />
                        <div class="topbar-brand-text">
                            <div class="topbar-brand-title">APA</div>
                            <div class="topbar-brand-meaning">Automasi Pekerjaan Administrasi</div>
                            <div class="topbar-brand-sub">BPS Kabupaten Raja Ampat</div>
                        </div>
                    </a>
                </div>

                <!-- Pojok Kanan: Tanggal, Notifikasi, Foto Profil, Role, Dropdown -->
                <div class="topbar-right">
                    <!-- Tanggal Hari Ini -->
                    <div class="topbar-date" id="topbarCurrentDate">
                        ${this.formatIndonesianDateTime()}
                    </div>

                    <!-- Icon Notifikasi -->
                    <div style="position: relative;">
                        <button class="topbar-notif-btn" id="topbarNotifBtn" title="Notifikasi" aria-label="Notifikasi">
                            <img src="Assets/notification.png" alt="Notifikasi" class="topbar-notif-icon" />
                            <span class="topbar-notif-badge"></span>
                        </button>
                        <div class="apa-topbar-notif-popover" id="topbarNotifPopover">
                            <div class="apa-topbar-notif-header">
                                <span>Pemberitahuan</span>
                                <span style="font-size: 0.72rem; color: #1685f8; font-weight: 600;">Tandai terbaca</span>
                            </div>
                            <div class="apa-topbar-notif-item">
                                <strong>Selamat Datang di Portal APA</strong>
                                <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">Sistem automasi kepegawaian BPS Kab. Raja Ampat aktif.</div>
                            </div>
                            <div class="apa-topbar-notif-item" style="border: none;">
                                <strong>Sinkronisasi Supabase</strong>
                                <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">Koneksi cloud database terhubung dengan aman.</div>
                            </div>
                        </div>
                    </div>

                    <!-- Foto Profil User, Role, & Dropdown Logout -->
                    <div class="topbar-user-wrapper" id="topbarUserWrapper">
                        <button class="topbar-user-btn" id="topbarUserBtn" aria-expanded="false" title="Menu Akun">
                            <div class="topbar-avatar" id="topbarAvatar">
                                <span id="topbarAvatarInitials">US</span>
                            </div>
                            <span class="topbar-user-name" id="topbarUserName">Pengguna</span>
                            <span class="topbar-role-badge user" id="topbarRoleBadge">Pegawai</span>
                            <svg class="topbar-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>

                        <!-- Menu Dropdown -->
                        <div class="topbar-dropdown-menu" id="topbarDropdownMenu">
                            <div class="dropdown-header">
                                <div class="dropdown-header-name" id="dropdownHeaderName">Pengguna</div>
                                <div class="dropdown-header-sub" id="dropdownHeaderRole">Pegawai BPS Raja Ampat</div>
                            </div>
                            <div class="dropdown-divider"></div>

                            <a href="profile.html" class="dropdown-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <span>Profil Pegawai</span>
                            </a>

                            <button class="dropdown-item" id="topbarChangePwdBtn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                                <span>Ganti Password</span>
                            </button>

                            <div class="dropdown-divider"></div>

                            <button class="dropdown-item logout" id="topbarLogoutBtn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                                <span>Logout / Keluar</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.prepend(header);
        },

        // 5. Render Data Pengguna ke Topbar
        renderUser: function (user) {
            if (user) {
                this.currentUser = user;
            }
            if (!this.currentUser) return;

            const nameEl = document.getElementById('topbarUserName');
            const roleEl = document.getElementById('topbarRoleBadge');
            const avatarEl = document.getElementById('topbarAvatar');
            const dropdownNameEl = document.getElementById('dropdownHeaderName');
            const dropdownRoleEl = document.getElementById('dropdownHeaderRole');

            const fullName = this.currentUser.full_name || this.currentUser.username || 'Pengguna';
            const role = (this.currentUser.role || 'user').toLowerCase();
            const isAdmin = role === 'admin';

            if (nameEl) nameEl.textContent = fullName;
            if (dropdownNameEl) dropdownNameEl.textContent = fullName;

            if (roleEl) {
                roleEl.textContent = isAdmin ? 'Admin' : 'Pegawai';
                roleEl.className = 'topbar-role-badge ' + (isAdmin ? 'admin' : 'pegawai');
            }

            if (dropdownRoleEl) {
                dropdownRoleEl.textContent = `${isAdmin ? 'Administrator' : 'Pegawai'} • @${this.currentUser.username || 'user'}`;
            }

            // Atur Foto Profil atau Inisial
            if (avatarEl) {
                if (this.currentUser.foto_url) {
                    avatarEl.innerHTML = `<img src="${this.currentUser.foto_url}" alt="${fullName}" />`;
                } else {
                    const names = fullName.split(' ');
                    const initials = names.map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
                    avatarEl.innerHTML = `<span id="topbarAvatarInitials">${initials || 'US'}</span>`;
                }
            }
        },

        // 6. Event Listeners
        attachEventListeners: function () {
            const userBtn = document.getElementById('topbarUserBtn');
            const menu = document.getElementById('topbarDropdownMenu');
            const notifBtn = document.getElementById('topbarNotifBtn');
            const notifPopover = document.getElementById('topbarNotifPopover');
            const logoutBtn = document.getElementById('topbarLogoutBtn');
            const changePwdBtn = document.getElementById('topbarChangePwdBtn');

            // Toggle Dropdown Menu User
            if (userBtn && menu) {
                userBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = menu.classList.toggle('show');
                    userBtn.classList.toggle('active', isOpen);
                    userBtn.setAttribute('aria-expanded', String(isOpen));
                    if (notifPopover) notifPopover.classList.remove('show');
                });
            }

            // Toggle Notifikasi Popover
            if (notifBtn && notifPopover) {
                notifBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = notifPopover.classList.toggle('show');
                    if (menu) {
                        menu.classList.remove('show');
                        if (userBtn) userBtn.classList.remove('active');
                    }
                });
            }

            // Tutup dropdown jika klik di luar
            document.addEventListener('click', (e) => {
                if (menu && !menu.contains(e.target) && !userBtn?.contains(e.target)) {
                    menu.classList.remove('show');
                    if (userBtn) userBtn.classList.remove('active');
                }
                if (notifPopover && !notifPopover.contains(e.target) && !notifBtn?.contains(e.target)) {
                    notifPopover.classList.remove('show');
                }
            });

            // Tutup jika tekan tombol Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (menu) {
                        menu.classList.remove('show');
                        if (userBtn) userBtn.classList.remove('active');
                    }
                    if (notifPopover) notifPopover.classList.remove('show');
                }
            });

            // Trigger Modal Ganti Password dari Dropdown Topbar
            if (changePwdBtn) {
                changePwdBtn.addEventListener('click', () => {
                    if (menu) menu.classList.remove('show');
                    if (window.APASidebar && typeof window.APASidebar.openChangePasswordModal === 'function') {
                        window.APASidebar.openChangePasswordModal();
                    } else {
                        window.location.href = 'login.html#ganti-password';
                    }
                });
            }

            // Trigger Logout dari Dropdown Topbar
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    this.handleLogout();
                });
            }
        },

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

    window.APATopbar = APATopbar;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => APATopbar.init());
    } else {
        APATopbar.init();
    }
})();
