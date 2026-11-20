// ═══════════════════════════════════════════════════════════════════════════════
// minta-surat-tugas.js — Halaman Layanan Pegawai: Surat Tugas
// Desain & perilaku tabel disamakan dengan Admin Surat Tugas (9 kolom),
// me-reuse modul shared: st-lookups.js, st-excel.js, st-bulk.js, st-docx.js
// ═══════════════════════════════════════════════════════════════════════════════

const H = SUPABASE_HEADERS;

// State bersama yang juga dibaca oleh st-lookups.js, st-excel.js, st-bulk.js, st-docx.js
let SESSION = null;
let allSurat = [];
let suratMap = {};
let suratOrderMap = {};
let filteredSurat = [];
let suratSortState = { col: 'no', dir: 'desc' };
let suratPage = 1;
const SURAT_PAGE_SIZE = 50;

let pegawaiList = [];
let pegawaiByNIP = {};
let mitraList = [];
let mitraByNip = {};
let riwayatJabatan = [];
let riwayatJabatanByNip = new Map();
let riwayatPangkatGolongan = [];
let riwayatPangkatByNip = new Map();
let riwayatGelar = [];
let riwayatGelarByNip = new Map();
let userMap = {};

// currentPreviewSurat, _previewBlob, _previewUploadedPath sudah dideklarasikan di st-lookups.js
let editingSuratId = null;
let rowIdCounter = 0;
let _loadSuratSeq = 0;
const _rowActionInFlight = new Set();

/* ════════════════════════════════════════════════════════════════════
   HELPERS PEGAWAI / MITRA / MODAL / ALERT
═══════════════════════════════════════════════════════════════════════ */
function isMitraNip(nip) {
  return typeof nip === 'string' && /^MITRA-/i.test(nip.trim());
}

function pegawaiNip(p) {
  if (!p) return '';
  return String(p.pegawai_nip || p.nip || '').trim();
}

function pegawaiNama(p) {
  if (!p) return '';
  if (p.nama && String(p.nama).trim()) return String(p.nama).trim();
  if (p.full_name && String(p.full_name).trim()) return String(p.full_name).trim();
  if (p.username) {
    const u = Object.values(userMap).find(x => (x.username || '').toLowerCase() === String(p.username).toLowerCase());
    if (u && u.full_name) return u.full_name;
    return p.username;
  }
  return '';
}

function getPengajuNama(s) {
  if (!s) return '';
  const u = userMap[s.user_id];
  if (u) return u.full_name || u.username || '';
  if (SESSION && String(s.user_id) === String(SESSION.id)) {
    return SESSION.full_name || SESSION.username || '';
  }
  return '';
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
  if (id === 'modal-preview' && _previewUploadedPath && typeof schedulePreviewCleanup === 'function') {
    schedulePreviewCleanup(_previewUploadedPath);
  }
  if (id === 'modal-preview') {
    _previewBlob = null;
    currentPreviewSurat = null;
    const container = document.getElementById('preview-container');
    if (container) container.innerHTML = '';
  }
}

let _pageAlertTimer = null;
function showPageAlert(msg, type = 'error') {
  const alert = document.getElementById('page-alert');
  if (!alert) return;
  const iconMap = { success: '✅', error: '⚠️', info: 'ℹ️' };
  const iconEl = document.getElementById('page-alert-icon');
  const textEl = document.getElementById('page-alert-text');
  if (iconEl) iconEl.textContent = iconMap[type] || iconMap.error;
  if (textEl) textEl.textContent = msg;
  alert.className = `alert ${type} show`;
  alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (_pageAlertTimer) clearTimeout(_pageAlertTimer);
  _pageAlertTimer = setTimeout(() => {
    alert.className = 'alert';
    _pageAlertTimer = null;
  }, 5500);
}

/* ════════════════════════════════════════════════════════════════════
   PARSING TANGGAL FLEKSIBEL (sama dengan Admin Surat Tugas)
═══════════════════════════════════════════════════════════════════════ */
const BULAN_KEYS = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2, peb: 2, pebruari: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, agt: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10,
  nov: 11, november: 11, nop: 11, nopember: 11,
  des: 12, desember: 12, dec: 12, december: 12,
};

function normYear(y) {
  y = parseInt(y, 10);
  if (isNaN(y)) return null;
  if (y < 100) y += (y <= 30 ? 2000 : 1900);
  return y;
}

