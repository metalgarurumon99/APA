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

  // ── Master Pegawai Organik BPS Raja Ampat (Default / Fallback) ──
  const DEFAULT_PEGAWAI = [
    { nip: "198604072009022004", nama: "Frida Irian S. Ompusunggu", jabatan: "Kepala BPS", status: "aktif" },
    { nip: "198904192012111001", nama: "Andrie Wardani", jabatan: "Kasubbag Umum", status: "aktif" },
    { nip: "198303182011011007", nama: "Derek Mandowen", jabatan: "Statistisi Ahli Pertama", status: "aktif" },
    { nip: "197912122010032002", nama: "Frida Buratehi", jabatan: "Statistisi Penyelia", status: "aktif" },
    { nip: "199209162014121001", nama: "Maulana Tahir", jabatan: "Statistisi Ahli Muda", status: "aktif" },
    { nip: "199510152018021001", nama: "Abdillah Humam", jabatan: "Pranata Komputer Ahli Pertama", status: "aktif" },
    { nip: "198804022011011007", nama: "Ikbal Ismail", jabatan: "Statistisi Ahli Pertama", status: "aktif" },
    { nip: "199207162019031001", nama: "Lestari Irfandi Amir", jabatan: "Statistisi Ahli Pertama", status: "aktif" },
    { nip: "199610012019011003", nama: "Bagas Indra Sakti", jabatan: "Statistisi Ahli Pertama", status: "aktif" },
    { nip: "199504162018022001", nama: "Sausan Zulfa Faizah", jabatan: "Statistisi Ahli Pertama", status: "aktif" },
    { nip: "197809102007011002", nama: "Muchammad Ali Jumati", jabatan: "Statistisi Pelaksana", status: "aktif" },
    { nip: "198211202011012011", nama: "Novalin P. Wapai", jabatan: "Pranata Komputer Pelaksana", status: "aktif" },
    { nip: "198801242011012016", nama: "Gerda Y. Kalasuat", jabatan: "Statistisi Pelaksana Lanjutan", status: "aktif" },
    { nip: "199903302019121001", nama: "Rizal Akbar Komarudin", jabatan: "Pranata Komputer Terampil", status: "aktif" },
    { nip: "199801062019122001", nama: "Jandriana Ramandei", jabatan: "Pengelola Pengadaan", status: "aktif" },
    { nip: "198908262012112001", nama: "Elok Agustina", jabatan: "Statistisi Ahli Muda", status: "aktif" },
    { nip: "199902212021042001", nama: "Zidna Inayatika", jabatan: "Statistisi Terampil", status: "aktif" },
    { nip: "199903302022011001", nama: "Haidar Nabil", jabatan: "Statistisi Ahli Pertama", status: "aktif" },
    { nip: "199803012022032017", nama: "Syayu Hanana Yohana Stefani", jabatan: "Statistisi Ahli Pertama", status: "aktif" },
    { nip: "200003232023021002", nama: "M. Aris Munandar", jabatan: "Statistisi Terampil", status: "aktif" },
    { nip: "200103272023102002", nama: "Dwi Ayu Andriani", jabatan: "Statistisi Terampil", status: "aktif" },
    { nip: "200107052024121001", nama: "Figri Al - Rasjid Abdullah", jabatan: "Pranata Komputer Terampil", status: "aktif" },
    { nip: "200204152026031001", nama: "M. Khusen Ali Al Anjabi", jabatan: "Statistisi Terampil", status: "aktif" },
    { nip: "200404122026032001", nama: "Arikhza Saputri", jabatan: "Statistisi Terampil", status: "aktif" },
    { nip: "196803201994012001", nama: "Nurhaida Sirun", jabatan: "Pensiunan", status: "pensiun" }
  ];

  // ── Master Mitra Statistik 2026 (Default / Fallback 85 Orang) ──
  const DEFAULT_MITRA_RAW = [{"id":1,"tahun":2026,"nama":"Arsyan Arisandi Ondhi","no_hp":"082398986867","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":2,"tahun":2026,"nama":"Wiyenli Meideline Titiheru","no_hp":"082238560773","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":3,"tahun":2026,"nama":"Agus Fahrezi Amir","no_hp":"082189017227","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":4,"tahun":2026,"nama":"Delvi Andaresta Maylana","no_hp":"082291592567","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":5,"tahun":2026,"nama":"Ashar Ramadhan Mouko","no_hp":"081269638572","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":6,"tahun":2026,"nama":"Abd Aziz Pattiekon","no_hp":"081235384186","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":7,"tahun":2026,"nama":"Syarma Ayu Puspita Sari","no_hp":"082231471857","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":8,"tahun":2026,"nama":"Fatima Pattiekon","no_hp":"081343015707","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":9,"tahun":2026,"nama":"Marthina Anamofa","no_hp":"082196435543","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":10,"tahun":2026,"nama":"Putri Mutmainnah","no_hp":"081214016813","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":11,"tahun":2026,"nama":"Jiyen Asnat Isal","no_hp":"082168649201","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":12,"tahun":2026,"nama":"Felda Ramadani","no_hp":"082292520886","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":13,"tahun":2026,"nama":"Yohanista Paula Boso Piran","no_hp":"085244500225","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":14,"tahun":2026,"nama":"Lusiana Hastuti Dumatubun","no_hp":"082399461446","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":15,"tahun":2026,"nama":"Aten Mahmud","no_hp":"085246427376","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":16,"tahun":2026,"nama":"Idris Rumau","no_hp":"081288758214","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":17,"tahun":2026,"nama":"Amalia","no_hp":"081292902616","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":18,"tahun":2026,"nama":"Nurrahmi Iriani Saiful","no_hp":"085216361494","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":19,"tahun":2026,"nama":"Jihan Amir","no_hp":"082248868617","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":20,"tahun":2026,"nama":"Nur Mubarak Rumalutur","no_hp":"081248004021","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":21,"tahun":2026,"nama":"Riska Nur Afdaliana Jhonnur","no_hp":"082239424413","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":22,"tahun":2026,"nama":"Joice Susan De Kock","no_hp":"082248317433","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":23,"tahun":2026,"nama":"Abraham Rayar","no_hp":"082238041308","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":24,"tahun":2026,"nama":"Yosua Hasudungan Pasaribu","no_hp":"085299990997","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":25,"tahun":2026,"nama":"Azizah Dwi Putri Prasetio","no_hp":"081344037392","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":26,"tahun":2026,"nama":"Hamid Laeta","no_hp":"085334959966","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":27,"tahun":2026,"nama":"Salwan Suhardi","no_hp":"082021345465","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":28,"tahun":2026,"nama":"Nurakifa Yunus","no_hp":"082187014424","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":29,"tahun":2026,"nama":"Supriyanto","no_hp":"081344260952","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":30,"tahun":2026,"nama":"Arsan Yainahu","no_hp":"085323702910","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":31,"tahun":2026,"nama":"Warhamni Sya'Ari","no_hp":"085219709075","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":32,"tahun":2026,"nama":"Didik Wahyudi","no_hp":"081380272044","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":33,"tahun":2026,"nama":"Fadlan Alkatiri","no_hp":"082342140441","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":34,"tahun":2026,"nama":"Pennina Umpes","no_hp":"081225856201","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":35,"tahun":2026,"nama":"Mitra Loiwatu","no_hp":"085217795035","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":36,"tahun":2026,"nama":"Steven Siwalette","no_hp":"081344485529","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":37,"tahun":2026,"nama":"Riskianti Deby Pradini Rahman","no_hp":"082199029027","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":38,"tahun":2026,"nama":"Nasaruddin","no_hp":"08134861038","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":39,"tahun":2026,"nama":"Isak Saba","no_hp":"082353305063","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":40,"tahun":2026,"nama":"Adinda Rahayu Anwar","no_hp":"081240986758","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":41,"tahun":2026,"nama":"Getreda Luturmas","no_hp":"081343192001","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":42,"tahun":2026,"nama":"Dwi Nurahmawati Marsaoly","no_hp":"08124867797","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":43,"tahun":2026,"nama":"Mindefrance Devota Yabarmase","no_hp":"085243248379","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":44,"tahun":2026,"nama":"Hermina Linria Mayor Amber","no_hp":"081291432019","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":45,"tahun":2026,"nama":"Irma Claudya Soor","no_hp":"082199292998","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":46,"tahun":2026,"nama":"Karmila T","no_hp":"082159390826","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":47,"tahun":2026,"nama":"Fredy Oloan Manori","no_hp":"085225820040","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":48,"tahun":2026,"nama":"Nursyahida Tamrin","no_hp":"08134335090","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":49,"tahun":2026,"nama":"Muhammad Ikram Saiful","no_hp":"082198908108","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":50,"tahun":2026,"nama":"Ahmad Hilmi Riyana","no_hp":"085319132516","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":51,"tahun":2026,"nama":"Dwi Fidyawati Leiwakabessy","no_hp":"081247762321","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":52,"tahun":2026,"nama":"Jems Yakop Kipin","no_hp":"082196713828","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":53,"tahun":2026,"nama":"Adelia Ema Iriani Tiow","no_hp":"082227669967","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":54,"tahun":2026,"nama":"Yustina Priskila Patricia Kabes","no_hp":"082397473421","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":55,"tahun":2026,"nama":"Ivon Ledi Meske Daniel","no_hp":"081248726960","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":56,"tahun":2026,"nama":"Anwar Saka","no_hp":"085341768600","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":57,"tahun":2026,"nama":"Alda Sauyai","no_hp":"082287310281","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":58,"tahun":2026,"nama":"Ricko Saputra","no_hp":"08124871540","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":59,"tahun":2026,"nama":"Sarika Wahyu Ningsih","no_hp":"082199244383","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":60,"tahun":2026,"nama":"Vallen Meiland Chesia Kaliele","no_hp":"082198887497","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":61,"tahun":2026,"nama":"Rusni Hulihulis","no_hp":"08134126029","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":62,"tahun":2026,"nama":"Elia Derku","no_hp":"081266831917","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":63,"tahun":2026,"nama":"June Pelamonia","no_hp":"082199249984","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":64,"tahun":2026,"nama":"Yesin Estina","no_hp":"085827888719","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":65,"tahun":2026,"nama":"Martinus Renyaaan","no_hp":"085231123233","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":66,"tahun":2026,"nama":"Ardian Joel Irjosan Tiow","no_hp":"082148999606","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":67,"tahun":2026,"nama":"Iriyani","no_hp":"082114023638","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":68,"tahun":2026,"nama":"Yulce Sauyai","no_hp":"082239322781","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":69,"tahun":2026,"nama":"Dian Sitaniapessy","no_hp":"091344274620","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":70,"tahun":2026,"nama":"Asrul Fahrezi Muhdar","no_hp":"082114760488","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":71,"tahun":2026,"nama":"Andi Nurhadi","no_hp":"081291744343","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":72,"tahun":2026,"nama":"Kirana Tesalonika Rumbiak","no_hp":"082199373448","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":73,"tahun":2026,"nama":"Florencia Desseyn Tuhumena","no_hp":"082217519758","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":74,"tahun":2026,"nama":"Lili Mambraku","no_hp":"081247180432","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":75,"tahun":2026,"nama":"Nency Aronggear","no_hp":"082316535984","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":76,"tahun":2026,"nama":"Fauzan Josias Faidiban","no_hp":"085824092492","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":77,"tahun":2026,"nama":"Syahdan Upacha","no_hp":"081248220065","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":78,"tahun":2026,"nama":"Rizal Rusman","no_hp":"081241341029","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":79,"tahun":2026,"nama":"Andi Rizka Aulia","no_hp":"081247800914","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":80,"tahun":2026,"nama":"Leonora Waropen","no_hp":"085244176292","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":81,"tahun":2026,"nama":"Sarlota Chaterina Kabeth","no_hp":"082215598472","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":82,"tahun":2026,"nama":"Catur E Setiawan Kaiway","no_hp":"082198709106","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":83,"tahun":2026,"nama":"Krestina Lehwurlawal","no_hp":"081262202112","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":84,"tahun":2026,"nama":"Sudirman Umar","no_hp":"082239883870","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"},{"id":85,"tahun":2026,"nama":"Siti Mur Leitafalas","no_hp":"081253217132","jabatan":"Mitra","instansi":"BPS Kabupaten Raja Ampat"}];

  // ── Helper Format ID Mitra ───────────────────────────────────
  function formatMitraNip(tahun, id) {
    return 'MITRA-' + (tahun || 2026) + '-' + String(id).padStart(3, '0');
  }

  function isMitraNip(nip) {
    return typeof nip === 'string' && nip.startsWith('MITRA-');
  }

  let masterPegawai = [...DEFAULT_PEGAWAI];
  let masterMitra = DEFAULT_MITRA_RAW.map(m => ({
    id: m.id,
    nip: formatMitraNip(m.tahun, m.id),
    nama: m.nama,
    jabatan: m.jabatan || 'Mitra',
    instansi: m.instansi || 'BPS Kabupaten Raja Ampat',
    tahun: m.tahun || 2026,
    _isMitra: true
  }));

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
    if (document.getElementById('apa-pegawai-css')) return;
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
      const config = window.APP_CONFIG || (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG : null);
      const url = (config && config.SUPABASE_URL) || window.SUPABASE_URL || '';
      const key = (config && config.SUPABASE_ANON_KEY) || window.SUPABASE_ANON_KEY || '';
      if (!url || !key) return;

      const headers = {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json'
      };

      // 1. Fetch Pegawai
      try {
        const resP = await fetch(url + '/rest/v1/data_pegawai?select=*&order=nama.asc', { headers });
        if (resP.ok) {
          const listP = await resP.json();
          if (Array.isArray(listP) && listP.length) {
            masterPegawai = listP.map(p => ({
              nip: String(p.pegawai_nip || p.nip || '').trim(),
              nama: p.nama || p.full_name || '',
              jabatan: p.jabatan || 'Pegawai BPS',
              status: (p.status_kepegawaian || p.status || 'aktif').toLowerCase(),
              tanggal_pensiun: p.tanggal_pensiun || ''
            }));
          }
        }
      } catch (e) {
        console.warn('[apaPegawai] Fallback data_pegawai dipakai:', e);
      }

      // 2. Fetch Mitra
      try {
        const resM = await fetch(url + '/rest/v1/mitra?select=id,tahun,nama,no_hp,jabatan,instansi&order=tahun.desc,nama.asc', { headers });
        if (resM.ok) {
          const listM = await resM.json();
          if (Array.isArray(listM) && listM.length) {
            masterMitra = listM.map(m => ({
              id: m.id,
              nip: formatMitraNip(m.tahun, m.id),
              nama: m.nama,
              jabatan: m.jabatan || 'Mitra',
              instansi: m.instansi || 'BPS Kabupaten Raja Ampat',
              tahun: m.tahun || 2026,
              _isMitra: true
            }));
          }
        }
      } catch (e) {
        console.warn('[apaPegawai] Fallback mitra dipakai:', e);
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
      wrapper.innerHTML = '<span class="apa-pg-single-name" title="' + nama.replace(/"/g, '&quot;') + '">' + nama + '</span>';
    } else {
      // Terlampir (Rule 1 & 3: Nama-nama tersembunyi, hanya badge ringkas tanpa logo)
      wrapper.innerHTML = `
        <span class="apa-pg-badge-terlampir" title="${names.join(', ').replace(/"/g, '&quot;')}">
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
      listEl.innerHTML = '<div class="apa-pg-empty">Tidak ada nama yang cocok dengan "' + q + '".</div>';
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
        <div class="${cls}" data-nip="${item.nip}" data-nama="${item.nama.replace(/"/g, '&quot;')}" data-idx="${idx}">
          <div class="apa-pg-item-avatar">${initials}</div>
          <div class="apa-pg-item-content">
            <div class="apa-pg-item-nama">${item.nama}</div>
            <div class="apa-pg-item-sub">
              <span>${item.sub}</span>
              <span class="apa-pg-badge ${item.badgeCls}">${item.badge}</span>
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
        <div class="apa-pg-check-item readonly checked" style="cursor: default;" data-nip="${item.nip}">
          <div class="apa-pg-checkbox" style="background:#0284c7;color:#fff;border-color:#0284c7;font-size:10px;font-weight:700;">${idx + 1}</div>
          <div class="apa-pg-item-content">
            <div class="apa-pg-item-nama" style="font-weight:600;">${item.nama}</div>
            <div class="apa-pg-item-sub">
              <span>${item.sub}</span>
              <span class="apa-pg-badge ${item.badgeCls}">${item.badge}</span>
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

    listEl.innerHTML = state.terlampirFiltered.map(item => {
      const isChecked = state.selectedNips.includes(item.nip);
      return `
        <div class="apa-pg-check-item ${isChecked ? 'checked' : ''}" data-nip="${item.nip}" data-nama="${item.nama.replace(/"/g, '&quot;')}">
          <div class="apa-pg-checkbox">${isChecked ? '✓' : ''}</div>
          <div class="apa-pg-item-content">
            <div class="apa-pg-item-nama">${item.nama}</div>
            <div class="apa-pg-item-sub">
              <span>${item.sub}</span>
              <span class="apa-pg-badge ${item.badgeCls}">${item.badge}</span>
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
      const roleVal = (state.selectedRolesMap[nip] || '').replace(/"/g, '&quot;');
      const isRo = state.isReadOnly;
      return `
        <div class="apa-pg-role-row">
          <span class="apa-pg-role-num">${idx + 1}.</span>
          <span class="apa-pg-role-name" title="${name.replace(/"/g, '&quot;')}">${name}</span>
          <input type="text"
                 class="apa-pg-role-input"
                 data-nip="${nip}"
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

      // Keyboard navigation
      mainSearch.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          state.focusIdx = Math.min(state.focusIdx + 1, state.mainFiltered.length - 1);
          renderMainList();
          scrollFocusedIntoView('#apa-pg-main-list');
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          state.focusIdx = Math.max(state.focusIdx - 1, 0);
          renderMainList();
          scrollFocusedIntoView('#apa-pg-main-list');
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (state.focusIdx >= 0 && state.mainFiltered[state.focusIdx]) {
            const item = state.mainFiltered[state.focusIdx];
            pickSinglePerson(item.nip, item.nama);
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
