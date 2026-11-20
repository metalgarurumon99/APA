// profile.js — Diekstrak dari profile.html (cacheable)
// =====================================================================
        // STATE PROFIL AKTIF (Dimuat langsung dari Supabase — tanpa hardcode PII)
        // =====================================================================
        let currentViewingUsername = "";
        let currentViewingNip = "";
        let loggedInUser = null;
        let currentProfileData = null;
        let currentJabatans = [];
        let currentPangkats = [];
        let currentAks = [];
        let currentGelars = [];

        function escapeHtml(text) {
            if (text === null || text === undefined) return '';
            return String(text)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        // =====================================================================
        // INISIALISASI & LOAD DATA
        // =====================================================================
        window.addEventListener('DOMContentLoaded', async () => {
            initAuthSession();
            if (currentViewingUsername) {
                await loadProfileData(currentViewingUsername);
            }
        });

        function initAuthSession() {
            // Ambil data user dari sesi auth
            loggedInUser = window.APA_AUTH ? window.APA_AUTH.getCurrentUser() : null;

            if (!loggedInUser) {
                try {
                    loggedInUser = JSON.parse(localStorage.getItem('apa_user') || sessionStorage.getItem('apa_user') || 'null');
                } catch {
                    loggedInUser = null;
                }
            }

            if (!loggedInUser) {
                // Alihkan ke login jika belum ada sesi aktif
                window.location.href = 'login.html';
                return;
            }

            // Atur username yang sedang ditampilkan
            currentViewingUsername = loggedInUser.username;

            // Segera render nama & inisial user aktif ke Hero secara instan (0 milidetik tanpa jeda/flicker)
            const words = (loggedInUser.full_name || loggedInUser.username).trim().split(/\s+/);
            const initial = words.map(w => w[0]).slice(0, 2).join('').toUpperCase() || '--';
            const heroNamaEl = document.getElementById('heroNamaLengkap');
            const heroInitialEl = document.getElementById('heroAvatarInitial');
            const heroRoleEl = document.getElementById('heroRolePill');
            if (heroNamaEl) heroNamaEl.textContent = loggedInUser.full_name || loggedInUser.username;
            if (heroInitialEl) heroInitialEl.textContent = initial;
            if (heroRoleEl) {
                heroRoleEl.textContent = loggedInUser.role === 'admin' ? 'Admin' : 'Pegawai';
                heroRoleEl.className = 'user-role-badge ' + (loggedInUser.role === 'admin' ? 'admin' : 'user');
            }

            // Render Info Topbar & Sidebar Global
            if (window.APATopbar) {
                window.APATopbar.renderUser(loggedInUser);
            }
            if (window.APASidebar) {
                window.APASidebar.renderUser(loggedInUser);
            }

            // Jika Admin, tampilkan pemilih pegawai dan tombol manajemen pengguna
            const isAdmin = loggedInUser.role === 'admin' || (Array.isArray(loggedInUser.roles) && loggedInUser.roles.includes('admin'));
            if (isAdmin) {
                const adminSelector = document.getElementById('adminPegawaiSelector');
                if (adminSelector) {
                    adminSelector.style.display = 'flex';
                    populateEmployeeDropdown();
                }
                const btnManage = document.getElementById('btnAdminManageUsersLink');
                if (btnManage) {
                    btnManage.style.display = 'inline-flex';
                }
            }
        }

        async function populateEmployeeDropdown() {
            const selectEl = document.getElementById('selectEmployeeList');
            if (!selectEl) return;
            selectEl.innerHTML = '';
            const sb = window.supabaseClient;
            if (!sb) return;
            try {
                const { data, error } = await sb.rpc('admin_get_all_users');
                if (!error && Array.isArray(data)) {
                    data.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.username;
                        opt.textContent = `${p.full_name || p.username} (${p.pegawai_nip || '-'})`;
                        if (p.username === currentViewingUsername) {
                            opt.selected = true;
                        }
                        selectEl.appendChild(opt);
                    });
                }
            } catch (err) {
                console.warn('Gagal memuat daftar pegawai untuk dropdown admin:', err);
            }
        }

        async function handleSelectPegawaiChange(event) {
            currentViewingUsername = event.target.value;
            await loadProfileData(currentViewingUsername);
            showToast(`Beralih ke profil: ${currentViewingUsername}`);
        }

        // =====================================================================
        // LOAD DATA PROFIL LENGKAP
        // Menggunakan alur: username -> cari NIP di data_pegawai -> cari riwayat
        // =====================================================================
        async function loadProfileData(username) {
            let pData = null;
            let jabatans = [];
            let pangkats = [];
            let aks = [];
            let gelars = [];

            // Coba ambil dari Supabase jika tersedia
            const sb = window.supabaseClient;
            let fetchedFromSupabase = false;

            if (sb) {
                try {
                    const { data, error } = await sb.rpc('get_pegawai_profile', {
                        p_username: username
                    });

                    if (!error && data && data.success) {
                        pData = data.data_pegawai;
                        if (pData && data.user) {
                            pData.full_name = data.user.full_name;
                            pData.role = data.user.role;
                        }
                        jabatans = data.riwayat_jabatan || [];
                        pangkats = data.riwayat_pangkat_golongan || [];
                        aks = data.riwayat_angka_kredit || [];
                        gelars = data.riwayat_gelar || [];
                        fetchedFromSupabase = true;
                    }
                } catch (err) {
                    console.warn("Gagal memuat profil dari Supabase RPC, beralih ke local store:", err);
                }
            }

            if (!fetchedFromSupabase || !pData) {
                showToast('Gagal memuat profil pegawai dari database. Periksa koneksi.');
                return;
            }

            currentProfileData = pData;
            currentViewingNip = pData.pegawai_nip || '';
            currentJabatans = jabatans;
            currentPangkats = pangkats;
            currentAks = aks;
            currentGelars = gelars;

            // Render ke UI
            renderProfileToUI(pData, jabatans, pangkats, aks, gelars);
        }

        function parseTmtScore(str) {
            if (!str) return 0;
            const s = String(str).trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return Date.parse(s.slice(0, 10)) || 0;
            const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
            if (m) {
                const a = +m[1], b = +m[2], y = +m[3];
                const mo = a > 12 ? b : a, d = a > 12 ? a : b;
                return new Date(y, mo - 1, d).getTime() || 0;
            }
            return Date.parse(s) || 0;
        }

        function renderProfileToUI(pegawai, jabatans, pangkats, aks, gelars) {
            const sortedGelars = [...gelars].sort((a, b) => parseTmtScore(b.tmt) - parseTmtScore(a.tmt));
            const sortedPangkats = [...pangkats].sort((a, b) => parseTmtScore(b.tmt) - parseTmtScore(a.tmt));
            const sortedJabatans = [...jabatans].sort((a, b) => parseTmtScore(b.tmt) - parseTmtScore(a.tmt));
            const sortedAks = [...aks].sort((a, b) => (Number(b.periode_tahun) || 0) - (Number(a.periode_tahun) || 0) || parseTmtScore(b.tmt) - parseTmtScore(a.tmt));

            // 1. Format Nama Bergelar
            let gelarDepan = '';
            let gelarBelakang = '';
            if (sortedGelars.length > 0) {
                const gTerbaru = sortedGelars[0];
                gelarDepan = gTerbaru.gelar_depan ? gTerbaru.gelar_depan + ' ' : '';
                gelarBelakang = gTerbaru.gelar_belakang ? ', ' + gTerbaru.gelar_belakang : '';
            }
            const rawFullName = pegawai.full_name || pegawai.username || 'Pengguna';
            const namaLengkapBergelar = `${gelarDepan}${rawFullName}${gelarBelakang}`;

            // Hero Meta
            document.getElementById('heroNamaLengkap').textContent = namaLengkapBergelar;
            document.getElementById('heroNip').textContent = pegawai.pegawai_nip || '-';
            document.getElementById('heroNipLama').textContent = pegawai.nip_lama || '-';
            
            const initials = rawFullName.split(/\s+/).filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'US';
            document.getElementById('heroAvatarInitial').textContent = initials;

            const statusPill = document.getElementById('heroStatusPill');
            statusPill.textContent = (pegawai.status_kepegawaian || 'aktif').toUpperCase();
            statusPill.className = 'status-pill ' + (pegawai.status_kepegawaian === 'pensiun' ? 'pensiun' : 'aktif');

            const rolePill = document.getElementById('heroRolePill');
            rolePill.textContent = pegawai.role === 'admin' ? 'Administrator' : 'Pegawai';
            rolePill.className = 'user-role-badge ' + (pegawai.role === 'admin' ? 'admin' : 'user');

            // 2. Stat Metrik Ringkasan
            const jabUtama = sortedJabatans.find(j => j.jenis === 'utama') || sortedJabatans[0];
            document.getElementById('statJabatan').textContent = jabUtama ? jabUtama.jabatan : '-';
            document.getElementById('statJabatanTmt').textContent = jabUtama && jabUtama.tmt ? `TMT: ${jabUtama.tmt}` : 'TMT: -';

            const pktTerbaru = sortedPangkats[0];
            document.getElementById('statPangkat').textContent = pktTerbaru ? `${pktTerbaru.pangkat}` : '-';
            document.getElementById('statPangkatTmt').textContent = pktTerbaru ? `Gol. ${pktTerbaru.golongan} (TMT: ${pktTerbaru.tmt || '-'})` : 'Gol: -';

            const akTerbaru = sortedAks[0];
            const akNum = akTerbaru ? parseFloat(akTerbaru.angka_kredit) : NaN;
            document.getElementById('statAngkaKredit').textContent = Number.isFinite(akNum) ? akNum.toFixed(3) : '0.000';
            document.getElementById('statAngkaKreditPeriode').textContent = akTerbaru && akTerbaru.periode_label ? akTerbaru.periode_label : 'Periode Terakhir';

            document.getElementById('statUnitKerja').textContent = pegawai.unit_kerja || 'BPS Kabupaten Raja Ampat';
            document.getElementById('statPendidikan').textContent = pegawai.pendidikan_terakhir || 'S1 / DIV';

            // 3. Panel Biodata
            document.getElementById('bioNip').textContent = pegawai.pegawai_nip;
            document.getElementById('bioNipLama').textContent = pegawai.nip_lama || '-';
            document.getElementById('bioKarpeg').textContent = pegawai.karpeg || '-';
            document.getElementById('bioTtl').textContent = pegawai.ttl || '-';
            document.getElementById('bioJk').textContent = pegawai.jk || '-';
            document.getElementById('bioPendidikan').textContent = pegawai.pendidikan_terakhir || '-';
            document.getElementById('bioUnitKerja').textContent = pegawai.unit_kerja || 'BPS Kabupaten Raja Ampat';
            document.getElementById('bioStatus').textContent = (pegawai.status_kepegawaian || 'aktif').toUpperCase();
            document.getElementById('bioPensiun').textContent = pegawai.tanggal_pensiun || '-';
            document.getElementById('bioUsername').textContent = pegawai.username;

            // 4. Render Tabel Riwayat Jabatan
            renderTbodyJabatan(jabatans);

            // 5. Render Tabel Riwayat Pangkat
            renderTbodyPangkat(pangkats);

            // 6. Render Tabel Riwayat Angka Kredit
            renderTbodyAngkaKredit(aks);

            // 7. Render Tabel Riwayat Gelar
            renderTbodyGelar(gelars, pegawai.full_name);
        }

        // Cek Hak Akses Role
        function canDelete() {
            return loggedInUser && loggedInUser.role === 'admin';
        }

        // Render Riwayat Jabatan
        function renderTbodyJabatan(items) {
            const tbody = document.getElementById('tbodyJabatan');
            tbody.innerHTML = '';
            if (items.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Belum ada data riwayat jabatan.</td></tr>';
                return;
            }

            items.forEach(item => {
                const tr = document.createElement('tr');
                const safeId = Number(item.id) || 0;
                tr.innerHTML = `
                    <td><strong>${escapeHtml(item.jabatan)}</strong></td>
                    <td><span class="table-badge ${item.jenis === 'utama' ? 'utama' : 'lainnya'}">${escapeHtml((item.jenis || 'utama').toUpperCase())}</span></td>
                    <td>${escapeHtml(item.tmt || '-')}</td>
                    <td>${escapeHtml(item.tmt_selesai || 'Sekarang')}</td>
                    <td>${escapeHtml(item.tmt_ikut_pak || '-')}</td>
                    <td style="text-align: right;">
                        <div class="action-cell" style="justify-content: flex-end;">
                            <button class="btn-edit-sm" onclick="openModalEditJabatan(${safeId})">Edit</button>
                            ${canDelete() ? `<button class="btn-del-sm" onclick="handleDeleteJabatan(${safeId})">Hapus</button>` : ''}
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Render Riwayat Pangkat
        function renderTbodyPangkat(items) {
            const tbody = document.getElementById('tbodyPangkat');
            tbody.innerHTML = '';
            if (items.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada data riwayat kepangkatan.</td></tr>';
                return;
            }

            items.forEach(item => {
                const tr = document.createElement('tr');
                const safeId = Number(item.id) || 0;
                tr.innerHTML = `
                    <td><strong>${escapeHtml(item.pangkat)}</strong></td>
                    <td><span class="table-badge utama">Gol. ${escapeHtml(item.golongan)}</span></td>
                    <td>${escapeHtml(item.tmt || '-')}</td>
                    <td>${escapeHtml(item.tmt_ikut_pak || '-')}</td>
                    <td style="text-align: right;">
                        <div class="action-cell" style="justify-content: flex-end;">
                            <button class="btn-edit-sm" onclick="openModalEditPangkat(${safeId})">Edit</button>
                            ${canDelete() ? `<button class="btn-del-sm" onclick="handleDeletePangkat(${safeId})">Hapus</button>` : ''}
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Render Riwayat Angka Kredit
        function renderTbodyAngkaKredit(items) {
            const tbody = document.getElementById('tbodyAngkaKredit');
            tbody.innerHTML = '';
            if (items.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada penetapan angka kredit.</td></tr>';
                return;
            }

            items.forEach(item => {
                const tr = document.createElement('tr');
                const safeId = Number(item.id) || 0;
                const akVal = Number.isFinite(parseFloat(item.angka_kredit)) ? parseFloat(item.angka_kredit).toFixed(3) : '0.000';
                tr.innerHTML = `
                    <td><strong>${escapeHtml(item.periode_label || '-')}</strong></td>
                    <td>${escapeHtml(item.periode_tahun || '-')}</td>
                    <td>${escapeHtml(item.tmt || '-')}</td>
                    <td><span class="table-badge ak">${escapeHtml(akVal)}</span></td>
                    <td style="text-align: right;">
                        <div class="action-cell" style="justify-content: flex-end;">
                            <button class="btn-edit-sm" onclick="openModalEditAngkaKredit(${safeId})">Edit</button>
                            ${canDelete() ? `<button class="btn-del-sm" onclick="handleDeleteAngkaKredit(${safeId})">Hapus</button>` : ''}
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Render Riwayat Gelar
        function renderTbodyGelar(items, rawName) {
            const tbody = document.getElementById('tbodyGelar');
            tbody.innerHTML = '';
            if (items.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada data riwayat gelar pendidikan.</td></tr>';
                return;
            }

            items.forEach(item => {
                const gDepan = item.gelar_depan ? item.gelar_depan + ' ' : '';
                const gBelakang = item.gelar_belakang ? ', ' + item.gelar_belakang : '';
                const formatNama = `${gDepan}${rawName || ''}${gBelakang}`;
                const safeId = Number(item.id) || 0;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHtml(item.gelar_depan || '-')}</td>
                    <td><strong>${escapeHtml(item.gelar_belakang || '-')}</strong></td>
                    <td>${escapeHtml(item.tmt || '-')}</td>
                    <td><span style="color:var(--blue); font-weight:700;">${escapeHtml(formatNama)}</span></td>
                    <td style="text-align: right;">
                        <div class="action-cell" style="justify-content: flex-end;">
                            <button class="btn-edit-sm" onclick="openModalEditGelar(${safeId})">Edit</button>
                            ${canDelete() ? `<button class="btn-del-sm" onclick="handleDeleteGelar(${safeId})">Hapus</button>` : ''}
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // =====================================================================
        // TAB SWITCHER
        // =====================================================================
        function switchTab(tabKey, btnEl) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btnEl.classList.add('active');

            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

            const panelMap = {
                'biodata': 'panelBiodata',
                'jabatan': 'panelJabatan',
                'pangkat': 'panelPangkat',
                'angkaKredit': 'panelAngkaKredit',
                'gelar': 'panelGelar'
            };

            const targetId = panelMap[tabKey];
            if (targetId) {
                document.getElementById(targetId).classList.add('active');
            }
        }

        // =====================================================================
        // MODAL MANAGEMENT & FORM HANDLERS
        // =====================================================================
        function openModal(id) {
            document.getElementById(id).classList.add('show');
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('show');
        }

        function showToast(msg) {
            const toast = document.getElementById('toastNotification');
            document.getElementById('toastMessage').textContent = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }

        // 1. BIODATA
        function openModalEditBiodata() {
            const p = currentProfileData;
            if (!p) return;

            document.getElementById('editFullName').value = p.full_name || '';
            document.getElementById('editNip').value = p.pegawai_nip || '';
            document.getElementById('editNipLama').value = p.nip_lama || '';
            document.getElementById('editKarpeg').value = p.karpeg || '';
            document.getElementById('editTtl').value = p.ttl || '';
            document.getElementById('editJk').value = p.jk || 'Laki-laki';
            document.getElementById('editPendidikan').value = p.pendidikan_terakhir || '';
            document.getElementById('editUnitKerja').value = p.unit_kerja || 'BPS Kabupaten Raja Ampat';
            document.getElementById('editStatus').value = p.status_kepegawaian || 'aktif';

            openModal('modalEditBiodata');
        }

        async function handleSaveBiodata(e) {
            e.preventDefault();
            const p = currentProfileData;
            const sb = window.supabaseClient;
            if (!p || !sb) {
                showToast('Gagal menyimpan: koneksi database tidak tersedia.');
                return;
            }

            const payloadPegawai = {
                karpeg: document.getElementById('editKarpeg').value,
                ttl: document.getElementById('editTtl').value,
                jk: document.getElementById('editJk').value,
                unit_kerja: document.getElementById('editUnitKerja').value,
                pendidikan_terakhir: document.getElementById('editPendidikan').value,
                status_kepegawaian: document.getElementById('editStatus').value,
                nip_lama: document.getElementById('editNipLama').value
            };
            const newFullName = document.getElementById('editFullName').value;

            const { error: errPeg } = await sb.from('data_pegawai').update(payloadPegawai).eq('pegawai_nip', p.pegawai_nip);
            if (errPeg) {
                showToast('Gagal memperbarui biodata: ' + errPeg.message);
                return;
            }

            const { error: errUsr } = await sb.from('users').update({ full_name: newFullName }).eq('username', p.username);
            if (errUsr) {
                console.warn('Update full_name gagal:', errUsr.message);
            }

            closeModal('modalEditBiodata');
            await loadProfileData(currentViewingUsername);
            showToast('Biodata pegawai berhasil diperbarui');
        }

        // 2. RIWAYAT JABATAN
        function openModalTambahJabatan() {
            document.getElementById('modalJabatanTitle').textContent = 'Tambah Riwayat Jabatan';
            document.getElementById('formJabatanId').value = '';
            document.getElementById('formJabatanNama').value = '';
            document.getElementById('formJabatanJenis').value = 'utama';
            document.getElementById('formJabatanTmt').value = '';
            document.getElementById('formJabatanSelesai').value = '';
            document.getElementById('formJabatanIkutPak').value = '';
            openModal('modalJabatan');
        }

        function openModalEditJabatan(id) {
            const item = currentJabatans.find(j => Number(j.id) === Number(id));
            if (!item) return;

            document.getElementById('modalJabatanTitle').textContent = 'Edit Riwayat Jabatan';
            document.getElementById('formJabatanId').value = item.id;
            document.getElementById('formJabatanNama').value = item.jabatan;
            document.getElementById('formJabatanJenis').value = item.jenis || 'utama';
            document.getElementById('formJabatanTmt').value = item.tmt || '';
            document.getElementById('formJabatanSelesai').value = item.tmt_selesai || '';
            document.getElementById('formJabatanIkutPak').value = item.tmt_ikut_pak || '';
            openModal('modalJabatan');
        }

        async function handleSaveJabatan(e) {
            e.preventDefault();
            const sb = window.supabaseClient;
            if (!sb || !currentViewingNip) {
                showToast('Koneksi database tidak tersedia.');
                return;
            }
            const idVal = document.getElementById('formJabatanId').value;
            const payload = {
                pegawai_nip: currentViewingNip,
                jabatan: document.getElementById('formJabatanNama').value,
                jenis: document.getElementById('formJabatanJenis').value,
                tmt: document.getElementById('formJabatanTmt').value || null,
                tmt_selesai: document.getElementById('formJabatanSelesai').value || null,
                tmt_ikut_pak: document.getElementById('formJabatanIkutPak').value || null
            };

            const { error } = idVal
                ? await sb.from('riwayat_jabatan').update(payload).eq('id', parseInt(idVal, 10))
                : await sb.from('riwayat_jabatan').insert(payload);

            if (error) {
                showToast('Gagal menyimpan riwayat jabatan: ' + error.message);
                return;
            }

            closeModal('modalJabatan');
            await loadProfileData(currentViewingUsername);
            showToast('Riwayat jabatan berhasil disimpan');
        }

        async function handleDeleteJabatan(id) {
            if (!canDelete()) {
                alert('Hanya admin yang memiliki izin menghapus data.');
                return;
            }
            if (confirm('Yakin ingin menghapus riwayat jabatan ini?')) {
                const sb = window.supabaseClient;
                if (!sb) return;
                const { error } = await sb.from('riwayat_jabatan').delete().eq('id', id);
                if (error) {
                    showToast('Gagal menghapus riwayat jabatan: ' + error.message);
                    return;
                }
                await loadProfileData(currentViewingUsername);
                showToast('Riwayat jabatan berhasil dihapus');
            }
        }

        // 3. RIWAYAT PANGKAT
        function openModalTambahPangkat() {
            document.getElementById('modalPangkatTitle').textContent = 'Tambah Riwayat Pangkat';
            document.getElementById('formPangkatId').value = '';
            document.getElementById('formPangkatNama').value = '';
            document.getElementById('formPangkatGol').value = '';
            document.getElementById('formPangkatTmt').value = '';
            document.getElementById('formPangkatIkutPak').value = '';
            openModal('modalPangkat');
        }

        function openModalEditPangkat(id) {
            const item = currentPangkats.find(p => Number(p.id) === Number(id));
            if (!item) return;

            document.getElementById('modalPangkatTitle').textContent = 'Edit Riwayat Pangkat';
            document.getElementById('formPangkatId').value = item.id;
            document.getElementById('formPangkatNama').value = item.pangkat;
            document.getElementById('formPangkatGol').value = item.golongan;
            document.getElementById('formPangkatTmt').value = item.tmt || '';
            document.getElementById('formPangkatIkutPak').value = item.tmt_ikut_pak || '';
            openModal('modalPangkat');
        }

        async function handleSavePangkat(e) {
            e.preventDefault();
            const sb = window.supabaseClient;
            if (!sb || !currentViewingNip) {
                showToast('Koneksi database tidak tersedia.');
                return;
            }
            const idVal = document.getElementById('formPangkatId').value;
            const payload = {
                pegawai_nip: currentViewingNip,
                pangkat: document.getElementById('formPangkatNama').value,
                golongan: document.getElementById('formPangkatGol').value,
                tmt: document.getElementById('formPangkatTmt').value || null,
                tmt_ikut_pak: document.getElementById('formPangkatIkutPak').value || null
            };

            const { error } = idVal
                ? await sb.from('riwayat_pangkat_golongan').update(payload).eq('id', parseInt(idVal, 10))
                : await sb.from('riwayat_pangkat_golongan').insert(payload);

            if (error) {
                showToast('Gagal menyimpan riwayat pangkat: ' + error.message);
                return;
            }

            closeModal('modalPangkat');
            await loadProfileData(currentViewingUsername);
            showToast('Riwayat pangkat berhasil disimpan');
        }

        async function handleDeletePangkat(id) {
            if (!canDelete()) {
                alert('Hanya admin yang memiliki izin menghapus data.');
                return;
            }
            if (confirm('Yakin ingin menghapus riwayat kepangkatan ini?')) {
                const sb = window.supabaseClient;
                if (!sb) return;
                const { error } = await sb.from('riwayat_pangkat_golongan').delete().eq('id', id);
                if (error) {
                    showToast('Gagal menghapus riwayat pangkat: ' + error.message);
                    return;
                }
                await loadProfileData(currentViewingUsername);
                showToast('Riwayat pangkat berhasil dihapus');
            }
        }

        // 4. RIWAYAT ANGKA KREDIT
        function openModalTambahAngkaKredit() {
            document.getElementById('modalAkTitle').textContent = 'Tambah Penetapan Angka Kredit';
            document.getElementById('formAkId').value = '';
            document.getElementById('formAkNilai').value = '';
            document.getElementById('formAkPeriodeLabel').value = '';
            document.getElementById('formAkTahun').value = new Date().getFullYear();
            document.getElementById('formAkTmt').value = '';
            openModal('modalAngkaKredit');
        }

        function openModalEditAngkaKredit(id) {
            const item = currentAks.find(a => Number(a.id) === Number(id));
            if (!item) return;

            document.getElementById('modalAkTitle').textContent = 'Edit Penetapan Angka Kredit';
            document.getElementById('formAkId').value = item.id;
            document.getElementById('formAkNilai').value = item.angka_kredit;
            document.getElementById('formAkPeriodeLabel').value = item.periode_label || '';
            document.getElementById('formAkTahun').value = item.periode_tahun || '';
            document.getElementById('formAkTmt').value = item.tmt || '';
            openModal('modalAngkaKredit');
        }

        async function handleSaveAngkaKredit(e) {
            e.preventDefault();
            const sb = window.supabaseClient;
            if (!sb || !currentViewingNip) {
                showToast('Koneksi database tidak tersedia.');
                return;
            }
            const idVal = document.getElementById('formAkId').value;
            const payload = {
                pegawai_nip: currentViewingNip,
                angka_kredit: parseFloat(document.getElementById('formAkNilai').value) || 0,
                periode_label: document.getElementById('formAkPeriodeLabel').value || null,
                periode_tahun: parseInt(document.getElementById('formAkTahun').value, 10) || new Date().getFullYear(),
                tmt: document.getElementById('formAkTmt').value || null
            };

            const { error } = idVal
                ? await sb.from('riwayat_angka_kredit').update(payload).eq('id', parseInt(idVal, 10))
                : await sb.from('riwayat_angka_kredit').insert(payload);

            if (error) {
                showToast('Gagal menyimpan angka kredit: ' + error.message);
                return;
            }

            closeModal('modalAngkaKredit');
            await loadProfileData(currentViewingUsername);
            showToast('Angka kredit berhasil disimpan');
        }

        async function handleDeleteAngkaKredit(id) {
            if (!canDelete()) {
                alert('Hanya admin yang memiliki izin menghapus data.');
                return;
            }
            if (confirm('Yakin ingin menghapus data angka kredit ini?')) {
                const sb = window.supabaseClient;
                if (!sb) return;
                const { error } = await sb.from('riwayat_angka_kredit').delete().eq('id', id);
                if (error) {
                    showToast('Gagal menghapus angka kredit: ' + error.message);
                    return;
                }
                await loadProfileData(currentViewingUsername);
                showToast('Angka kredit berhasil dihapus');
            }
        }

        // 5. RIWAYAT GELAR
        function openModalTambahGelar() {
            document.getElementById('modalGelarTitle').textContent = 'Tambah Riwayat Gelar';
            document.getElementById('formGelarId').value = '';
            document.getElementById('formGelarDepan').value = '';
            document.getElementById('formGelarBelakang').value = '';
            document.getElementById('formGelarTmt').value = '';
            openModal('modalGelar');
        }

        function openModalEditGelar(id) {
            const item = currentGelars.find(g => Number(g.id) === Number(id));
            if (!item) return;

            document.getElementById('modalGelarTitle').textContent = 'Edit Riwayat Gelar';
            document.getElementById('formGelarId').value = item.id;
            document.getElementById('formGelarDepan').value = item.gelar_depan || '';
            document.getElementById('formGelarBelakang').value = item.gelar_belakang || '';
            document.getElementById('formGelarTmt').value = item.tmt || '';
            openModal('modalGelar');
        }

        async function handleSaveGelar(e) {
            e.preventDefault();
            const sb = window.supabaseClient;
            if (!sb || !currentViewingNip) {
                showToast('Koneksi database tidak tersedia.');
                return;
            }
            const idVal = document.getElementById('formGelarId').value;
            const payload = {
                pegawai_nip: currentViewingNip,
                gelar_depan: document.getElementById('formGelarDepan').value || null,
                gelar_belakang: document.getElementById('formGelarBelakang').value || null,
                tmt: document.getElementById('formGelarTmt').value || null
            };

            const { error } = idVal
                ? await sb.from('riwayat_gelar').update(payload).eq('id', parseInt(idVal, 10))
                : await sb.from('riwayat_gelar').insert(payload);

            if (error) {
                showToast('Gagal menyimpan riwayat gelar: ' + error.message);
                return;
            }

            closeModal('modalGelar');
            await loadProfileData(currentViewingUsername);
            showToast('Riwayat gelar berhasil disimpan');
        }

        async function handleDeleteGelar(id) {
            if (!canDelete()) {
                alert('Hanya admin yang memiliki izin menghapus data.');
                return;
            }
            if (confirm('Yakin ingin menghapus riwayat gelar ini?')) {
                const sb = window.supabaseClient;
                if (!sb) return;
                const { error } = await sb.from('riwayat_gelar').delete().eq('id', id);
                if (error) {
                    showToast('Gagal menghapus riwayat gelar: ' + error.message);
                    return;
                }
                await loadProfileData(currentViewingUsername);
                showToast('Riwayat gelar berhasil dihapus');
            }
        }
