/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * APA GLOBAL PEGAWAI & MITRA SELECTOR COMPONENT
 * Sistem Automasi Pekerjaan Administrasi (APA) - BPS Kabupaten Raja Ampat
 * ═══════════════════════════════════════════════════════════════════════════════
 * Mendukung Pemilihan Petugas Tunggal, Opsi "Terlampir", dan Integrasi Mitra
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.apaPegawai = factory();
    root.openAc = root.apaPegawai.open;
    root.closeAc = root.apaPegawai.close;
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // ── Helper Escape HTML (fallback lokal jika apa-shared.js belum dimuat) ──
  function escHtml(s) {
    if (typeof window !== 'undefined' && typeof window.esc === 'function') {
      return window.esc(s);
    }
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  // ── Helper Format ID Mitra ───────────────────────────────────
  function formatMitraNip(tahun, id) {
    return 'MITRA-' + (tahun || new Date().getFullYear()) + '-' + String(id).padStart(3, '0');
  }

  function isMitraNip(nip) {
    return typeof nip === 'string' && nip.startsWith('MITRA-');
  }

  // Master data dimuat dinamis dari Supabase (tidak lagi hardcode PII di client JS)
  let masterPegawai = [];
  let masterMitra = [];

  // ── State Komponen ───────────────────────────────────────────
  const state = {
    cellEl: null,
    isSingle: false, // true = penandatangan (hanya Pegawai organik, tanpa Terlampir)
    isReadOnly: false, // true = preview mode (hanya melihat daftar petugas terlampir)
    activeView: 'main', // 'main' | 'terlampir'
    terlampirTab: 'semua', // 'semua' | 'peran'
    placement: null, // 'bottom' | 'top'
    selectedNips: [],
    selectedNames: [],
    selectedRolesMap: {},
    mainFiltered: [],
    terlampirFiltered: [],
    focusIdx: -1,
    openedAt: 0,
    query: '',
    terlampirQuery: '',
    onSelectCallback: null,
  };

  let popupEl = null;

  // ── Injeksi CSS Otomatis ─────────────────────────────────────
  function ensureCSS() {
    if (document.getElementById('apa-pegawai-css') || document.querySelector('link[href*="apa-pegawai.css"]')) return;
    const link = document.createElement('link');
    link.id = 'apa-pegawai-css';
    link.rel = 'stylesheet';
    link.href = 'apa-pegawai.css';
    document.head.appendChild(link);
  }

  // ── Injeksi HTML Pop-up ──────────────────────────────────────
  function ensurePopupHTML() {
    popupEl = document.getElementById('apa-pegawai-popup');
    if (popupEl) return popupEl;

    popupEl = document.createElement('div');
    popupEl.id = 'apa-pegawai-popup';
    popupEl.className = 'apa-pegawai-popup';
    popupEl.innerHTML = `
      <!-- VIEW 1: Main Dropdown (Single Select atau Opsi Terlampir) -->
      <div id="apa-pg-view-main" style="display: flex; flex-direction: column; width: 100%;">
        <div class="apa-pg-header">
          <div class="apa-pg-search-wrap">
            <span class="apa-pg-search-icon">🔍</span>
            <input type="text" id="apa-pg-main-search" class="apa-pg-search-input" placeholder="Cari nama atau NIP..." autocomplete="off">
          </div>
        </div>

        <!-- Tombol Kosongkan Pilihan (Muncul jika cell sudah ada nilai) -->
        <div id="apa-pg-clear-btn" class="apa-pg-clear-row" style="display: none;">
          <span>✕ Kosongkan Pilihan</span>
          <span style="font-size: 10px; opacity: 0.85;">Reset pilihan</span>
        </div>

        <!-- Tombol Khusus Terlampir -->
        <div id="apa-pg-terlampir-btn" class="apa-pg-terlampir-row">
          <div class="apa-pg-terlampir-icon">📎</div>
          <div class="apa-pg-terlampir-info">
            <div class="apa-pg-terlampir-title">
              <span>Terlampir</span>
              <span style="font-size: 10.5px; font-weight: 600; color: #1ba3b8;">(Banyak Petugas / Tim)</span>
            </div>
            <div class="apa-pg-terlampir-desc">Pilih 2 orang atau lebih untuk dilampirkan</div>
          </div>
          <span class="apa-pg-terlampir-arrow">➔</span>
        </div>

        <div id="apa-pg-main-divider" class="apa-pg-divider">Atau pilih 1 petugas langsung</div>
        <div id="apa-pg-main-list" class="apa-pg-list"></div>
      </div>

      <!-- VIEW 2: Panel Checklist Terlampir -->
      <div id="apa-pg-view-terlampir" class="apa-pg-view-terlampir">
        <div class="apa-pg-terlampir-nav">
          <button type="button" id="apa-pg-btn-back" class="apa-pg-btn-back">← Kembali</button>
          <span class="apa-pg-terlampir-heading">📎 Petugas Terlampir</span>
        </div>

        <div class="apa-pg-filter-tabs">
          <button type="button" class="apa-pg-tab active" data-tab="semua">Semua</button>
          <button type="button" class="apa-pg-tab" data-tab="peran">Peran</button>
        </div>

        <!-- PANE TAB SEMUA (Tinggi sama persis dengan tab peran) -->
        <div id="apa-pg-pane-semua" class="apa-pg-tab-pane active">
          <div id="apa-pg-terlampir-search-header" class="apa-pg-header" style="border-bottom: none; padding: 6px 10px; flex-shrink: 0;">
            <div class="apa-pg-search-wrap">
              <span class="apa-pg-search-icon">🔍</span>
              <input type="text" id="apa-pg-terlampir-search" class="apa-pg-search-input" placeholder="Saring petugas terlampir..." autocomplete="off">
            </div>
          </div>
          <div id="apa-pg-terlampir-list" class="apa-pg-list"></div>
        </div>

        <!-- PANE TAB PERAN (Tinggi sama persis dengan tab semua) -->
        <div id="apa-pg-pane-peran" class="apa-pg-tab-pane">
          <div id="apa-pg-roles-container" class="apa-pg-roles-container">
            <div class="apa-pg-roles-header">
              <span class="apa-pg-roles-title">📋 Peran Petugas (Opsional)</span>
              <span class="apa-pg-roles-sub">Bisa diisi atau dikosongkan</span>
            </div>
            <div id="apa-pg-roles-list" class="apa-pg-roles-list"></div>
          </div>
        </div>

        <div class="apa-pg-footer">
          <span id="apa-pg-terlampir-count" class="apa-pg-footer-count">0 Petugas Terpilih</span>
          <button type="button" id="apa-pg-btn-save-terlampir" class="apa-pg-btn-save">
            <span>✓</span> Simpan Terlampir
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(popupEl);
    wireEventListeners();
    return popupEl;
  }

  // ── Penempatan Posisi Adaptif (Bawah / Atas) ─────────────────
  function positionPopup(popup, targetEl, forceRecalculateOrientation = false) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const popW = 360;
    const popH = popup.offsetHeight || 390;
    const pad = 8;

    let left = rect.left;
    if (left + popW > window.innerWidth - pad) {
      left = window.innerWidth - popW - pad;
    }
    if (left < pad) left = pad;

    // Tentukan arah penempatan (bawah vs atas)
    if (forceRecalculateOrientation || !state.placement) {
      const spaceBelow = window.innerHeight - rect.bottom - pad;
      const spaceAbove = rect.top - pad;
      if (rect.bottom + 4 + popH <= window.innerHeight - pad) {
        state.placement = 'bottom';
      } else if (spaceAbove >= popH) {
        state.placement = 'top';
      } else {
        state.placement = spaceBelow >= spaceAbove ? 'bottom' : 'top';
      }
    }

    let top;
    if (state.placement === 'bottom') {
      top = rect.bottom + 4;
      if (top + popH > window.innerHeight - pad) {
        top = Math.max(pad, window.innerHeight - popH - pad);
      }
    } else {
      top = rect.top - popH - 4;
      if (top < pad) {
        top = pad;
      }
    }

    popup.style.left = Math.round(left) + 'px';
    popup.style.top = Math.round(top) + 'px';
  }

  // ── Sinkronisasi Data Supabase ───────────────────────────────
  async function loadData() {
    try {
      if (window.APA_AUTH && window.APA_AUTH.ready) {
        await window.APA_AUTH.ready;
      }
      const config = window.APP_CONFIG || (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG : null);
      const url = (config && config.SUPABASE_URL) || window.SUPABASE_URL || '';
      const key = (config && config.SUPABASE_ANON_KEY) || window.SUPABASE_ANON_KEY || '';
      if (!url || !key) return;

      const headers = window.SUPABASE_HEADERS || {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json'
      };

      // 1. Fetch Pegawai + Users (nama ada di tabel users.full_name, bukan data_pegawai.nama)
      try {
        const [resP, resU] = await Promise.all([
          fetch(url + '/rest/v1/data_pegawai?select=pegawai_nip,username,status_kepegawaian,tanggal_pensiun', { headers }),
          fetch(url + '/rest/v1/users?select=username,full_name', { headers })
        ]);
        const userNameMap = {};
        if (resU.ok) {
          const listU = await resU.json();
          if (Array.isArray(listU)) {
            listU.forEach(u => {
              if (u.username) userNameMap[String(u.username).toLowerCase()] = u.full_name || u.username;
            });
          }
        }
        if (resP.ok) {
          const listP = await resP.json();
          if (Array.isArray(listP) && listP.length) {
            masterPegawai = listP.map(p => {
              const uname = String(p.username || '').toLowerCase();
              return {
                nip: String(p.pegawai_nip || p.nip || '').trim(),
                nama: p.nama || p.full_name || userNameMap[uname] || p.username || '',
                jabatan: p.jabatan || 'Pegawai BPS',
                status: (p.status_kepegawaian || p.status || 'aktif').toLowerCase(),
                tanggal_pensiun: p.tanggal_pensiun || ''
              };
            }).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
          }
        }
      } catch (e) {
        console.warn('[apaPegawai] Gagal memuat data_pegawai:', e);
      }

      // 2. Fetch Mitra (tanpa kolom PII no_hp yang tidak digunakan)
      try {
        const resM = await fetch(url + '/rest/v1/mitra?select=id,tahun,nama,jabatan,instansi&order=tahun.desc,nama.asc', { headers });
        if (resM.ok) {
          const listM = await resM.json();
          if (Array.isArray(listM) && listM.length) {
            masterMitra = listM.map(m => ({
              id: m.id,
              nip: formatMitraNip(m.tahun, m.id),
              nama: m.nama,
              jabatan: m.jabatan || 'Mitra',
              instansi: m.instansi || 'BPS Kabupaten Raja Ampat',
              tahun: m.tahun || new Date().getFullYear(),
              _isMitra: true
            }));
          }
        }
      } catch (e) {
        console.warn('[apaPegawai] Gagal memuat mitra:', e);
      }
    } catch (err) {
      console.warn('[apaPegawai] Load data error:', err);
    }
  }

  // ── Render Tampilan Sel di Tabel ─────────────────────────────
  function renderCellUI(cellEl, nips, names, roles) {
    if (!cellEl) return;
    nips = Array.isArray(nips) ? nips : [];
    names = Array.isArray(names) ? names : [];
    roles = Array.isArray(roles) ? roles : [];

    cellEl.dataset.nips = JSON.stringify(nips);
    cellEl.dataset.names = JSON.stringify(names);
    if (roles && roles.length && roles.some(r => r && String(r).trim().length > 0)) {
      cellEl.dataset.roles = JSON.stringify(roles);
      cellEl.dataset.bertugas = JSON.stringify(roles);
    } else {
      delete cellEl.dataset.roles;
      delete cellEl.dataset.bertugas;
    }
    if (nips.length === 1) {
      cellEl.dataset.nip = nips[0];
      cellEl.dataset.nama = names[0] || nips[0];
    } else {
      delete cellEl.dataset.nip;
      delete cellEl.dataset.nama;
    }

    if (!cellEl.hasAttribute('tabindex')) {
      cellEl.setAttribute('tabindex', '0');
    }

    cellEl.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'apa-pg-cell-wrapper';

    if (!nips.length) {
      const placeholder = cellEl.classList.contains('single') || cellEl.dataset.field === 'penandatangan'
        ? 'Pilih penandatangan...'
        : 'Pilih pegawai / mitra...';
      wrapper.innerHTML = '<span class="apa-pg-placeholder">' + placeholder + '</span>';
    } else if (nips.length === 1) {
      // 1 Orang Tunggal (Rule 4 & 5: Tanpa tombol silang x)
      const nama = names[0] || nips[0];
      wrapper.innerHTML = '<span class="apa-pg-single-name" title="' + escHtml(nama) + '">' + escHtml(nama) + '</span>';
    } else {
      // Terlampir (Rule 1 & 3: Nama-nama tersembunyi, hanya badge ringkas tanpa logo)
      wrapper.innerHTML = `
        <span class="apa-pg-badge-terlampir" title="${escHtml(names.join(', '))}">
          Terlampir <span class="count-pill">${nips.length}</span>
        </span>
      `;
    }

    cellEl.appendChild(wrapper);
  }

  // ── Render View 1: Main Dropdown ─────────────────────────────
  function renderMainList() {
    if (!popupEl) return;
    const listEl = popupEl.querySelector('#apa-pg-main-list');
    const q = (state.query || '').toLowerCase().trim();

    let pool = masterPegawai.map(p => ({
      nip: p.nip,
      nama: p.nama,
      sub: p.nip ? 'NIP ' + p.nip : p.jabatan,
      badge: p.status === 'pensiun' ? 'Pensiun' : 'Pegawai',
      badgeCls: p.status === 'pensiun' ? 'pensiun' : 'pegawai',
      isPegawai: true,
      disabled: p.status === 'pensiun'
    }));

    if (!state.isSingle) {
      const curYear = new Date().getFullYear();
      const mitraItems = masterMitra
        .filter(m => m.tahun === curYear || !m.tahun)
        .map(m => ({
          nip: m.nip,
          nama: m.nama,
          sub: m.nip,
          badge: 'Mitra',
          badgeCls: 'mitra',
          isMitra: true,
          disabled: false
        }));
      pool = pool.concat(mitraItems);
    }

    state.mainFiltered = pool.filter(item => {
      if (!q) return true;
      return item.nama.toLowerCase().includes(q) || item.nip.toLowerCase().includes(q);
    }).slice(0, 50);

    if (!state.mainFiltered.length) {
      listEl.innerHTML = '<div class="apa-pg-empty">Tidak ada nama yang cocok dengan "' + escHtml(q) + '".</div>';
      return;
    }

    const curNip = state.selectedNips.length === 1 ? state.selectedNips[0] : '';

    listEl.innerHTML = state.mainFiltered.map((item, idx) => {
      const initials = (item.nama || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      const isSel = curNip === item.nip;
      const isFoc = state.focusIdx === idx;
      const cls = 'apa-pg-item ' + (item.isMitra ? 'is-mitra' : 'is-pegawai') +
        (isSel ? ' selected' : '') +
        (isFoc ? ' focused' : '') +
        (item.disabled ? ' disabled' : '');

      return `
        <div class="${cls}" data-nip="${escHtml(item.nip)}" data-nama="${escHtml(item.nama)}" data-idx="${idx}">
          <div class="apa-pg-item-avatar">${escHtml(initials)}</div>
          <div class="apa-pg-item-content">
            <div class="apa-pg-item-nama">${escHtml(item.nama)}</div>
            <div class="apa-pg-item-sub">
              <span>${escHtml(item.sub)}</span>
              <span class="apa-pg-badge ${escHtml(item.badgeCls)}">${escHtml(item.badge)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Render View 2: Checklist Terlampir ───────────────────────
  function renderTerlampirList() {
    if (!popupEl) return;
    const listEl = popupEl.querySelector('#apa-pg-terlampir-list');
    const q = (state.terlampirQuery || '').toLowerCase().trim();
    const btnBack = popupEl.querySelector('#apa-pg-btn-back');
    const saveBtn = popupEl.querySelector('#apa-pg-btn-save-terlampir');

    if (btnBack) btnBack.style.display = state.isReadOnly ? 'none' : 'flex';
    if (saveBtn) {
      saveBtn.innerHTML = state.isReadOnly ? '✕ Tutup' : '<span>✓</span> Simpan Terlampir';
    }

    // MODE READ-ONLY (PREVIEW): Tampilkan hanya petugas yang dilampirkan
    if (state.isReadOnly) {
      let pool = state.selectedNips.map((nip, idx) => {
        const name = state.selectedNames[idx] || nip;
        const pFound = masterPegawai.find(p => p.nip === nip);
        const mFound = masterMitra.find(m => m.nip === nip);
        const isM = isMitraNip(nip) || Boolean(mFound);
        return {
          nip,
          nama: name,
          sub: isM ? (mFound && mFound.instansi ? mFound.instansi : nip) : (pFound && pFound.jabatan ? pFound.jabatan : (nip ? 'NIP ' + nip : 'Pegawai')),
          badge: isM ? 'Mitra' : 'Pegawai',
          badgeCls: isM ? 'mitra' : 'pegawai',
          isMitra: isM
        };
      });

      if (state.terlampirTab === 'pegawai') pool = pool.filter(x => !x.isMitra);
      if (state.terlampirTab === 'mitra') pool = pool.filter(x => x.isMitra);

      state.terlampirFiltered = pool.filter(item => {
        if (!q) return true;
        return item.nama.toLowerCase().includes(q) || item.nip.toLowerCase().includes(q);
      });

      if (!state.terlampirFiltered.length) {
        listEl.innerHTML = '<div class="apa-pg-empty">Tidak ada petugas ditemukan.</div>';
        return;
      }

      listEl.innerHTML = state.terlampirFiltered.map((item, idx) => `
        <div class="apa-pg-check-item readonly checked" style="cursor: default;" data-nip="${escHtml(item.nip)}">
          <div class="apa-pg-checkbox" style="background:#0284c7;color:#fff;border-color:#0284c7;font-size:10px;font-weight:700;">${idx + 1}</div>
          <div class="apa-pg-item-content">
            <div class="apa-pg-item-nama" style="font-weight:600;">${escHtml(item.nama)}</div>
            <div class="apa-pg-item-sub">
              <span>${escHtml(item.sub)}</span>
              <span class="apa-pg-badge ${escHtml(item.badgeCls)}">${escHtml(item.badge)}</span>
            </div>
          </div>
        </div>
      `).join('');

      updateTerlampirCountUI();
      return;
    }

    let pool = [];
    const curYear = new Date().getFullYear();

    pool = pool.concat(masterPegawai.filter(p => p.status !== 'pensiun').map(p => ({
      nip: p.nip,
      nama: p.nama,
      sub: p.nip ? 'NIP ' + p.nip : p.jabatan,
      badge: 'Pegawai',
      badgeCls: 'pegawai',
      isMitra: false
    })));

    pool = pool.concat(masterMitra.filter(m => m.tahun === curYear || !m.tahun).map(m => ({
      nip: m.nip,
      nama: m.nama,
      sub: m.nip,
      badge: 'Mitra',
      badgeCls: 'mitra',
      isMitra: true
    })));

    state.terlampirFiltered = pool.filter(item => {
      if (!q) return true;
      return item.nama.toLowerCase().includes(q) || item.nip.toLowerCase().includes(q);
    });

    if (!state.terlampirFiltered.length) {
      listEl.innerHTML = '<div class="apa-pg-empty">Tidak ada petugas ditemukan.</div>';
      return;
    }

    const selectedSet = new Set(state.selectedNips);
    listEl.innerHTML = state.terlampirFiltered.map(item => {
      const isChecked = selectedSet.has(item.nip);
      return `
        <div class="apa-pg-check-item ${isChecked ? 'checked' : ''}" data-nip="${escHtml(item.nip)}" data-nama="${escHtml(item.nama)}">
          <div class="apa-pg-checkbox">${isChecked ? '✓' : ''}</div>
          <div class="apa-pg-item-content">
            <div class="apa-pg-item-nama">${escHtml(item.nama)}</div>
            <div class="apa-pg-item-sub">
              <span>${escHtml(item.sub)}</span>
              <span class="apa-pg-badge ${escHtml(item.badgeCls)}">${escHtml(item.badge)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    updateTerlampirCountUI();
  }

  function updateTerlampirCountUI() {
    if (!popupEl) return;
    const countEl = popupEl.querySelector('#apa-pg-terlampir-count');
    if (countEl) {
      countEl.textContent = state.selectedNips.length + ' Petugas Terpilih';
    }
    if (state.terlampirTab === 'peran') {
      renderRolesPanel();
    }
  }

  function renderRolesPanel() {
    if (!popupEl) return;
    const container = popupEl.querySelector('#apa-pg-roles-container');
    const listEl = popupEl.querySelector('#apa-pg-roles-list');
    if (!container || !listEl) return;

    if (!state.selectedNips.length) {
      listEl.innerHTML = '<div class="apa-pg-empty" style="padding-top:40px;">Belum ada petugas yang dipilih.<br><span style="font-size:11px;color:#94a3b8;margin-top:6px;display:inline-block;">Pilih petugas terlebih dahulu di tab Semua.</span></div>';
      return;
    }

    listEl.innerHTML = state.selectedNips.map((nip, idx) => {
      const name = state.selectedNames[idx] || nip;
      const roleVal = escHtml(state.selectedRolesMap[nip] || '');
      const isRo = state.isReadOnly;
      return `
        <div class="apa-pg-role-row">
          <span class="apa-pg-role-num">${idx + 1}.</span>
          <span class="apa-pg-role-name" title="${escHtml(name)}">${escHtml(name)}</span>
          <input type="text"
                 class="apa-pg-role-input"
                 data-nip="${escHtml(nip)}"
                 value="${roleVal}"
                 placeholder="Peran (opsional)"
                 ${isRo ? 'readonly disabled' : ''}>
        </div>
      `;
    }).join('');

    if (!state.isReadOnly) {
      listEl.querySelectorAll('.apa-pg-role-input').forEach(input => {
        input.addEventListener('input', function () {
          const n = this.dataset.nip;
          if (n) state.selectedRolesMap[n] = this.value;
        });
        input.addEventListener('keydown', function (e) {
          e.stopPropagation();
        });
      });
    }
  }

  // ── Switch Tab di View Terlampir (Semua vs Peran) ────────────
  function switchTerlampirTab(tabName) {
    state.terlampirTab = tabName || 'semua';
    if (!popupEl) return;

    const tabs = popupEl.querySelectorAll('.apa-pg-tab');
    tabs.forEach(t => {
      if (t.dataset.tab === state.terlampirTab) t.classList.add('active');
      else t.classList.remove('active');
    });

    const paneSemua = popupEl.querySelector('#apa-pg-pane-semua');
    const panePeran = popupEl.querySelector('#apa-pg-pane-peran');

    if (state.terlampirTab === 'peran') {
      if (paneSemua) paneSemua.classList.remove('active');
      if (panePeran) panePeran.classList.add('active');
      renderRolesPanel();
    } else {
      if (panePeran) panePeran.classList.remove('active');
      if (paneSemua) paneSemua.classList.add('active');
      renderTerlampirList();
      const sInp = popupEl.querySelector('#apa-pg-terlampir-search');
      if (sInp) setTimeout(() => sInp.focus(), 60);
    }

    if (state.cellEl) {
      positionPopup(popupEl, state.cellEl, false);
    }
  }

  // ── Switch View (Main vs Terlampir) ──────────────────────────
  function switchView(viewName) {
    state.activeView = viewName;
    const mainView = popupEl.querySelector('#apa-pg-view-main');
    const terlampirView = popupEl.querySelector('#apa-pg-view-terlampir');

    if (viewName === 'terlampir') {
      mainView.style.display = 'none';
      terlampirView.classList.add('active');
      switchTerlampirTab('semua');
    } else {
      terlampirView.classList.remove('active');
      mainView.style.display = 'flex';
      renderMainList();
      const sInp = mainView.querySelector('#apa-pg-main-search');
      if (sInp) setTimeout(() => sInp.focus(), 60);
    }

    if (state.cellEl) {
      positionPopup(popupEl, state.cellEl, false);
    }
  }

  // ── Commit & Simpan Pilihan ke Cell ──────────────────────────
  function commitSelection() {
    if (!state.cellEl) return;

    const rolesArr = state.selectedNips.map(nip => (state.selectedRolesMap[nip] || '').trim());
    const hasAnyRole = rolesArr.some(r => r.length > 0);
    const finalRoles = hasAnyRole ? rolesArr : [];

    renderCellUI(state.cellEl, state.selectedNips, state.selectedNames, finalRoles);

    state.cellEl.dispatchEvent(new Event('input', { bubbles: true }));
    state.cellEl.dispatchEvent(new Event('change', { bubbles: true }));

    if (typeof state.onSelectCallback === 'function') {
      state.onSelectCallback({
        nips: state.selectedNips,
        names: state.selectedNames,
        roles: finalRoles,
        isTerlampir: state.selectedNips.length > 1
      });
    }

    closePopup();
  }

  function clearSelection() {
    state.selectedNips = [];
    state.selectedNames = [];
    state.selectedRolesMap = {};
    commitSelection();
  }

  function pickSinglePerson(nip, nama) {
    state.selectedNips = [nip];
    state.selectedNames = [nama];
    state.selectedRolesMap = {};
    commitSelection();
  }

  // ── Buka Pop-up ──────────────────────────────────────────────
  function openPopup(cellEl, isSingle, onSelect, isReadOnly) {
    if (!cellEl) return;
    ensureCSS();
    ensurePopupHTML();

    if (typeof onSelect === 'boolean') {
      isReadOnly = onSelect;
      onSelect = null;
    }

    state.openedAt = Date.now();
    state.cellEl = cellEl;
    state.isSingle = Boolean(isSingle);
    state.isReadOnly = Boolean(isReadOnly);
    state.onSelectCallback = onSelect || null;
    state.query = '';
    state.terlampirQuery = '';
    state.focusIdx = -1;
    state.placement = null;

    let existingNips = [];
    let existingNames = [];
    let existingRoles = [];
    try { existingNips = JSON.parse(cellEl.dataset.nips || '[]'); } catch (_) {}
    try { existingNames = JSON.parse(cellEl.dataset.names || '[]'); } catch (_) {}
    try { existingRoles = JSON.parse(cellEl.dataset.roles || cellEl.dataset.bertugas || '[]'); } catch (_) {}

    if (!existingNips.length && cellEl.dataset.nip) {
      existingNips = [cellEl.dataset.nip];
      existingNames = [cellEl.dataset.nama || cellEl.textContent.trim()];
    }

    state.selectedNips = [...existingNips];
    state.selectedNames = [...existingNames];
    state.selectedRolesMap = {};
    existingNips.forEach((nip, idx) => {
      if (existingRoles[idx] != null) {
        state.selectedRolesMap[nip] = String(existingRoles[idx]);
      }
    });

    // Reset input pencarian
    const mainSearch = popupEl.querySelector('#apa-pg-main-search');
    if (mainSearch) mainSearch.value = '';
    const terlampirSearch = popupEl.querySelector('#apa-pg-terlampir-search');
    if (terlampirSearch) terlampirSearch.value = '';

    // Tombol Kosongkan Pilihan
    const clearBtn = popupEl.querySelector('#apa-pg-clear-btn');
    if (clearBtn) clearBtn.style.display = (!state.isReadOnly && existingNips.length > 0) ? 'flex' : 'none';

    // Konfigurasi mode Single (penandatangan) vs Multi
    const terlampirBtn = popupEl.querySelector('#apa-pg-terlampir-btn');
    const divider = popupEl.querySelector('#apa-pg-main-divider');
    if (terlampirBtn) terlampirBtn.style.display = state.isSingle ? 'none' : 'flex';
    if (divider) divider.style.display = state.isSingle ? 'none' : 'flex';

    popupEl.classList.add('open');

    // Rule 2 & 3: Jika mode read-only ATAU cell sudah berstatus Terlampir (> 1 orang), buka langsung ke view Terlampir
    if (state.isReadOnly || (!state.isSingle && state.selectedNips.length > 1)) {
      switchView('terlampir');
    } else {
      switchView('main');
    }

    positionPopup(popupEl, cellEl, true);
  }

  function openPreview(targetEl) {
    if (!targetEl) return;
    openPopup(targetEl, false, null, true);
  }

  function closePopup() {
    if (!popupEl) return;
    popupEl.classList.remove('open');
    const cellToRestore = state.cellEl;
    state.cellEl = null;
    state.focusIdx = -1;
    if (cellToRestore && typeof cellToRestore.focus === 'function') {
      cellToRestore.focus();
    }
  }

  // ── Event Wiring ─────────────────────────────────────────────
  function wireEventListeners() {
    if (!popupEl) return;

    // Search di Main View
    const mainSearch = popupEl.querySelector('#apa-pg-main-search');
    if (mainSearch) {
      mainSearch.addEventListener('input', function () {
        state.query = this.value;
        state.focusIdx = -1;
        renderMainList();
      });

      function updateMainFocusHighlight(prevIdx, nextIdx) {
        const listEl = popupEl.querySelector('#apa-pg-main-list');
        if (!listEl) return;
        if (prevIdx >= 0) {
          const prevEl = listEl.querySelector(`.apa-pg-item[data-idx="${prevIdx}"]`);
          if (prevEl) prevEl.classList.remove('focused');
        }
        if (nextIdx >= 0) {
          const nextEl = listEl.querySelector(`.apa-pg-item[data-idx="${nextIdx}"]`);
          if (nextEl) {
            nextEl.classList.add('focused');
            nextEl.scrollIntoView({ block: 'nearest' });
          }
        }
      }

      // Keyboard navigation (lewati item disabled/pensiun; toggle class langsung tanpa rebuild innerHTML)
      mainSearch.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          let next = state.focusIdx + 1;
          while (next < state.mainFiltered.length && state.mainFiltered[next].disabled) next++;
          if (next < state.mainFiltered.length) {
            const prev = state.focusIdx;
            state.focusIdx = next;
            updateMainFocusHighlight(prev, next);
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          let prev = state.focusIdx - 1;
          while (prev >= 0 && state.mainFiltered[prev].disabled) prev--;
          if (prev >= 0) {
            const old = state.focusIdx;
            state.focusIdx = prev;
            updateMainFocusHighlight(old, prev);
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (state.focusIdx >= 0 && state.mainFiltered[state.focusIdx]) {
            const item = state.mainFiltered[state.focusIdx];
            if (!item.disabled) {
              pickSinglePerson(item.nip, item.nama);
            }
          }
        }
      });
    }

    // Klik Tombol Kosongkan Pilihan
    const clearBtn = popupEl.querySelector('#apa-pg-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        clearSelection();
      });
    }

    // Klik Baris 'Terlampir'
    const terlampirBtn = popupEl.querySelector('#apa-pg-terlampir-btn');
    if (terlampirBtn) {
      terlampirBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        switchView('terlampir');
      });
    }

    // Klik Nama Tunggal di Main View
    const mainList = popupEl.querySelector('#apa-pg-main-list');
    if (mainList) {
      mainList.addEventListener('click', function (e) {
        const itemEl = e.target.closest('.apa-pg-item:not(.disabled)');
        if (!itemEl) return;
        const nip = itemEl.dataset.nip;
        const nama = itemEl.dataset.nama;
        pickSinglePerson(nip, nama);
      });
    }

    // Tombol Kembali di View Terlampir
    const backBtn = popupEl.querySelector('#apa-pg-btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        switchView('main');
      });
    }

    // Filter Tabs Terlampir (Semua / Peran)
    const tabs = popupEl.querySelectorAll('.apa-pg-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', function (e) {
        e.stopPropagation();
        switchTerlampirTab(this.dataset.tab);
      });
    });

    // Search di View Terlampir
    const terlampirSearch = popupEl.querySelector('#apa-pg-terlampir-search');
    if (terlampirSearch) {
      terlampirSearch.addEventListener('input', function () {
        state.terlampirQuery = this.value;
        renderTerlampirList();
      });
    }

    // Checklist Petugas Terlampir
    const terlampirList = popupEl.querySelector('#apa-pg-terlampir-list');
    if (terlampirList) {
      terlampirList.addEventListener('click', function (e) {
        if (state.isReadOnly) return; // Mode preview read-only tidak merubah centang
        const checkItem = e.target.closest('.apa-pg-check-item');
        if (!checkItem) return;
        const nip = checkItem.dataset.nip;
        const nama = checkItem.dataset.nama;

        const idx = state.selectedNips.indexOf(nip);
        if (idx >= 0) {
          state.selectedNips.splice(idx, 1);
          state.selectedNames.splice(idx, 1);
          delete state.selectedRolesMap[nip];
          checkItem.classList.remove('checked');
          checkItem.querySelector('.apa-pg-checkbox').textContent = '';
        } else {
          state.selectedNips.push(nip);
          state.selectedNames.push(nama);
          if (!state.selectedRolesMap[nip]) state.selectedRolesMap[nip] = '';
          checkItem.classList.add('checked');
          checkItem.querySelector('.apa-pg-checkbox').textContent = '✓';
        }
        updateTerlampirCountUI();
      });
    }

    // Tombol Simpan Terlampir / Tutup
    const saveTerlampirBtn = popupEl.querySelector('#apa-pg-btn-save-terlampir');
    if (saveTerlampirBtn) {
      saveTerlampirBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (state.isReadOnly) {
          closePopup();
          return;
        }
        commitSelection();
      });
    }

    popupEl.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  function scrollFocusedIntoView(containerSel) {
    const el = popupEl.querySelector(containerSel + ' .apa-pg-item.focused');
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }

  // ── Global Listeners ─────────────────────────────────────────
  function initGlobalListeners() {
    // 1. Klik di luar: Tutup (Rule 6: jika mengetik tanpa memilih, teks hilang)
    document.addEventListener('click', function (e) {
      if (!popupEl || !popupEl.classList.contains('open')) return;
      if (popupEl.contains(e.target)) return;
      if (state.cellEl && (state.cellEl === e.target || state.cellEl.contains(e.target))) return;
      if (state.openedAt && (Date.now() - state.openedAt < 150)) return;
      closePopup();
    });

    // 2. Klik 1 kali pada kolom pegawai -> Buka Pop-up
    document.addEventListener('click', function (e) {
      const cell = e.target.closest('.pg-cell, [data-field="pegawai_multi"], [data-field="penandatangan"]');
      if (cell && !cell.classList.contains('readonly') && !cell.disabled) {
        const isSingle = cell.classList.contains('single') || cell.dataset.field === 'penandatangan';
        openPopup(cell, isSingle);
      }
    });

    // 3. Escape
    document.addEventListener('keydown', function (e) {
      if (!popupEl || !popupEl.classList.contains('open')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closePopup();
      }
    });

    // 4. Resize
    window.addEventListener('resize', function () {
      if (popupEl && popupEl.classList.contains('open') && state.cellEl) {
        positionPopup(popupEl, state.cellEl);
      }
    }, { passive: true });
  }

  function init() {
    ensureCSS();
    ensurePopupHTML();
    initGlobalListeners();
    loadData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    open: openPopup,
    openPreview: openPreview,
    close: closePopup,
    getCell: function () {
      return state.cellEl;
    },
    isOpen: function () {
      return !!(popupEl && popupEl.classList.contains('open'));
    },
    renderCell: renderCellUI,
    loadData: loadData,
    formatMitraNip: formatMitraNip,
    isMitraNip: isMitraNip,
    getPegawaiList: function () { return masterPegawai; },
    getMitraList: function () { return masterMitra; }
  };
});