function parseFlexDate(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const parts = s.replace(/[,]/g, ' ').split(/[\s\/\-\.]+/).filter(Boolean);
  if (parts.length === 3) {
    let [d, mo, y] = parts;
    const moKey = BULAN_KEYS[mo];
    if (moKey) {
      d = parseInt(d, 10);
      const yy = normYear(y);
      if (d >= 1 && d <= 31 && yy) return `${yy}-${String(moKey).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    d = parseInt(d, 10);
    mo = parseInt(mo, 10);
    const yy = normYear(y);
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && yy) {
      return `${yy}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  if (parts.length === 2) {
    let [d, mo] = parts;
    const moKey = BULAN_KEYS[mo] || (parseInt(mo, 10) >= 1 && parseInt(mo, 10) <= 12 ? parseInt(mo, 10) : null);
    d = parseInt(d, 10);
    if (d >= 1 && d <= 31 && moKey) {
      const y = new Date().getFullYear();
      return `${y}-${String(moKey).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return null;
}

function parseFlexRange(input) {
  if (!input) return { mulai: '', selesai: '' };
  const s = String(input).trim();
  if (!s) return { mulai: '', selesai: '' };

  const resolvePair = (left, right) => {
    const b = parseFlexDate(right);
    let a = parseFlexDate(left);
    if (!a && b && /^\d{1,2}$/.test(left)) {
      const bm = b.match(/^(\d{4})-(\d{2})-/);
      if (bm) {
        const d = parseInt(left, 10), mo = parseInt(bm[2], 10), y = parseInt(bm[1], 10);
        const dt = new Date(y, mo - 1, d);
        if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) {
          a = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
      }
    }
    if (b && !/\d{4}/.test(left) && /^\d{1,2}\s+[a-zA-Z]+/.test(left)) {
      const aWithYear = parseFlexDate(`${left} ${b.slice(0, 4)}`);
      if (aWithYear) a = aWithYear;
    }
    if (a) return { mulai: a, selesai: b || '' };
    return null;
  };

  const seps = [' s.d. ', ' sd ', ' - ', ' s/d ', ' to ', ' – ', ' — ', '~'];
  for (const sep of seps) {
    const idx = s.toLowerCase().indexOf(sep);
    if (idx > 0) {
      const res = resolvePair(s.slice(0, idx).trim(), s.slice(idx + sep.length).trim());
      if (res) return res;
    }
  }
  const dashSplit = s.split(/\s+-\s+|\s+–\s+|\s+—\s+/);
  if (dashSplit.length === 2) {
    const res = resolvePair(dashSplit[0].trim(), dashSplit[1].trim());
    if (res) return res;
  }
  const single = parseFlexDate(s);
  if (single) return { mulai: single, selesai: '' };
  return { mulai: '', selesai: '' };
}

function autoGrow(el) {
  if (!el || !el.style) return;
  el.style.height = 'auto';
  const h = el.scrollHeight;
  if (h > 0) el.style.height = h + 'px';
}

function autoGrowAll(root = document) {
  root.querySelectorAll('textarea.xls-cell').forEach(autoGrow);
}

/* ════════════════════════════════════════════════════════════════════
   LOAD DATA REFERENSI (untuk Preview/Download DOCX, Import, & POK)
═══════════════════════════════════════════════════════════════════════ */
function buildRiwayatIndex(list, filterFn) {
  const map = new Map();
  list.forEach(r => {
    if (filterFn && !filterFn(r)) return;
    const nip = String(r.pegawai_nip || '').trim();
    if (!nip) return;
    const rec = { ...r, _isoTmt: normTmtIso(r.tmt) };
    if (!map.has(nip)) map.set(nip, []);
    map.get(nip).push(rec);
  });
  map.forEach(arr => arr.sort((a, b) => (b._isoTmt || '').localeCompare(a._isoTmt || '')));
  return map;
}

async function loadReferenceData() {
  const safeJson = async (url) => {
    try {
      const res = await fetch(url, { headers: H });
      return res.ok ? await res.json() : [];
    } catch (_) { return []; }
  };

  const [users, pegawai, mitra, rJab, rPang, rGel] = await Promise.all([
    safeJson(`${SUPABASE_URL}/rest/v1/users?select=id,username,full_name`),
    safeJson(`${SUPABASE_URL}/rest/v1/data_pegawai?select=*`),
    safeJson(`${SUPABASE_URL}/rest/v1/mitra?select=*&order=nama.asc`),
    safeJson(`${SUPABASE_URL}/rest/v1/riwayat_jabatan?select=*&order=tmt.desc`),
    safeJson(`${SUPABASE_URL}/rest/v1/riwayat_pangkat_golongan?select=*&order=tmt.desc`),
    safeJson(`${SUPABASE_URL}/rest/v1/riwayat_gelar?select=*&order=tmt.desc`),
  ]);

  userMap = {};
  const userByUsername = {};
  users.forEach(u => {
    userMap[u.id] = u;
    if (u.username) userByUsername[u.username.toLowerCase()] = u;
  });

  pegawaiList = pegawai.map(p => {
    const u = p.username ? userByUsername[String(p.username).toLowerCase()] : null;
    return { ...p, nama: p.nama || (u ? u.full_name : '') || p.username || '' };
  });
  pegawaiByNIP = {};
  pegawaiList.forEach(p => {
    const nip = pegawaiNip(p);
    if (nip) pegawaiByNIP[nip] = p;
  });

  mitraList = mitra;
  mitraByNip = {};
  mitraList.forEach(m => {
    const nip = m.mitra_nip || `MITRA-${m.tahun || new Date().getFullYear()}-${String(m.id).padStart(3, '0')}`;
    mitraByNip[nip] = m;
  });

  riwayatJabatan = rJab;
  riwayatJabatanByNip = buildRiwayatIndex(riwayatJabatan, r => (r.jenis || 'utama') === 'utama');
  riwayatPangkatGolongan = rPang;
  riwayatPangkatByNip = buildRiwayatIndex(riwayatPangkatGolongan);
  riwayatGelar = rGel;
  riwayatGelarByNip = buildRiwayatIndex(riwayatGelar);
}

/* ════════════════════════════════════════════════════════════════════
   LOAD SURAT TUGAS MILIK USER (Paged Range 0-999)
═══════════════════════════════════════════════════════════════════════ */
async function fetchOwnSuratPaged() {
  const PAGE_SIZE = 1000;
  const all = [];
  let offset = 0;
  const baseUrl = `${SUPABASE_URL}/rest/v1/surat_tugas?user_id=eq.${encodeURIComponent(SESSION.id)}&order=created_at.asc,id.asc`;
  while (true) {
    const res = await fetch(baseUrl, {
      headers: { ...H, 'Range-Unit': 'items', 'Range': `${offset}-${offset + PAGE_SIZE - 1}` },
    });
    if (res.status === 416) break;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const chunk = await res.json();
    if (!Array.isArray(chunk) || !chunk.length) break;
    all.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

async function loadSurat(options = {}) {
  const reqSeq = ++_loadSuratSeq;
  const resetPage = !!options.resetPage;
  closeAllPopups();
  try {
    const ascList = await fetchOwnSuratPaged();
    if (reqSeq !== _loadSuratSeq) return;
    suratOrderMap = {};
    ascList.forEach((s, i) => { suratOrderMap[s.id] = i + 1; });
    allSurat = ascList.slice().reverse();
    suratMap = {};
    allSurat.forEach(s => { suratMap[s.id] = s; });
    if (resetPage) suratPage = 1;
    updateStats();
    filterTable({ resetPage: false });
    loadMAKSuggestions();
  } catch (e) {
    if (reqSeq !== _loadSuratSeq) return;
    showPageAlert(`Gagal memuat data surat tugas: ${e.message}`, 'error');
  }
}

/* ════════════════════════════════════════════════════════════════════
   DASHBOARD STATS, FILTER, SORT & PAGINASI
═══════════════════════════════════════════════════════════════════════ */
function updateStats() {
  const elTotal = document.getElementById('st-total');
  const elMenunggu = document.getElementById('st-menunggu');
  const elSelesai = document.getElementById('st-selesai');
  if (elTotal) elTotal.textContent = allSurat.length;
  if (elMenunggu) elMenunggu.textContent = allSurat.filter(s => s.status === 'menunggu').length;
  if (elSelesai) elSelesai.textContent = allSurat.filter(s => s.status === 'selesai').length;
}

function setFilterStatus(status) {
  const sel = document.getElementById('filter-status');
  if (sel) sel.value = status;
  document.querySelectorAll('.stat-card').forEach(card => {
    card.classList.toggle('active', (card.dataset.status || '') === status);
  });
  filterTable({ resetPage: true });
}

function sortValueSurat(s, col) {
  if (col === 'no') return suratOrderMap[s.id] || 0;
  if (col === 'waktu') return Date.parse(s.tanggal_berangkat || '') || 0;
  if (col === 'pegawai') return (s.pegawai_list || []).join(' ').toLowerCase();
  return String(s[col] || '').toLowerCase();
}

function setSuratSort(col) {
  if (suratSortState.col === col) {
    suratSortState.dir = suratSortState.dir === 'asc' ? 'desc' : 'asc';
  } else {
    suratSortState.col = col;
    suratSortState.dir = ['no', 'waktu'].includes(col) ? 'desc' : 'asc';
  }
  filterTable({ resetPage: false });
}

function refreshSortHeaders() {
  document.querySelectorAll('table.mst-table thead th.sortable').forEach(th => {
    const attr = (th.getAttribute('onclick') || '').match(/setSuratSort\('([^']+)'\)/);
    const col = attr && attr[1];
    const active = col === suratSortState.col;
    th.classList.toggle('sorted', active);
    const arrow = th.querySelector('.sort-arrow');
    if (arrow) arrow.textContent = active ? (suratSortState.dir === 'asc' ? '▴' : '▾') : '↕';
  });
}

function filterTable(options = {}) {
  if (options.resetPage) suratPage = 1;
  const q = (document.getElementById('search-input')?.value || '').trim().toLowerCase();
  const st = document.getElementById('filter-status')?.value || '';

  const filtered = allSurat.filter(s => {
    if (st && s.status !== st) return false;
    if (!q) return true;
    const hay = [
      s.perihal,
      s.tujuan,
      s.pembebanan,
      s.nomor_surat,
      (s.pegawai_list || []).join(' '),
      fmtWaktu(s.tanggal_berangkat, s.tanggal_kembali),
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });

  const { col, dir } = suratSortState;
  filtered.sort((a, b) => {
    const av = sortValueSurat(a, col);
    const bv = sortValueSurat(b, col);
    const cmp = (typeof av === 'number' && typeof bv === 'number')
      ? av - bv
      : String(av).localeCompare(String(bv), 'id');
    return dir === 'asc' ? cmp : -cmp;
  });

  filteredSurat = filtered;
  renderSubmittedRows();
}

function renderPagination(totalItems) {
  const pager = document.getElementById('table-pagination');
  if (!pager) return;
  const totalPages = Math.max(1, Math.ceil(totalItems / SURAT_PAGE_SIZE));
  if (suratPage > totalPages) suratPage = totalPages;

  if (totalItems <= SURAT_PAGE_SIZE) {
    pager.hidden = true;
    pager.innerHTML = '';
    return;
  }

  const startIdx = (suratPage - 1) * SURAT_PAGE_SIZE + 1;
  const endIdx = Math.min(totalItems, suratPage * SURAT_PAGE_SIZE);
  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - suratPage) <= 1) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  pager.hidden = false;
  pager.innerHTML = `
    <div class="pager-summary">Menampilkan ${startIdx}–${endIdx} dari ${totalItems} surat</div>
    <div class="pager-actions">
      <button type="button" class="pager-btn pager-nav" onclick="goToSuratPage(${suratPage - 1})" ${suratPage <= 1 ? 'disabled' : ''}>‹ Sebelumnya</button>
      ${pages.map(p => p === '...'
        ? '<span class="pager-gap">…</span>'
        : `<button type="button" class="pager-btn ${p === suratPage ? 'active' : ''}" onclick="goToSuratPage(${p})">${p}</button>`
      ).join('')}
      <button type="button" class="pager-btn pager-nav" onclick="goToSuratPage(${suratPage + 1})" ${suratPage >= totalPages ? 'disabled' : ''}>Berikutnya ›</button>
    </div>
  `;
}

function goToSuratPage(page) {
  const totalPages = Math.max(1, Math.ceil(filteredSurat.length / SURAT_PAGE_SIZE));
  suratPage = Math.min(Math.max(1, page), totalPages);
  renderSubmittedRows();
  document.querySelector('.table-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ════════════════════════════════════════════════════════════════════
   MAK / POK TYPEAHEAD POPUP (sama dengan Admin Surat Tugas)
═══════════════════════════════════════════════════════════════════════ */
let makSuggestions = [];
const makACState = { inputEl: null, cellEl: null, filtered: [], focusIdx: -1, suppressUntil: 0 };

async function loadMAKSuggestions() {
  try {
    const counts = {};
    allSurat.forEach(r => {
      const m = (r.pembebanan || '').trim();
      if (m && typeof parseMAK === 'function' && parseMAK(m)) {
        counts[m] = (counts[m] || 0) + 1;
      }
    });
    makSuggestions = Object.entries(counts)
      .map(([mak, count]) => ({ mak, count, ringkasan: '' }))
      .sort((a, b) => b.count - a.count);

    const tahun = new Date().getFullYear();
    if (typeof loadKamusPok === 'function') {
      await loadKamusPok(tahun).catch(() => {});
    }
    if (typeof lookupDeskripsi === 'function' && typeof parseMAK === 'function') {
      makSuggestions.forEach(s => {
        const mak = parseMAK(s.mak);
        if (!mak) return;
        const parts = [lookupDeskripsi('kegiatan', mak.kegiatan), lookupDeskripsi('akun', mak.akun)].filter(Boolean);
        s.ringkasan = parts.join(' · ');
      });
    }
  } catch (_) {}
}

function positionPopup(popup, anchor) {
  if (!popup || !anchor) return;
  const r = anchor.getBoundingClientRect();
  const pw = popup.offsetWidth || 320;
  const ph = popup.offsetHeight || 240;
  let left = r.left;
  let top = r.bottom + 4;
  if (left + pw > window.innerWidth - 12) left = Math.max(12, window.innerWidth - pw - 12);
  if (top + ph > window.innerHeight - 12) top = Math.max(12, r.top - ph - 4);
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

function onMAKFocus(inp) {
  if (Date.now() < makACState.suppressUntil) return;
  openMakAc(inp);
}

function onMAKBlur() {
  setTimeout(() => {
    const ae = document.activeElement;
    const popup = document.getElementById('mak-ac-popup');
    if (!ae || !popup || !popup.contains(ae)) {
      if (!ae || !ae.classList.contains('mak-input')) closeMakAc();
    }
  }, 150);
}

function onMAKInput(inp) {
  if (Date.now() < makACState.suppressUntil) return;
  makACState.inputEl = inp;
  const popup = document.getElementById('mak-ac-popup');
  if (popup && !popup.classList.contains('open')) openMakAc(inp);
  makAcFilter(inp.value);
}

function onMAKKeydown(e, inp) {
  const popup = document.getElementById('mak-ac-popup');
  const isOpen = popup && popup.classList.contains('open');
  if (e.key === 'Escape') {
    if (isOpen) { e.preventDefault(); closeMakAc(); }
    return;
  }
  if (!isOpen) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      openMakAc(inp);
      makAcFilter(inp.value);
    } else if (e.key === 'Enter') {
      e.preventDefault();
    }
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    makACState.focusIdx = Math.min(makACState.focusIdx + 1, makACState.filtered.length - 1);
    makAcRenderFocus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    makACState.focusIdx = Math.max(makACState.focusIdx - 1, -1);
    makAcRenderFocus();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (makACState.focusIdx >= 0 && makACState.filtered[makACState.focusIdx]) {
      pickMAK(makACState.filtered[makACState.focusIdx].mak);
    }
  } else if (e.key === 'Tab') {
    closeMakAc();
  }
}

function openMakAc(inp) {
  closeCal();
  closeAc();
  makACState.inputEl = inp;
  makACState.cellEl = inp.closest('td');
  makACState.focusIdx = -1;
  const popup = document.getElementById('mak-ac-popup');
  if (!popup) return;
  popup.classList.add('open');
  positionPopup(popup, inp);
  makAcFilter(inp.value);
}

function closeMakAc() {
  const popup = document.getElementById('mak-ac-popup');
  if (popup) popup.classList.remove('open');
  makACState.cellEl = null;
  makACState.inputEl = null;
  makACState.filtered = [];
  makACState.focusIdx = -1;
}

function makAcFilter(q) {
  const term = String(q || '').trim().toLowerCase();
  const list = makSuggestions.filter(s =>
    !term || s.mak.toLowerCase().includes(term) || (s.ringkasan || '').toLowerCase().includes(term)
  ).slice(0, 20);
  makACState.filtered = list;
  makACState.focusIdx = list.length ? 0 : -1;

  const countEl = document.getElementById('mak-ac-count');
  if (countEl) countEl.textContent = list.length ? `${list.length} saran` : '';
  const listEl = document.getElementById('mak-ac-list');
  if (!listEl) return;

  if (!list.length) {
    listEl.innerHTML = `<div class="mak-ac-empty">${makSuggestions.length ? 'Tidak ada POK cocok' : 'Ketik kode MAK pembebanan'}</div>`;
    return;
  }
  listEl.innerHTML = list.map((s, i) => `
    <div class="mak-ac-item ${i === makACState.focusIdx ? 'focused' : ''}" data-idx="${i}" onmousedown="event.preventDefault(); pickMAK('${escAttr(s.mak)}')">
      <div class="mak-ac-code">${esc(s.mak)}</div>
      ${s.ringkasan ? `<div class="mak-ac-desc">${esc(s.ringkasan)}</div>` : ''}
    </div>
  `).join('');
}

function makAcRenderFocus() {
  const items = document.querySelectorAll('#mak-ac-list .mak-ac-item');
  items.forEach((el, i) => {
    el.classList.toggle('focused', i === makACState.focusIdx);
    if (i === makACState.focusIdx) el.scrollIntoView({ block: 'nearest' });
  });
}

function pickMAK(mak) {
  const inp = makACState.inputEl;
  if (inp) {
    inp.value = mak;
    autoGrow(inp);
    inp.classList.remove('err');
    makACState.suppressUntil = Date.now() + 250;
    snapshotDraft();
  }
  closeMakAc();
}

/* ════════════════════════════════════════════════════════════════════
   CELL BUILDERS (9 Kolom — desain & perlakuan sama dengan Admin)
═══════════════════════════════════════════════════════════════════════ */
function cellTextareaHTML(field, val, placeholder, colClass) {
  return `<td class="col-${colClass || field}">
    <textarea class="xls-cell" rows="1" data-field="${field}" data-col-field="${field}"
      placeholder="${escAttr(placeholder)}">${esc(val || '')}</textarea>
  </td>`;
}

function cellDateRangeHTML(isoMulai, isoSelesai, waktuTextCustom) {
  const display = waktuTextCustom || (isoMulai ? fmtWaktu(isoMulai, isoSelesai) : '');
  return `<td class="col-waktu">
    <textarea class="xls-cell" rows="1" data-field="waktu" data-col-field="waktu"
      data-iso-mulai="${escAttr(isoMulai || '')}"
      data-iso-selesai="${escAttr(isoSelesai || '')}"
      data-waktu-text-custom="${escAttr(waktuTextCustom || '')}"
      placeholder="tgl atau rentang"
      onblur="onRangeBlur(this)"
      onfocus="onDateFocus(this)"
      onclick="openCal(this, true)"
      ondblclick="openCal(this, true)"
      onkeydown="if(event.altKey&&event.key==='ArrowDown'){event.preventDefault();openCal(this,true);}">${esc(display)}</textarea>
  </td>`;
}

function cellPegawaiMultiHTML(nips, names, roles, editable) {
  nips = Array.isArray(nips) ? nips : [];
  names = Array.isArray(names) ? names : [];
  roles = Array.isArray(roles) ? roles : [];

  if (!editable) {
    if (!names.length) {
      return `<td class="col-nama"><div class="ro-text muted" tabindex="0" data-col-field="pegawai_multi">—</div></td>`;
    }
    if (names.length > 1) {
      return `<td class="col-nama">
        <div class="ro-text" tabindex="0" data-col-field="pegawai_multi">
          <span class="apa-pg-badge-terlampir" title="Klik untuk melihat petugas terlampir"
            data-nips='${escAttr(JSON.stringify(nips))}'
            data-names='${escAttr(JSON.stringify(names))}'
            data-roles='${escAttr(JSON.stringify(roles))}'
            onclick="event.stopPropagation(); window.apaPegawai.openPreview(this)">
            Terlampir
            <span class="count-pill">${names.length}</span>
          </span>
        </div>
      </td>`;
    }
    return `<td class="col-nama"><div class="ro-text" tabindex="0" data-col-field="pegawai_multi">${esc(names[0])}</div></td>`;
  }

  let contentHtml = '';
  if (!nips.length) {
    contentHtml = `<span class="apa-pg-placeholder">Pilih pegawai / mitra...</span>`;
  } else if (nips.length === 1) {
    const nama = names[0] || nips[0];
    contentHtml = `<span class="apa-pg-single-name" title="${escAttr(nama)}">${esc(nama)}</span>`;
  } else {
    contentHtml = `<span class="apa-pg-badge-terlampir" title="${escAttr(names.join(', '))}">
      Terlampir
      <span class="count-pill">${nips.length}</span>
    </span>`;
  }

  return `<td class="col-nama">
    <div class="pg-cell" data-field="pegawai_multi" data-col-field="pegawai_multi"
      tabindex="0"
      data-nips='${escAttr(JSON.stringify(nips))}'
      data-names='${escAttr(JSON.stringify(names))}'
      data-roles='${escAttr(JSON.stringify(roles))}'
      onclick="openAc(this, false)">
      <div class="apa-pg-cell-wrapper">${contentHtml}</div>
    </div>
  </td>`;
}

function cellMAKHTML(val, editable) {
  if (!editable) {
    return `<td class="col-mak"><div class="ro-text${val ? '' : ' muted'}" tabindex="0" data-col-field="pembebanan">${val ? esc(val) : '—'}</div></td>`;
  }
  return `<td class="col-mak">
    <textarea class="xls-cell mak-input" rows="1" data-field="pembebanan" data-col-field="pembebanan"
      placeholder="cth: 054.01.GG.2910..."
      oninput="onMAKInput(this)"
      onfocus="onMAKFocus(this)"
      onblur="onMAKBlur(this)"
      onkeydown="onMAKKeydown(event, this)"
      autocomplete="off">${esc(val || '')}</textarea>
  </td>`;
}

function roCell(colClass, field, val) {
  const isEmpty = !val;
  return `<td class="col-${colClass}"><div class="ro-text${isEmpty ? ' muted' : ''}" tabindex="0" data-col-field="${field}">${isEmpty ? '—' : esc(val)}</div></td>`;
}

/* ════════════════════════════════════════════════════════════════════
   RENDER BARIS (Draft, Menunggu [Readonly / Inline Edit], Selesai)
═══════════════════════════════════════════════════════════════════════ */
function renderDraftRowHTML(id) {
  return `<tr class="draft-row" data-row-id="${id}">
    <td class="col-check"><input type="checkbox" class="bulk-check ck-success" onchange="onRowCheck(this)" title="Pilih untuk dikirim"></td>
    <td class="col-no">—</td>
    ${cellTextareaHTML('perihal', '', 'Perihal surat tugas…', 'perihal')}
    ${cellDateRangeHTML('', '', '')}
    ${cellTextareaHTML('tujuan', '', 'Kota / instansi', 'tujuan')}
    ${cellPegawaiMultiHTML([], [], [], true)}
    ${cellMAKHTML('', true)}
    <td class="col-aksi">
      <div class="aksi-wrap">
        <button class="btn-approve" type="button" onclick="submitSingleRow(this)" title="Kirim pengajuan ini">
          <img src="Assets/checked.png" class="btn-action-icon" alt=""> Kirim
        </button>
        <button class="btn-duplicate btn-icon" type="button" onclick="duplicateDraftRow(this)" title="Duplikat baris draft">
          <img src="Assets/copy.png" class="btn-action-icon" alt="Duplikat">
        </button>
        <button class="btn-batal-selesai btn-icon delete-draft-row" type="button" title="Hapus baris draft">✕</button>
      </div>
    </td>
    <td class="col-status"><div class="ro-text" tabindex="0" data-col-field="status">${badgeHTML('draft')}</div></td>
  </tr>`;
}

function renderSubmittedRowHTML(s) {
  suratMap[s.id] = s;
  const urutNo = suratOrderMap[s.id] || '—';
  const isSelesai = s.status === 'selesai';
  const isEditing = !isSelesai && String(editingSuratId) === String(s.id);
  const nips = Array.isArray(s.pegawai_nip) ? s.pegawai_nip : [];
  const names = Array.isArray(s.pegawai_list) ? s.pegawai_list : [];
  const roles = Array.isArray(s.bertugas_sebagai) ? s.bertugas_sebagai : [];

  const checkCell = isSelesai
    ? `<input type="checkbox" class="bulk-dl-check ck-gold" data-surat-id="${escAttr(s.id)}" onchange="updateBulkDownloadCounter()" title="Pilih untuk download .docx">`
    : '';

  if (isEditing) {
    return `<tr class="submitted-row" data-surat-id="${escAttr(s.id)}" data-status="${escAttr(s.status)}" data-editing="1">
      <td class="col-check"></td>
      <td class="col-no" data-fixed-no="1">${urutNo}</td>
      ${cellTextareaHTML('perihal', s.perihal || '', 'Perihal surat tugas…', 'perihal')}
      ${cellDateRangeHTML(s.tanggal_berangkat || '', s.tanggal_kembali || '', s.waktu_pelaksanaan_text || '')}
      ${cellTextareaHTML('tujuan', s.tujuan || '', 'Kota / instansi', 'tujuan')}
      ${cellPegawaiMultiHTML(nips, names, roles, true)}
      ${cellMAKHTML(s.pembebanan || '', true)}
      <td class="col-aksi">
        <div class="aksi-wrap">
          <button class="btn-save-edit" type="button" id="btn-save-edit-${escAttr(s.id)}" onclick="saveRowEdit(${escAttr(jsArg(s.id))})" title="Simpan perubahan">
            <img src="Assets/checked.png" class="btn-action-icon" alt=""> Simpan
          </button>
          <button class="btn-cancel-edit btn-icon" type="button" onclick="cancelRowEdit()" title="Batal edit">
            <img src="Assets/undo.png" class="btn-action-icon" alt="Batal">
          </button>
        </div>
      </td>
      <td class="col-status"><div class="ro-text" tabindex="0" data-col-field="status">${badgeHTML(s.status)}</div></td>
    </tr>`;
  }

  const waktuDisplay = (s.waktu_pelaksanaan_text && s.waktu_pelaksanaan_text.trim())
    ? s.waktu_pelaksanaan_text
    : fmtWaktu(s.tanggal_berangkat, s.tanggal_kembali);

  let aksiHTML = '';
  if (isSelesai) {
    aksiHTML = `
      <button class="btn-preview btn-icon" type="button" onclick="openPreview(${escAttr(jsArg(s.id))})" title="Preview surat tugas (.docx)">
        <img src="Assets/preview.png" class="btn-action-icon" alt="Preview">
      </button>
      <button class="btn-download btn-icon" type="button" onclick="downloadSuratTugas(${escAttr(jsArg(s.id))})" title="Download dokumen (.docx)">
        <img src="Assets/paper.png" class="btn-action-icon" alt="Download">
      </button>
      <button class="btn-duplicate btn-icon" type="button" onclick="duplicateSubmittedSurat(${escAttr(jsArg(s.id))})" title="Duplikat surat tugas">
        <img src="Assets/copy.png" class="btn-action-icon" alt="Duplikat">
      </button>
    `;
  } else {
    aksiHTML = `
      <button class="btn-edit-row btn-icon" type="button" onclick="enterRowEdit(${escAttr(jsArg(s.id))})" title="Edit pengajuan">✏️</button>
      <button class="btn-duplicate btn-icon" type="button" onclick="duplicateSubmittedSurat(${escAttr(jsArg(s.id))})" title="Duplikat surat tugas">
        <img src="Assets/copy.png" class="btn-action-icon" alt="Duplikat">
      </button>
      <button class="btn-batal-selesai btn-icon" type="button" onclick="deleteSubmittedSurat(${escAttr(jsArg(s.id))})" title="Hapus pengajuan">🗑️</button>
    `;
  }

  return `<tr class="submitted-row" data-surat-id="${escAttr(s.id)}" data-status="${escAttr(s.status || '')}">
    <td class="col-check">${checkCell}</td>
    <td class="col-no" data-fixed-no="1">${urutNo}</td>
    ${roCell('perihal', 'perihal', s.perihal)}
    ${roCell('waktu', 'waktu', waktuDisplay)}
    ${roCell('tujuan', 'tujuan', s.tujuan)}
    ${cellPegawaiMultiHTML(nips, names, roles, false)}
    ${roCell('mak', 'pembebanan', s.pembebanan)}
    <td class="col-aksi"><div class="aksi-wrap">${aksiHTML}</div></td>
    <td class="col-status"><div class="ro-text" tabindex="0" data-col-field="status">${badgeHTML(s.status)}</div></td>
  </tr>`;
}

function renderSubmittedRows() {
  const tbody = document.getElementById('bulk-tbody');
  if (!tbody) return;

  // Hapus hanya baris submitted & skeleton, pertahankan baris draft yang sedang diketik
  tbody.querySelectorAll('tr:not([data-row-id])').forEach(tr => tr.remove());

  const totalItems = filteredSurat.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / SURAT_PAGE_SIZE));
  if (suratPage > totalPages) suratPage = totalPages;
  const start = (suratPage - 1) * SURAT_PAGE_SIZE;
  const pageItems = filteredSurat.slice(start, start + SURAT_PAGE_SIZE);

  if (pageItems.length) {
    tbody.insertAdjacentHTML('beforeend', pageItems.map(renderSubmittedRowHTML).join(''));
    tbody.querySelectorAll('tr[data-editing="1"]').forEach(wireEditableRow);
  } else if (!tbody.querySelector('tr[data-row-id]')) {
    tbody.insertAdjacentHTML('beforeend', `<tr><td colspan="9"><div class="table-empty"><div class="table-empty-icon">📭</div><div class="table-empty-text">Belum ada surat tugas yang sesuai filter.</div></div></td></tr>`);
  }

  const countEl = document.getElementById('table-count');
  if (countEl) countEl.textContent = `${totalItems} surat`;

  refreshSortHeaders();
  reNumberRows();
  renderPagination(totalItems);
  updateBulkCounters();
  if (typeof updateBulkDownloadCounter === 'function') updateBulkDownloadCounter();
  autoGrowAll(tbody);
  requestAnimationFrame(() => {
    setupTopScrollbar();
    syncStickyColsHeader();
  });
}

function replaceRowInPlace(id, updatedFields) {
  const existing = suratMap[id];
  if (!existing) return false;
  const updated = { ...existing, ...updatedFields };
  suratMap[id] = updated;
  const idx = allSurat.findIndex(x => String(x.id) === String(id));
  if (idx >= 0) allSurat[idx] = updated;
  const fIdx = filteredSurat.findIndex(x => String(x.id) === String(id));
  if (fIdx >= 0) filteredSurat[fIdx] = updated;

  const oldRow = document.querySelector(`tr[data-surat-id="${id}"]`);
  if (oldRow) {
    const tmp = document.createElement('tbody');
    tmp.innerHTML = renderSubmittedRowHTML(updated);
    const newRow = tmp.firstElementChild;
    if (newRow) {
      oldRow.replaceWith(newRow);
      if (newRow.dataset.editing === '1') wireEditableRow(newRow);
      autoGrowAll(newRow);
    }
  }
  updateStats();
  if (typeof updateBulkDownloadCounter === 'function') updateBulkDownloadCounter();
  return true;
}

/* ════════════════════════════════════════════════════════════════════
   INLINE EDIT BARIS MENUNGGU (hak edit pegawai sendiri)
═══════════════════════════════════════════════════════════════════════ */
function enterRowEdit(id) {
  if (editingSuratId && String(editingSuratId) !== String(id)) {
    const prevId = editingSuratId;
    editingSuratId = null;
    replaceRowInPlace(prevId, {});
  }
  const s = suratMap[id];
  if (!s || s.status !== 'menunggu') return;
  editingSuratId = id;
  replaceRowInPlace(id, {});
  const row = document.querySelector(`tr[data-surat-id="${id}"]`);
  if (row) {
    const first = row.querySelector('textarea.xls-cell[data-field="perihal"]');
    if (first) first.focus();
  }
}

function cancelRowEdit() {
  if (!editingSuratId) return;
  const prevId = editingSuratId;
  editingSuratId = null;
  closeAllPopups();
  replaceRowInPlace(prevId, {});
}

async function saveRowEdit(id) {
  if (_rowActionInFlight.has(`edit:${id}`)) return;
  const tr = document.querySelector(`tr[data-surat-id="${id}"]`);
  if (!tr) return;

  const data = collectRow(tr);
  const errs = validateRow(data);
  if (errs.length) {
    showPageAlert('Periksa kembali: ' + errs.join('; '), 'error');
    return;
  }

  const payload = {
    perihal: data.perihal,
    tanggal_berangkat: data.waktuMulai,
    tanggal_kembali: (data.waktuSelesai && data.waktuSelesai !== data.waktuMulai) ? data.waktuSelesai : null,
    waktu_pelaksanaan_text: data.waktuTextCustom || null,
    tujuan: data.tujuan,
    pegawai_nip: data.nips,
    pegawai_list: data.names,
    bertugas_sebagai: data.roles.some(v => v && v.trim()) ? data.roles : null,
    pembebanan: data.pembebanan || null,
  };

  _rowActionInFlight.add(`edit:${id}`);
  const btn = document.getElementById(`btn-save-edit-${id}`);
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }
  try {
    const url = `${SUPABASE_URL}/rest/v1/surat_tugas?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(SESSION.id)}&status=eq.menunggu`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { ...H, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    const updatedRows = await res.json().catch(() => []);
    if (!Array.isArray(updatedRows) || !updatedRows.length) {
      throw new Error('Tidak dapat menyimpan perubahan. Pastikan surat masih berstatus Menunggu dan policy RLS sudah diperbarui.');
    }
    editingSuratId = null;
    closeAllPopups();
    replaceRowInPlace(id, updatedRows[0] || payload);
    loadMAKSuggestions();
    showPageAlert('✅ Perubahan pengajuan surat tugas berhasil disimpan.', 'success');
  } catch (e) {
    showPageAlert(`Gagal menyimpan perubahan: ${e.message}`, 'error');
  } finally {
    _rowActionInFlight.delete(`edit:${id}`);
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
  }
}

/* ════════════════════════════════════════════════════════════════════
   DATE, CALENDAR, PEGAWAI & GRID NAVIGATION
═══════════════════════════════════════════════════════════════════════ */
function onDateFocus(el) {
  const mulai = el.dataset.isoMulai || '';
  if (mulai && !el.dataset.waktuTextCustom) {
    const d = parseISODate(mulai);
    if (d && !el.dataset.isoSelesai) {
      el.value = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    }
  }
  setTimeout(() => el.select(), 0);
}

function onRangeBlur(el) {
  const cal = document.getElementById('cal-popup');
  if (cal && cal.classList.contains('open')) return;
  const txt = el.value.trim();
  if (!txt) {
    el.dataset.isoMulai = '';
    el.dataset.isoSelesai = '';
    el.dataset.waktuTextCustom = '';
    el.value = '';
    el.classList.remove('err');
    autoGrow(el);
    return;
  }
  if (el.dataset.waktuTextCustom && txt === el.dataset.waktuTextCustom) {
    el.classList.remove('err');
    return;
  }
  if (el.dataset.isoMulai && txt === fmtWaktu(el.dataset.isoMulai, el.dataset.isoSelesai || '')) {
    el.classList.remove('err');
    return;
  }
  const r = parseFlexRange(txt);
  if (r.mulai) {
    el.dataset.isoMulai = r.mulai;
    el.dataset.isoSelesai = r.selesai || '';
    el.dataset.waktuTextCustom = '';
    el.value = fmtWaktu(r.mulai, r.selesai);
    el.classList.remove('err');
    autoGrow(el);
  } else if (el.dataset.isoMulai) {
    el.value = el.dataset.waktuTextCustom || fmtWaktu(el.dataset.isoMulai, el.dataset.isoSelesai || '');
    el.classList.remove('err');
    autoGrow(el);
  } else {
    el.classList.add('err');
  }
}

function openCal(el, isRange) {
  closeAc();
  closeMakAc();
  if (window.apaCalendar) window.apaCalendar.open(el, isRange);
}

function closeCal() {
  if (window.apaCalendar) window.apaCalendar.close();
}

function openAc(cellEl, isSingle) {
  closeCal();
  closeMakAc();
  if (window.apaPegawai) {
    window.apaPegawai.open(cellEl, isSingle, () => {
      cellEl.classList.remove('err');
      if (cellEl.closest('tr[data-row-id]')) snapshotDraft();
    });
  }
}

function closeAc() {
  if (window.apaPegawai) window.apaPegawai.close();
}

function closeAllPopups() {
  closeCal();
  closeAc();
  closeMakAc();
}

const NAV_FIELDS = ['perihal', 'waktu', 'tujuan', 'pegawai_multi', 'pembebanan', 'status'];
if (window.apaGridNav) {
  window.apaGridNav.init({
    rowSelector: '#bulk-tbody tr',
    fields: NAV_FIELDS,
    onClearCell: function (cellTarget) {
      if (cellTarget.classList.contains('pg-cell')) {
        cellTarget.dataset.nips = '[]';
        cellTarget.dataset.names = '[]';
        cellTarget.dataset.roles = '[]';
        if (window.apaPegawai) window.apaPegawai.renderCell(cellTarget, [], [], []);
        if (cellTarget.closest('tr[data-row-id]')) snapshotDraft();
      }
    },
    onOpenCell: function (cellTarget) {
      if (cellTarget.classList.contains('pg-cell')) openAc(cellTarget, false);
    },
    onClosePopups: closeAllPopups,
    closeModals: function () {
      closeModal('modal-preview');
    },
  });
}

document.addEventListener('click', (e) => {
  const ac = document.getElementById('apa-pegawai-popup');
  if (ac && ac.classList.contains('open') && !ac.contains(e.target) && !e.target.closest('.pg-cell')) {
    closeAc();
  }
  const makPop = document.getElementById('mak-ac-popup');
  if (makPop && makPop.classList.contains('open') && !makPop.contains(e.target) && !e.target.closest('.mak-input')) {
    closeMakAc();
  }
});

/* ════════════════════════════════════════════════════════════════════
   DRAFT PERSIST (localStorage per-user) & ROW MANAGEMENT
═══════════════════════════════════════════════════════════════════════ */
function getDraftStorageKey() {
  let uid = 'anon';
  try {
    const s = (SESSION && SESSION.id) ? SESSION : JSON.parse(localStorage.getItem('apa_user') || 'null');
    if (s && s.id) uid = String(s.id);
  } catch (_) {}
  return `apa_st_draft_${uid}`;
}

function snapshotDraft() {
  const rows = Array.from(document.querySelectorAll('#bulk-tbody tr[data-row-id]')).map(tr => {
    const peg = tr.querySelector('.pg-cell[data-field="pegawai_multi"]');
    let nips = [], names = [], roles = [];
    try { nips = JSON.parse(peg?.dataset.nips || '[]'); } catch (_) {}
    try { names = JSON.parse(peg?.dataset.names || '[]'); } catch (_) {}
    try { roles = JSON.parse(peg?.dataset.roles || '[]'); } catch (_) {}
    const waktu = tr.querySelector('.xls-cell[data-field="waktu"]');
    const waktuCustom = waktu?.dataset.waktuTextCustom || (waktu?.value && waktu.value.includes('&') ? waktu.value : '');
    return {
      perihal: tr.querySelector('textarea.xls-cell[data-field="perihal"]')?.value || '',
      tujuan: tr.querySelector('textarea.xls-cell[data-field="tujuan"]')?.value || '',
      pembebanan: tr.querySelector('.xls-cell[data-field="pembebanan"]')?.value || '',
      waktuMulai: waktu?.dataset.isoMulai || '',
      waktuSelesai: waktu?.dataset.isoSelesai || '',
      waktuCustom,
      nips,
      names,
      roles,
    };
  });
  const filled = rows.filter(r => r.perihal || r.tujuan || r.pembebanan || r.waktuMulai || r.waktuCustom || r.nips.length);
  try {
    if (filled.length) {
      localStorage.setItem(getDraftStorageKey(), JSON.stringify({ version: 1, savedAt: Date.now(), rows: filled }));
    } else {
      localStorage.removeItem(getDraftStorageKey());
    }
  } catch (_) {}
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(getDraftStorageKey());
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return (obj && Array.isArray(obj.rows) && obj.rows.length) ? obj : null;
  } catch (_) { return null; }
}

function restoreDraft() {
  const draft = loadDraft();
  if (!draft) return;
  const tbody = document.getElementById('bulk-tbody');
  tbody.querySelectorAll('tr[data-row-id]').forEach(tr => tr.remove());
  addRows(draft.rows.length);
  const trs = Array.from(document.querySelectorAll('#bulk-tbody tr[data-row-id]'));
  draft.rows.forEach((r, i) => {
    const tr = trs[i];
    if (!tr) return;
    const perihalEl = tr.querySelector('textarea.xls-cell[data-field="perihal"]');
    const tujuanEl = tr.querySelector('textarea.xls-cell[data-field="tujuan"]');
    const waktuEl = tr.querySelector('.xls-cell[data-field="waktu"]');
    const pokEl = tr.querySelector('.xls-cell[data-field="pembebanan"]');
    const pegCell = tr.querySelector('.pg-cell[data-field="pegawai_multi"]');

    if (perihalEl) { perihalEl.value = r.perihal || ''; autoGrow(perihalEl); }
    if (tujuanEl) { tujuanEl.value = r.tujuan || ''; autoGrow(tujuanEl); }
    if (pokEl) { pokEl.value = r.pembebanan || ''; autoGrow(pokEl); }
    if (waktuEl) {
      waktuEl.dataset.isoMulai = r.waktuMulai || '';
      waktuEl.dataset.isoSelesai = r.waktuSelesai || '';
      waktuEl.dataset.waktuTextCustom = r.waktuCustom || '';
      waktuEl.value = r.waktuCustom || (r.waktuMulai ? fmtWaktu(r.waktuMulai, r.waktuSelesai) : '');
      autoGrow(waktuEl);
    }
    if (pegCell && Array.isArray(r.nips) && r.nips.length) {
      if (window.apaPegawai) {
        window.apaPegawai.renderCell(pegCell, r.nips, r.names || [], r.roles || []);
      } else {
        pegCell.dataset.nips = JSON.stringify(r.nips);
        pegCell.dataset.names = JSON.stringify(r.names || []);
        pegCell.dataset.roles = JSON.stringify(r.roles || []);
      }
    }
  });
  reNumberRows();
  updateBulkCounters();
}

function wireEditableRow(tr) {
  if (!tr || tr.dataset.wired === '1') return;
  tr.dataset.wired = '1';
  const isDraft = tr.hasAttribute('data-row-id');
  const delBtn = tr.querySelector('.delete-draft-row');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      deleteRow(tr);
      snapshotDraft();
    });
  }
  tr.querySelectorAll('textarea.xls-cell').forEach(ta => {
    autoGrow(ta);
    ta.addEventListener('input', () => { autoGrow(ta); ta.classList.remove('err'); });
    if (isDraft) {
      ta.addEventListener('paste', handlePaste);
      ta.addEventListener('blur', snapshotDraft);
    }
  });
  const pegCell = tr.querySelector('.pg-cell[data-field="pegawai_multi"]');
  if (pegCell && isDraft) {
    const obs = new MutationObserver(() => snapshotDraft());
    obs.observe(pegCell, { attributes: true, attributeFilter: ['data-nips', 'data-roles'] });
    tr._pgObserver = obs;
  }
}

function fillDraftRow(tr, src) {
  if (!tr || !src) return;
  const perihalEl = tr.querySelector('textarea.xls-cell[data-field="perihal"]');
  const tujuanEl = tr.querySelector('textarea.xls-cell[data-field="tujuan"]');
  const waktuEl = tr.querySelector('.xls-cell[data-field="waktu"]');
  const pokEl = tr.querySelector('.xls-cell[data-field="pembebanan"]');
  const pegCell = tr.querySelector('.pg-cell[data-field="pegawai_multi"]');

  if (perihalEl) { perihalEl.value = src.perihal || ''; autoGrow(perihalEl); }
  if (tujuanEl) { tujuanEl.value = src.tujuan || ''; autoGrow(tujuanEl); }
  if (pokEl) { pokEl.value = src.pembebanan || ''; autoGrow(pokEl); }
  if (waktuEl) {
    const mulai = src.waktuMulai || src.tanggal_berangkat || '';
    const selesai = src.waktuSelesai || src.tanggal_kembali || '';
    const custom = src.waktuCustom || src.waktu_pelaksanaan_text || '';
    waktuEl.dataset.isoMulai = mulai;
    waktuEl.dataset.isoSelesai = selesai;
    waktuEl.dataset.waktuTextCustom = custom;
    waktuEl.value = custom || (mulai ? fmtWaktu(mulai, selesai) : '');
    autoGrow(waktuEl);
  }
  const nips = Array.isArray(src.nips) ? src.nips : (Array.isArray(src.pegawai_nip) ? src.pegawai_nip : []);
  const names = Array.isArray(src.names) ? src.names : (Array.isArray(src.pegawai_list) ? src.pegawai_list : []);
  const roles = Array.isArray(src.roles) ? src.roles : (Array.isArray(src.bertugas_sebagai) ? src.bertugas_sebagai : []);
  if (pegCell && nips.length) {
    if (window.apaPegawai) {
      window.apaPegawai.renderCell(pegCell, nips, names, roles);
    } else {
      pegCell.dataset.nips = JSON.stringify(nips);
      pegCell.dataset.names = JSON.stringify(names);
      pegCell.dataset.roles = JSON.stringify(roles);
    }
  }
}

function duplicateDraftRow(btn) {
  const tr = btn?.closest('tr[data-row-id]');
  if (!tr) return;
  const src = collectRow(tr);
  addRows(1);
  const newTr = document.querySelector('#bulk-tbody tr[data-row-id]');
  fillDraftRow(newTr, src);
  snapshotDraft();
}

function duplicateSubmittedSurat(id) {
  const s = suratMap[id];
  if (!s) return;
  addRows(1);
  const newTr = document.querySelector('#bulk-tbody tr[data-row-id]');
  fillDraftRow(newTr, s);
  snapshotDraft();
  newTr?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function addRows(n) {
  const tbody = document.getElementById('bulk-tbody');
  if (!tbody) return;
  // Hapus empty state jika ada
  const emptyTd = tbody.querySelector('td[colspan]');
  if (emptyTd) emptyTd.closest('tr')?.remove();

  for (let i = 0; i < n; i++) {
    rowIdCounter++;
    tbody.insertAdjacentHTML('afterbegin', renderDraftRowHTML(rowIdCounter));
  }
  tbody.querySelectorAll('tr[data-row-id]:not([data-wired])').forEach(wireEditableRow);
  reNumberRows();
  updateBulkCounters();
  setupTopScrollbar();
  const firstInput = tbody.querySelector('tr[data-row-id] textarea.xls-cell[data-field="perihal"]');
  if (firstInput && n === 1) firstInput.focus();
}

function deleteRow(tr) {
  if (!tr) return;
  if (tr._pgObserver) { tr._pgObserver.disconnect(); tr._pgObserver = null; }
  closeAllPopups();
  tr.remove();
  reNumberRows();
  syncCheckAll();
  updateBulkCounters();
  setupTopScrollbar();
}

function onRowCheck(chk) {
  const tr = chk.closest('tr');
  if (tr) tr.classList.toggle('checked', chk.checked);
  syncCheckAll();
  updateBulkCounters();
}

function toggleCheckAll(checked) {
  document.querySelectorAll('#bulk-tbody tr[data-row-id]').forEach(tr => {
    const chk = tr.querySelector('.bulk-check');
    if (chk) chk.checked = checked;
    tr.classList.toggle('checked', checked);
  });
  updateBulkCounters();
}

function syncCheckAll() {
  const trs = document.querySelectorAll('#bulk-tbody tr[data-row-id]');
  const checkedCount = document.querySelectorAll('#bulk-tbody tr[data-row-id] .bulk-check:checked').length;
  const master = document.getElementById('bulk-send-master');
  if (!master) return;
  master.checked = trs.length > 0 && checkedCount === trs.length;
  master.indeterminate = checkedCount > 0 && checkedCount < trs.length;
}

function updateBulkCounters() {
  const checked = document.querySelectorAll('#bulk-tbody tr[data-row-id] .bulk-check:checked').length;
  const btn = document.getElementById('btn-send');
  const badge = document.getElementById('bulk-send-badge');
  if (btn) {
    btn.disabled = checked === 0;
    btn.title = checked === 0 ? 'Pilih baris draft yang ingin dikirim' : `Kirim ${checked} pengajuan terpilih`;
  }
  if (badge) {
    badge.style.display = checked > 0 ? 'inline-flex' : 'none';
    badge.textContent = checked;
  }
}

function reNumberRows() {
  const rows = document.querySelectorAll('#bulk-tbody tr[data-row-id]');
  const total = rows.length;
  const base = allSurat.length;
  rows.forEach((tr, i) => {
    const td = tr.querySelector('td.col-no');
    if (td) td.textContent = base + total - i;
  });
}

/* ════════════════════════════════════════════════════════════════════
   COPY-PASTE DARI EXCEL (Tab-separated)
═══════════════════════════════════════════════════════════════════════ */
function handlePaste(e) {
  const text = e.clipboardData?.getData('text') || '';
  if (!text.includes('\t') && !text.includes('\n')) return;
  e.preventDefault();
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  const startTr = e.target.closest('tr[data-row-id]');
  if (!startTr) return;
  const allTrs = Array.from(document.querySelectorAll('#bulk-tbody tr[data-row-id]'));
  const startIdx = allTrs.indexOf(startTr);

  lines.forEach((line, li) => {
    const cells = line.split('\t');
    let tr = allTrs[startIdx + li];
    if (!tr) {
      addRows(1);
      const refreshed = Array.from(document.querySelectorAll('#bulk-tbody tr[data-row-id]'));
      tr = refreshed[0];
      if (tr) allTrs.push(tr);
    }
    const perihalEl = tr.querySelector('textarea.xls-cell[data-field="perihal"]');
    const waktuEl = tr.querySelector('.xls-cell[data-field="waktu"]');
    const tujuanEl = tr.querySelector('textarea.xls-cell[data-field="tujuan"]');
    const pokEl = tr.querySelector('.xls-cell[data-field="pembebanan"]');
    if (perihalEl && cells[0] !== undefined) { perihalEl.value = cells[0].trim(); autoGrow(perihalEl); }
    if (waktuEl && cells[1] !== undefined) {
      const t = cells[1].trim();
      const r = parseFlexRange(t);
      if (r.mulai) {
        waktuEl.dataset.isoMulai = r.mulai;
        waktuEl.dataset.isoSelesai = r.selesai || '';
        waktuEl.value = fmtWaktu(r.mulai, r.selesai);
        waktuEl.classList.remove('err');
      } else if (t) {
        waktuEl.value = t;
        waktuEl.classList.add('err');
      }
      autoGrow(waktuEl);
    }
    if (tujuanEl && cells[2] !== undefined) { tujuanEl.value = cells[2].trim(); autoGrow(tujuanEl); }
    if (pokEl && cells[3] !== undefined) { pokEl.value = cells[3].trim(); autoGrow(pokEl); }
  });
  reNumberRows();
  updateBulkCounters();
  snapshotDraft();
}

/* ════════════════════════════════════════════════════════════════════
   COLLECT, VALIDATE, SUBMIT & DELETE
═══════════════════════════════════════════════════════════════════════ */
function collectRow(tr) {
  const perihalEl = tr.querySelector('textarea.xls-cell[data-field="perihal"]');
  const tujuanEl = tr.querySelector('textarea.xls-cell[data-field="tujuan"]');
  const waktuEl = tr.querySelector('.xls-cell[data-field="waktu"]');
  const pokEl = tr.querySelector('.xls-cell[data-field="pembebanan"]');
  const pegCell = tr.querySelector('.pg-cell[data-field="pegawai_multi"]');
  const waktuTextCustom = waktuEl
    ? (waktuEl.dataset.waktuTextCustom || (waktuEl.value && waktuEl.value.includes('&') ? waktuEl.value.trim() : ''))
    : '';
  let nips = [], names = [], roles = [];
  try { nips = JSON.parse(pegCell?.dataset.nips || '[]'); } catch (_) {}
  try { names = JSON.parse(pegCell?.dataset.names || '[]'); } catch (_) {}
  try { roles = JSON.parse(pegCell?.dataset.roles || '[]'); } catch (_) {}
  return {
    tr,
    perihal: (perihalEl?.value || '').trim(),
    tujuan: (tujuanEl?.value || '').trim(),
    pembebanan: (pokEl?.value || '').trim(),
    waktuMulai: waktuEl?.dataset.isoMulai || '',
    waktuSelesai: waktuEl?.dataset.isoSelesai || '',
    waktuTextCustom,
    waktuEl, perihalEl, tujuanEl, pokEl, pegCell,
    nips, names, roles,
  };
}

function validateRow(data) {
  const errs = [];
  [data.perihalEl, data.tujuanEl, data.waktuEl].forEach(el => el?.classList.remove('err'));
  data.pegCell?.classList.remove('err');
  if (!data.perihal) { errs.push('Perihal wajib diisi'); data.perihalEl?.classList.add('err'); }
  if (!data.waktuMulai) { errs.push('Waktu pelaksanaan wajib diisi'); data.waktuEl?.classList.add('err'); }
  if (data.waktuSelesai && data.waktuMulai && data.waktuSelesai < data.waktuMulai) {
    errs.push('Tanggal selesai lebih awal dari mulai');
    data.waktuEl?.classList.add('err');
  }
  if (!data.nips.length) { errs.push('Pilih minimal satu pegawai'); data.pegCell?.classList.add('err'); }
  data.tr.classList.toggle('has-error', errs.length > 0);
  return errs;
}

function submitSingleRow(btn) {
  const tr = btn?.closest('tr[data-row-id]');
  if (!tr) return;
  document.querySelectorAll('#bulk-tbody tr[data-row-id] .bulk-check').forEach(chk => {
    chk.checked = false;
    chk.closest('tr')?.classList.remove('checked');
  });
  const chk = tr.querySelector('.bulk-check');
  if (chk) { chk.checked = true; onRowCheck(chk); }
  submitChecked();
}

async function submitChecked() {
  if (_rowActionInFlight.has('submit-checked')) return;
  const checkedTrs = Array.from(document.querySelectorAll('#bulk-tbody tr[data-row-id]'))
    .filter(tr => tr.querySelector('.bulk-check')?.checked);
  if (!checkedTrs.length) return;

  const datas = checkedTrs.map(collectRow);
  const allErrs = [];
  datas.forEach(d => { const e = validateRow(d); if (e.length) allErrs.push(...e); });
  if (allErrs.length) {
    showPageAlert('Periksa kembali: ' + [...new Set(allErrs)].join('; '), 'error');
    return;
  }

  const payloads = datas.map(d => ({
    user_id: String(SESSION.id),
    perihal: d.perihal,
    tanggal_berangkat: d.waktuMulai,
    tanggal_kembali: (d.waktuSelesai && d.waktuSelesai !== d.waktuMulai) ? d.waktuSelesai : null,
    tujuan: d.tujuan,
    pegawai_nip: d.nips,
    pegawai_list: d.names,
    bertugas_sebagai: d.roles.some(v => v && v.trim()) ? d.roles : null,
    pembebanan: d.pembebanan || null,
    waktu_pelaksanaan_text: d.waktuTextCustom || null,
    status: 'menunggu',
    created_at: new Date().toISOString(),
  }));

  _rowActionInFlight.add('submit-checked');
  const btn = document.getElementById('btn-send');
  if (btn) btn.disabled = true;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/surat_tugas`, {
      method: 'POST',
      headers: { ...H, 'Prefer': 'return=minimal' },
      body: JSON.stringify(payloads),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    datas.forEach(d => deleteRow(d.tr));
    snapshotDraft();
    showPageAlert(`✅ ${datas.length} pengajuan surat tugas berhasil dikirim.`, 'success');
    await loadSurat();
  } catch (e) {
    showPageAlert(`Gagal mengirim pengajuan: ${e.message}`, 'error');
  } finally {
    _rowActionInFlight.delete('submit-checked');
    updateBulkCounters();
  }
}

async function deleteSubmittedSurat(id) {
  if (_rowActionInFlight.has(`del:${id}`)) return;
  const s = suratMap[id];
  if (!s) return;
  if (!confirm(`Hapus surat "${s.perihal || 'tanpa perihal'}"?`)) return;

  _rowActionInFlight.add(`del:${id}`);
  try {
    const delUrl = `${SUPABASE_URL}/rest/v1/surat_tugas?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(SESSION.id)}`;
    const res = await fetch(delUrl, { method: 'DELETE', headers: { ...H, 'Prefer': 'return=minimal' } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    allSurat = allSurat.filter(x => String(x.id) !== String(id));
    delete suratMap[id];
    if (String(editingSuratId) === String(id)) editingSuratId = null;
    updateStats();
    filterTable({ resetPage: false });
    showPageAlert('Surat tugas berhasil dihapus.', 'success');
  } catch (e) {
    showPageAlert(`Gagal menghapus surat: ${e.message}`, 'error');
  } finally {
    _rowActionInFlight.delete(`del:${id}`);
  }
}

/* ════════════════════════════════════════════════════════════════════
   TOP SCROLLBAR & STICKY HEADER SYNC (sama dengan Admin Surat Tugas)
═══════════════════════════════════════════════════════════════════════ */
function setupTopScrollbar() {
  const top = document.getElementById('table-scroll-top');
  const topInner = document.getElementById('table-scroll-top-inner');
  const bottom = document.getElementById('table-area');
  if (!top || !topInner || !bottom) return;
  const table = bottom.querySelector('table');
  const tableWidth = table ? table.scrollWidth : bottom.scrollWidth;
  topInner.style.width = tableWidth + 'px';
  top.style.display = tableWidth > bottom.clientWidth ? '' : 'none';

  const head = document.querySelector('.table-head');
  const headH = head ? head.offsetHeight : 48;
  document.documentElement.style.setProperty('--st-table-head-h', `${headH}px`);
  document.documentElement.style.setProperty('--st-table-header-top', `${headH + (top.style.display === 'none' ? 0 : top.offsetHeight)}px`);

  if (top._syncBound) return;
  let syncing = false;
  top.addEventListener('scroll', () => {
    if (syncing) return;
    syncing = true;
    bottom.scrollLeft = top.scrollLeft;
    const sticky = document.getElementById('table-sticky-cols');
    if (sticky) sticky.scrollLeft = top.scrollLeft;
    requestAnimationFrame(() => { syncing = false; });
  });
  bottom.addEventListener('scroll', () => {
    if (syncing) return;
    syncing = true;
    top.scrollLeft = bottom.scrollLeft;
    const sticky = document.getElementById('table-sticky-cols');
    if (sticky) sticky.scrollLeft = bottom.scrollLeft;
    requestAnimationFrame(() => { syncing = false; });
  });
  top._syncBound = true;
}

function syncStickyColsHeader() {
  const wrap = document.querySelector('.table-wrap');
  const sticky = document.getElementById('table-sticky-cols');
  const area = document.getElementById('table-area');
  const table = area ? area.querySelector('table.list-table') : null;
  if (!wrap || !sticky || !table) return;
  const thead = table.querySelector('thead');
  if (!thead) return;
  const clonedHead = thead.outerHTML.replace(/\sid="[^"]+"/g, '');
  sticky.innerHTML = `<table class="list-table mst-table">${clonedHead}</table>`;
  sticky.scrollLeft = area.scrollLeft;
}

let _resizeTimer = null;
window.addEventListener('resize', () => {
  if (_resizeTimer) clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => { setupTopScrollbar(); syncStickyColsHeader(); }, 150);
});

window.addEventListener('scroll', () => {
  const wrap = document.querySelector('.table-wrap');
  const head = document.querySelector('.table-head');
  const area = document.getElementById('table-area');
  if (!wrap || !head || !area) return;
  const areaRect = area.getBoundingClientRect();
  const stuckTop = head.offsetHeight + 4;
  wrap.classList.toggle('table-is-stuck', areaRect.top < stuckTop && areaRect.bottom > stuckTop + 80);
}, { passive: true });

/* ════════════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════════════ */
async function init() {
  if (window.APA_AUTH && window.APA_AUTH.ready) {
    const authSession = await window.APA_AUTH.ready;
    if (!authSession) { window.location.replace('login.html'); return; }
  }
  SESSION = apaCheckSession({ requireAdmin: false });
  if (!SESSION) return;

  if (window.APATopbar && typeof window.APATopbar.renderUser === 'function') window.APATopbar.renderUser(SESSION);
  if (window.APASidebar && typeof window.APASidebar.renderUser === 'function') window.APASidebar.renderUser(SESSION);

  // Muat data referensi (pegawai, mitra, riwayat HR) di background agar tidak memblokir render awal tabel
  loadReferenceData();
  await loadSurat();
  addRows(1);
  restoreDraft();
}

init();
