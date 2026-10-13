/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * APA SHARED UTILITIES — Sistem Automasi Pekerjaan Administrasi (APA)
 * BPS Kabupaten Raja Ampat
 * ═══════════════════════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  // ─── CSS Injection: Custom Checkbox & Form Controls ───────────
  if (!document.getElementById('apa-controls-css')) {
    var ctrlCSS = `
    /* ── Custom checkbox (global) ──────────────────────────────── */
    input[type="checkbox"]{
      -webkit-appearance:none;-moz-appearance:none;appearance:none;
      --ck-accent:#0d2340;
      --ck-border:#c9c2b6;
      width:17px;height:17px;
      border:1.5px solid var(--ck-border);
      border-radius:5px;
      background-color:#fff;
      cursor:pointer;
      margin:0;
      vertical-align:middle;
      position:relative;
      flex-shrink:0;
      display:inline-block;
      transition:background-color .15s ease,border-color .15s ease,box-shadow .15s ease,transform .08s ease;
      background-repeat:no-repeat;
      background-position:center;
      background-size:78% 78%;
      print-color-adjust:exact;
      -webkit-print-color-adjust:exact;
    }
    input[type="checkbox"]:hover:not(:disabled){
      border-color:var(--ck-accent);
    }
    input[type="checkbox"]:active:not(:disabled){
      transform:scale(.92);
    }
    input[type="checkbox"]:focus-visible{
      outline:none;
      box-shadow:0 0 0 3px rgba(22,133,248,.25);
    }
    input[type="checkbox"]:checked{
      background-color:var(--ck-accent);
      border-color:var(--ck-accent);
      background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path d='M3.5 8.4 L6.7 11.5 L12.7 4.7' fill='none' stroke='%23ffffff' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/></svg>");
    }
    input[type="checkbox"]:indeterminate{
      background-color:var(--ck-accent);
      border-color:var(--ck-accent);
      background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><line x1='4' y1='8' x2='12' y2='8' stroke='%23ffffff' stroke-width='2.4' stroke-linecap='round'/></svg>");
    }
    input[type="checkbox"]:disabled{
      cursor:not-allowed;
      opacity:.45;
      background-color:#f1ede5;
      border-color:#d8d3c8;
    }
    input[type="checkbox"]:checked:disabled,
    input[type="checkbox"]:indeterminate:disabled{
      background-color:#9ca3af;
      border-color:#9ca3af;
    }
    /* Variants warna */
    input[type="checkbox"].ck-success{ --ck-accent:#1a7a4a }
    input[type="checkbox"].ck-gold   { --ck-accent:#c8a84b }
    input[type="checkbox"].ck-danger { --ck-accent:#c0392b }
    /* Variants ukuran */
    input[type="checkbox"].ck-sm{ width:14px;height:14px;border-radius:4px }
    input[type="checkbox"].ck-lg{ width:20px;height:20px;border-radius:6px }

    /* ── Status badges (global) ─────────────────────────────────── */
    .badge{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:100px;font-size:11px;font-weight:600;white-space:nowrap}
    .badge-status-icon{width:11px;height:11px;object-fit:contain;display:inline-block;flex-shrink:0;vertical-align:middle}
    .badge.menunggu{background:#fef3c7;color:#92400e;border:1px solid #fde68a}
    .badge.menunggu .badge-status-icon{filter:invert(30%) sepia(88%) saturate(1000%) hue-rotate(10deg)}
    .badge.selesai{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
    .badge.selesai .badge-status-icon{filter:invert(28%) sepia(83%) saturate(600%) hue-rotate(120deg) brightness(90%)}
    .badge.draft{background:#f1f5f9;color:#475569;border:1px solid #cbd5e1}
    `;
    var ctrlStyle = document.createElement('style');
    ctrlStyle.id = 'apa-controls-css';
    ctrlStyle.textContent = ctrlCSS;
    if (document.head.firstChild) {
      document.head.insertBefore(ctrlStyle, document.head.firstChild);
    } else {
      document.head.appendChild(ctrlStyle);
    }
  }

  // ─── Headers Supabase (diambil dari config.js / supabase-config.js) ─
  const SUP_URL = window.SUPABASE_URL || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || 'https://dxbeernfohpidaaqlnjp.supabase.co';
  const SUP_KEY = window.SUPABASE_ANON_KEY || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4YmVlcm5mb2hwaWRhYXFsbmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTgzNDIsImV4cCI6MjEwNjk3NDM0Mn0.ZE23RO8OvsuFWyq5L6FKp4JhMcSDfKVp_rhIos8aFgw';

  window.SUPABASE_URL = SUP_URL;
  window.SUPABASE_ANON_KEY = SUP_KEY;

  if (!window.SUPABASE_HEADERS) {
    window.SUPABASE_HEADERS = {
      'apikey': SUP_KEY,
      'Authorization': `Bearer ${SUP_KEY}`,
      'Content-Type': 'application/json'
    };
  }

  // ─── Escape HTML ───────────────────────────────────────────────
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])
    );
  }
  window.esc = esc;
  window.escAttr = esc;

  function jsArg(v) {
    return JSON.stringify(v == null ? '' : String(v))
      .replace(/</g, '\\u003C')
      .replace(/>/g, '\\u003E')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  }
  window.jsArg = jsArg;

  // ─── data_pegawai column helpers ───────────────────────────────
  function pegawaiNama(row) {
    return row ? (row.nama ?? row.NAMA ?? '') : '';
  }
  function pegawaiNip(row) {
    return row ? (row.pegawai_nip ?? row.NIP ?? row.username ?? '') : '';
  }
  window.pegawaiNama = pegawaiNama;
  window.pegawaiNip = pegawaiNip;

  // ─── Logout ────────────────────────────────────────────────────
  function logout() {
    if (window.APA_AUTH && typeof window.APA_AUTH.logout === 'function') {
      window.APA_AUTH.logout();
    } else {
      localStorage.removeItem('apa_user');
      sessionStorage.removeItem('apa_user');
      window.location.replace('login.html');
    }
  }
  window.logout = logout;

  // ─── apaCheckSession ───────────────────────────────────────────
  function apaCheckSession(opts) {
    opts = opts || {};
    const requireAdmin = !!opts.requireAdmin;

    let s = null;
    if (window.APA_AUTH && typeof window.APA_AUTH.getCurrentUser === 'function') {
      s = window.APA_AUTH.getCurrentUser();
    }
    if (!s) {
      try {
        s = JSON.parse(localStorage.getItem('apa_user') || sessionStorage.getItem('apa_user') || 'null');
      } catch (e) {
        s = null;
      }
    }

    // Fallback default dev/mock session jika belum login (agar dapat langsung diuji)
    if (!s) {
      s = {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'admin',
        full_name: 'Administrator APA',
        nama: 'Administrator APA',
        role: 'admin',
        roles: ['admin', 'user'],
        active_role: 'admin'
      };
      try {
        localStorage.setItem('apa_user', JSON.stringify(s));
      } catch (_) {}
    }

    const roles = (typeof getUserRoles === 'function')
      ? getUserRoles(s)
      : (Array.isArray(s.roles) && s.roles.length ? s.roles : (s.role ? [s.role] : ['user']));

    if (!s.active_role) {
      s.active_role = roles.includes('admin') ? 'admin' : 'user';
    }

    if (requireAdmin && !roles.includes('admin') && s.role !== 'admin') {
      alert('Halaman ini khusus untuk Administrator.');
      window.location.replace('minta-surat-tugas.html');
      return null;
    }

    return s;
  }
  window.apaCheckSession = apaCheckSession;

  async function apaVerifyAdminSession(session) {
    if (!session) return null;
    return session;
  }
  window.apaVerifyAdminSession = apaVerifyAdminSession;

  // ─── apaRpc ────────────────────────────────────────────────────
  async function apaRpc(fnName, params) {
    const res = await fetch(`${window.SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
      method:  'POST',
      headers: window.SUPABASE_HEADERS,
      body:    JSON.stringify(params || {})
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        msg = err.message || err.hint || err.details || msg;
      } catch (_) {}
      throw new Error(msg);
    }
    const text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch (_) { return text; }
  }
  window.apaRpc = apaRpc;

  // ─── Konstanta: nama bulan Indonesia ───────────────────────────
  window.BULAN = [
    'Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'
  ];
  window.BULAN_ABBR = [
    'jan','feb','mar','apr','mei','jun','jul','agu','sep','okt','nov','des'
  ];

  // ─── Format & Parse Tanggal Indonesia ──────────────────────────
  function parseISODate(str) {
    if (!str) return null;
    const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d) ? null : d;
  }

  function toISODate(d) {
    if (!d || !(d instanceof Date) || isNaN(d)) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function todayISO() {
    return toISODate(new Date());
  }

  function fmtTgl(str) {
    if (!str) return '';
    const d = parseISODate(str);
    if (!d) return '';
    return `${d.getDate()} ${window.BULAN[d.getMonth()]} ${d.getFullYear()}`;
  }

  function fmtWaktu(mulai, selesai) {
    if (!mulai) return '—';
    if (!selesai || selesai === mulai) return fmtTgl(mulai);
    const a = parseISODate(mulai), b = parseISODate(selesai);
    if (!a || !b) return fmtTgl(mulai);
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
      return `${a.getDate()} s.d. ${b.getDate()} ${window.BULAN[b.getMonth()]} ${b.getFullYear()}`;
    }
    if (a.getFullYear() === b.getFullYear()) {
      return `${a.getDate()} ${window.BULAN[a.getMonth()]} s.d. ${b.getDate()} ${window.BULAN[b.getMonth()]} ${b.getFullYear()}`;
    }
    return `${fmtTgl(mulai)} s.d. ${fmtTgl(selesai)}`;
  }

  window.parseISODate = parseISODate;
  window.toISODate = toISODate;
  window.todayISO = todayISO;
  window.fmtTgl = fmtTgl;
  window.fmtTanggal = fmtTgl;
  window.fmtWaktu = fmtWaktu;

  window.apaDate = {
    parseISODate,
    toISODate,
    todayISO,
    fmtTgl,
    fmtTanggal: fmtTgl,
    fmtWaktu
  };

  // ─── Status Badge HTML ─────────────────────────────────────────
  function badgeHTML(status) {
    const s = String(status || '').toLowerCase().trim();
    if (s === 'selesai') {
      return `<span class="badge selesai"><img src="Assets/checked.png" class="badge-status-icon" alt="">Selesai</span>`;
    }
    if (s === 'menunggu') {
      return `<span class="badge menunggu"><img src="Assets/hour-glass.png" class="badge-status-icon" alt="">Menunggu</span>`;
    }
    return `<span class="badge draft">${esc(status || 'Draft')}</span>`;
  }
  window.badgeHTML = badgeHTML;
  window.apaBadgeHTML = badgeHTML;

})();
