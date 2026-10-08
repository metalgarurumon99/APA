/**
 * 9201 SHARED & COMPATIBILITY — utilitas umum untuk Sistem Automasi Pekerjaan Administrasi (APA)
 * ─────────────────────────────────────────────────────────────────────────────
 * Menjaga fungsionalitas dan desain sesuai spesifikasi Portal 9201 BPS Kabupaten Raja Ampat.
 */
(function () {
  'use strict';

  // ─── CSS Injection: Custom checkbox & radio (rendering full lewat CSS) ─
  if (!document.getElementById('9201-controls-css')) {
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
      box-shadow:0 0 0 3px rgba(200,168,75,.35);
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
    `;
    var ctrlStyle = document.createElement('style');
    ctrlStyle.id = '9201-controls-css';
    ctrlStyle.textContent = ctrlCSS;
    if (document.head.firstChild) {
      document.head.insertBefore(ctrlStyle, document.head.firstChild);
    } else {
      document.head.appendChild(ctrlStyle);
    }
  }

  // ─── Headers Supabase ──────────────────────────────────────────
  const SUP_URL = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || window.SUPABASE_URL || 'https://dxbeernfohpidaaqlnjp.supabase.co';
  const SUP_KEY = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4YmVlcm5mb2hwaWRhYXFsbmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTgzNDIsImV4cCI6MjEwNjk3NDM0Mn0.ZE23RO8OvsuFWyq5L6FKp4JhMcSDfKVp_rhIos8aFgw';

  window.SUPABASE_URL = SUP_URL;
  window.SUPABASE_ANON_KEY = SUP_KEY;

  window.SUPABASE_HEADERS = {
    'apikey': SUP_KEY,
    'Authorization': `Bearer ${SUP_KEY}`,
    'Content-Type': 'application/json'
  };

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

  // ─── data_pegawai column helpers ─────────────────────────────────
  function pegawaiNama(row) {
    return row ? (row.nama ?? row.NAMA ?? '') : '';
  }
  function pegawaiNip(row) {
    return row ? (row.pegawai_nip ?? row.NIP ?? row.username ?? '') : '';
  }
  function pegawaiNipLama(row) {
    return row ? (row.nip_lama ?? row.niplama ?? row['NIP LAMA'] ?? row['Niplama'] ?? '') : '';
  }
  function pegawaiKarpeg(row) {
    return row ? (row.karpeg ?? row['NOMOR SERI KARPEG'] ?? '') : '';
  }
  function pegawaiTtl(row) {
    return row ? (row.ttl ?? row['TEMPAT/TANGGAL LAHIR'] ?? '') : '';
  }
  function pegawaiJk(row) {
    return row ? (row.jk ?? row['JENIS KELAMIN'] ?? '') : '';
  }
  function pegawaiUnitKerja(row) {
    return row ? (row.unit_kerja ?? row['UNIT KERJA'] ?? row.UNIT_KERJA ?? '') : '';
  }
  function pegawaiPendidikanTerakhir(row) {
    return row ? (row.pendidikan_terakhir ?? row['PENDIDIKAN TERAKHIR'] ?? '') : '';
  }
  window.pegawaiNama = pegawaiNama;
  window.pegawaiNip = pegawaiNip;
  window.pegawaiNipLama = pegawaiNipLama;
  window.pegawaiKarpeg = pegawaiKarpeg;
  window.pegawaiTtl = pegawaiTtl;
  window.pegawaiJk = pegawaiJk;
  window.pegawaiUnitKerja = pegawaiUnitKerja;
  window.pegawaiPendidikanTerakhir = pegawaiPendidikanTerakhir;

  // ─── Logout ────────────────────────────────────────────────────
  function logout() {
    if (window.APA_AUTH && typeof window.APA_AUTH.logout === 'function') {
      window.APA_AUTH.logout();
    } else {
      localStorage.removeItem('apa_user');
      sessionStorage.removeItem('apa_user');
      localStorage.removeItem('nova_user');
      window.location.replace('login.html');
    }
  }
  window.logout = logout;

  // ─── novaCheckSession ──────────────────────────────────────────
  function novaCheckSession(opts) {
    opts = opts || {};
    const requireAdmin = !!opts.requireAdmin;

    let s = null;
    if (window.APA_AUTH && typeof window.APA_AUTH.getCurrentUser === 'function') {
      s = window.APA_AUTH.getCurrentUser();
    }
    if (!s) {
      try {
        s = JSON.parse(localStorage.getItem('apa_user') || sessionStorage.getItem('apa_user') || localStorage.getItem('nova_user') || 'null');
      } catch (e) {
        s = null;
      }
    }

    // Fallback default dev/mock session jika belum login (agar dapat langsung diuji)
    if (!s) {
      s = {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'admin',
        full_name: 'Administrator BPS',
        nama: 'Administrator BPS',
        role: 'admin',
        roles: ['admin', 'user'],
        active_role: 'admin'
      };
      try {
        localStorage.setItem('apa_user', JSON.stringify(s));
        localStorage.setItem('nova_user', JSON.stringify(s));
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

    // Simpan sync ke nova_user juga untuk kompatibilitas key localStorage
    try {
      localStorage.setItem('nova_user', JSON.stringify(s));
    } catch (_) {}

    return s;
  }
  window.novaCheckSession = novaCheckSession;

  async function novaVerifyAdminSession(session) {
    if (!session) return null;
    return session;
  }
  window.novaVerifyAdminSession = novaVerifyAdminSession;

  // ─── novaRpc ───────────────────────────────────────────────────
  async function novaRpc(fnName, params) {
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
  window.novaRpc = novaRpc;

  // ─── Konstanta: nama bulan Indonesia ───────────────────────────
  window.BULAN = [
    'Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'
  ];
  window.BULAN_ABBR = [
    'jan','feb','mar','apr','mei','jun','jul','agu','sep','okt','nov','des'
  ];

  // ─── Shims untuk komponen UI ──────────────────────────────────
  window.Topbar9201 = {
    setUser: function (user) {
      if (window.APATopbar && typeof window.APATopbar.renderUser === 'function') {
        window.APATopbar.renderUser(user);
      }
      if (window.APASidebar && typeof window.APASidebar.renderUser === 'function') {
        window.APASidebar.renderUser(user);
      }
    }
  };
  window.initRoleSwitcher = function () {};
  window.toggleUserDropdown = function () {};
  window.switchViewRole = function () {};

})();
