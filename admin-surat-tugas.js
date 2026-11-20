/* ═══════════════════════════════════════════════════════════════════════
   SISTEM AUTOMASI PEKERJAAN ADMINISTRASI (APA) — Admin Surat Tugas
   BPS Kabupaten Raja Ampat
   ─────────────────────────────────────────────────────────────────────
   Ketergantungan global:
     - SUPABASE_URL, SUPABASE_ANON_KEY (config.js)
     - getUserRoles, ADMIN_USERS (config.js)
     - SUPABASE_HEADERS, esc, apaCheckSession, apaRpc, BULAN, logout
       (apa-shared.js)
     - window.docxPreview, saveAs, docxtemplater, PizZip (libs eksternal)
═══════════════════════════════════════════════════════════════════════ */

const ADMIN_SURAT_TUGAS_BUILD = '2026-06-17.1';
window.ADMIN_SURAT_TUGAS_BUILD = ADMIN_SURAT_TUGAS_BUILD;
console.info('[APA] admin-surat-tugas build', ADMIN_SURAT_TUGAS_BUILD);

const H = SUPABASE_HEADERS;

/* ═════════════════════════════════════════════════════════════════════
   TIPE SURAT — fitur multi-template
   ─────────────────────────────────────────────────────────────────────
   10 pilihan tipe yg menentukan template .docx yg dipakai saat generate.
   String value sengaja sama dengan check-constraint surat_tugas_tipe_enum
   di DB (lihat surat_tugas_add_tipe.sql).

   Hanya 3 file template di Supabase Storage (per keputusan user — pakai
   T1V & T3V sebagai superset untuk semua tipe non-visum):
     T2:  template-surat-tugas-lampiran.docx
          — punya {#ul} (tabel lampiran). Dipakai HANYA untuk tipe
            surat_tugas_lampiran (tanpa SPD).
     T1V: template-surat-tugas-spd-visum-kendaraan-menginap.docx
          — punya {#has_spd}, {#kendaraan}, {#menginap},
            {#visum}{#r}{/r}{/visum}. Dipakai untuk SEMUA tipe
            non-lampiran (visum maupun non-visum). Untuk non-visum:
            flags.has_visum=false → visum:[] → section visum hilang.
     T3V: template-surat-tugas-lampiran-spd-visum-kendaraan-menginap.docx
          — punya {#ul} (lampiran), {#kendaraan}, {#menginap}, dan
            {#visum}{#r}{/r}{/visum}. SPD selalu render (tidak ada
            {#has_spd} wrapper). Dipakai untuk SEMUA tipe lampiran-with-SPD.

   Catatan tag yg perlu Anda pastikan ADA di template:
     - T1V & T3V: blok kendaraan dibungkus {#kendaraan}...{/kendaraan}
                  blok menginap   dibungkus {#menginap}...{/menginap}
                  blok visum      dibungkus {#visum}...{/visum}
                  baris loop responden di-bungkus {#r}...{/r}
                  di baris terakhir tabel visum.
═══════════════════════════════════════════════════════════════════════ */

// 10 pilihan tipe (urutan = urutan tampil di dropdown UI).
// Variant Visum diletakkan setelah variant non-visum yang setara.
const TIPE_OPTIONS = [
  { value: 'surat_tugas',                                       label: 'Surat Tugas' },
  { value: 'surat_tugas_kendaraan',                             label: 'Surat Tugas + Kendaraan' },
  { value: 'surat_tugas_visum_kendaraan',                       label: 'Surat Tugas + Visum + Kendaraan' },
  { value: 'surat_tugas_lampiran',                              label: 'Surat Tugas + Lampiran' },
  { value: 'surat_tugas_spd_kendaraan',                         label: 'Surat Tugas + SPD + Kendaraan' },
  { value: 'surat_tugas_spd_kendaraan_menginap',                label: 'Surat Tugas + SPD + Kendaraan + Menginap' },
  { value: 'surat_tugas_spd_visum_kendaraan_menginap',          label: 'Surat Tugas + SPD + Visum + Kendaraan + Menginap' },
  { value: 'surat_tugas_lampiran_spd_kendaraan',                label: 'Surat Tugas + Lampiran + SPD + Kendaraan' },
  { value: 'surat_tugas_lampiran_spd_kendaraan_menginap',       label: 'Surat Tugas + Lampiran + SPD + Kendaraan + Menginap' },
  { value: 'surat_tugas_lampiran_spd_visum_kendaraan_menginap', label: 'Surat Tugas + Lampiran + SPD + Visum + Kendaraan + Menginap' },
];

// URL template di Supabase Storage. Pastikan nama file yang Anda upload
// di bucket `template/` sama persis dengan path di sini.
//
// KONSOLIDASI TEMPLATE (per keputusan user):
//   - T1V dipakai untuk SEMUA tipe non-lampiran (bukan hanya visum)
//     karena T1V adalah superset T1: identik dengan T1 + tambahan
//     section {#visum}{/visum} di akhir. Untuk tipe non-visum,
//     `flags.has_visum=false` → array `visum:[]` → seluruh section
//     visum hilang dari output (engine docxtemplater rule untuk
//     section dengan array kosong).
//   - T3V dipakai untuk SEMUA tipe lampiran (bukan hanya visum) dengan
//     alasan yang sama.
//   - T2 tetap dipakai untuk tipe surat_tugas_lampiran (tanpa SPD).
//
// Hanya 3 file yang perlu di-upload ke Storage:
//   - template-surat-tugas-lampiran.docx                              (T2)
//   - template-surat-tugas-spd-visum-kendaraan-menginap.docx          (T1V)
//   - template-surat-tugas-lampiran-spd-visum-kendaraan-menginap.docx (T3V)
const TEMPLATE_URL_T2  = 'Assets/templates/template-surat-tugas-lampiran.docx';
const TEMPLATE_URL_T1V = 'Assets/templates/template-surat-tugas-spd-visum-kendaraan-menginap.docx';
const TEMPLATE_URL_T3V = 'Assets/templates/template-surat-tugas-lampiran-spd-visum-kendaraan-menginap.docx';

// Mapping tipe → template URL.
// Semua tipe non-lampiran → T1V (superset). Tipe lampiran-with-SPD → T3V.
// Hanya tipe surat_tugas_lampiran (tanpa SPD) yang masih pakai T2.
const TIPE_TO_TEMPLATE = {
  'surat_tugas':                                       TEMPLATE_URL_T1V,
  'surat_tugas_kendaraan':                             TEMPLATE_URL_T1V,
  'surat_tugas_visum_kendaraan':                       TEMPLATE_URL_T1V,
  'surat_tugas_lampiran':                              TEMPLATE_URL_T2,
  'surat_tugas_spd_kendaraan':                         TEMPLATE_URL_T1V,
  'surat_tugas_spd_kendaraan_menginap':                TEMPLATE_URL_T1V,
  'surat_tugas_spd_visum_kendaraan_menginap':          TEMPLATE_URL_T1V,
  'surat_tugas_lampiran_spd_kendaraan':                TEMPLATE_URL_T3V,
  'surat_tugas_lampiran_spd_kendaraan_menginap':       TEMPLATE_URL_T3V,
  'surat_tugas_lampiran_spd_visum_kendaraan_menginap': TEMPLATE_URL_T3V,
};

// Mapping tipe → flags untuk kontrol section di template.
//   has_spd       → toggle {#has_spd}...{/has_spd}  (hanya berpengaruh di T1/T1V)
//   has_kendaraan → kalau true, kirim array `kendaraan` (T1/T1V/T3/T3V)
//   has_menginap  → kalau true, kirim array `menginap`  (T1/T1V/T3/T3V)
//   has_lampiran  → kalau true, kirim array `ul` utk tabel lampiran (T2/T3/T3V)
//   has_visum     → kalau true, kirim section `visum` & array `r` (T1V/T3V)
//
// Catatan: untuk T3/T3V, has_spd dikirim true walau template tidak punya
// {#has_spd} wrapper — engine docxtemplater akan ignore tag yg tidak ada
// di template, jadi aman.
const TIPE_TO_FLAGS = {
  'surat_tugas':                                       { has_spd:false, has_kendaraan:false, has_menginap:false, has_lampiran:false, has_visum:false },
  'surat_tugas_kendaraan':                             { has_spd:false, has_kendaraan:true,  has_menginap:false, has_lampiran:false, has_visum:false },
  'surat_tugas_visum_kendaraan':                       { has_spd:false, has_kendaraan:true,  has_menginap:false, has_lampiran:false, has_visum:true  },
  'surat_tugas_lampiran':                              { has_spd:false, has_kendaraan:false, has_menginap:false, has_lampiran:true,  has_visum:false },
  'surat_tugas_spd_kendaraan':                         { has_spd:true,  has_kendaraan:true,  has_menginap:false, has_lampiran:false, has_visum:false },
  'surat_tugas_spd_kendaraan_menginap':                { has_spd:true,  has_kendaraan:true,  has_menginap:true,  has_lampiran:false, has_visum:false },
  'surat_tugas_spd_visum_kendaraan_menginap':          { has_spd:true,  has_kendaraan:true,  has_menginap:true,  has_lampiran:false, has_visum:true  },
  'surat_tugas_lampiran_spd_kendaraan':                { has_spd:true,  has_kendaraan:true,  has_menginap:false, has_lampiran:true,  has_visum:false },
  'surat_tugas_lampiran_spd_kendaraan_menginap':       { has_spd:true,  has_kendaraan:true,  has_menginap:true,  has_lampiran:true,  has_visum:false },
  'surat_tugas_lampiran_spd_visum_kendaraan_menginap': { has_spd:true,  has_kendaraan:true,  has_menginap:true,  has_lampiran:true,  has_visum:true  },
};

// Konstanta layout tabel visum (sinkron dengan template T1V/T3V).
// Tabel visum punya 6 baris kosong default; baris terakhir adalah baris loop
// dengan tag {#r}...{/r}. Kalau user input jumlah responden ≤ VISUM_DEFAULT_ROWS,
// loop tetap render minimal 1x → minimal 7 baris terlihat.
// Kalau input > VISUM_DEFAULT_ROWS, loop render (input - VISUM_DEFAULT_ROWS) baris.
const VISUM_DEFAULT_ROWS = 6;

// Hitung jumlah baris yang harus di-loop (`r` array length) berdasarkan
// jumlah responden yang user input. Defensive: input apapun (null/string/
// negatif/desimal) di-coerce ke integer. Lihat juga buildTemplateData().
function calcVisumLoopCount(jumlahResponden) {
  const n = parseInt(jumlahResponden, 10);
  if (!isFinite(n) || n <= VISUM_DEFAULT_ROWS) return 1; // minimal 1 → total 7 baris
  return n - VISUM_DEFAULT_ROWS;
}

// Helper: apakah tipe surat ini butuh input "Jumlah Responden" untuk visum?
function tipeHasVisum(tipe) {
  return tipeFlags(tipe).has_visum === true;
}

// Helper: apakah tipe surat ini punya halaman lampiran?
// Dipakai untuk toggle UI editor "Bertugas Sebagai" — hanya muncul kalau
// tipe ada lampiran (T2/T3V) DAN pegawai ≥ 2 (1 pegawai tidak butuh role
// pembeda karena kolom Jabatan/Bertugas hanya berisi 1 baris).
function tipeHasLampiran(tipe) {
  return tipeFlags(tipe).has_lampiran === true;
}

// Helper: ubah enum value ke label readable. Kalau value tidak dikenal,
// kembalikan apa adanya (untuk debug).
function tipeLabel(tipe) {
  if (!tipe) return '';
  const opt = TIPE_OPTIONS.find(o => o.value === tipe);
  return opt ? opt.label : String(tipe);
}

// Helper: dapatkan flags dari tipe. Return objek dgn semua flag = false
// kalau tipe NULL/invalid (defensive — caller bisa langsung pakai).
function tipeFlags(tipe) {
  return TIPE_TO_FLAGS[tipe] || { has_spd:false, has_kendaraan:false, has_menginap:false, has_lampiran:false, has_visum:false };
}

// Helper: dapatkan URL template dari tipe. Return null kalau tipe
// NULL/invalid — caller wajib handle (jangan render docx tanpa tipe valid).
function tipeTemplateUrl(tipe) {
  return TIPE_TO_TEMPLATE[tipe] || null;
}

let SESSION = null;
let allSurat = [];                // descending by created_at (untuk display di table)
const SURAT_PAGE_SIZE = 50;
let suratPage = 1;
let filteredSurat = [];
let suratMap = {};                // id → object
let suratOrderMap = {};           // id → urutan global ascending (1-based)
let pegawaiList = [];             // dari "data_pegawai"
let pegawaiByNIP = {};            // index NIP → object
let mitraList   = [];             // dari tabel "mitra" (semua tahun)
let mitraByNip  = {};             // index NIP placeholder → object mitra
                                  //   format NIP placeholder: MITRA-{tahun}-{id3digit}
                                  //   contoh: MITRA-2026-042
let riwayatJabatan = [];          // dari "riwayat_jabatan"
let riwayatPangkatGolongan = [];  // dari "riwayat_pangkat_golongan"
let riwayatGelar = [];            // dari "riwayat_gelar"
let userMap = {};                 // id → { full_name, username } — untuk tampilkan nama pengaju surat
let selectedId = null;

// ─── DEFAULTS yang di-prefill saat baris status menunggu ──────────────
// v3 — format `pembebanan` berubah menjadi kode MAK terstruktur.
// Lihat parseMAK() untuk format yang valid. Bumping versi key agar
// default lama (yang berisi narasi "DIPA BPS...") tidak ter-prefill.
const APPROVE_DEFAULTS_KEY = 'apa_approve_defaults_v3';
const FACTORY_DEFAULTS = {
  alat_angkutan:  'Angkutan Darat',
  // Format wajib: program(3 segmen).kegiatan.kro.ro.komponen.sub_komponen.akun
  // Contoh:       054.01.GG.2910.BMA.006.054.A.524119
  pembebanan:     '054.01.GG.2910.BMA.006.054.A.524119',
  ttd_nip:        '',
  ttd_nama:       '',
};
function loadApproveDefaults() {
  try {
    const raw = localStorage.getItem(APPROVE_DEFAULTS_KEY);
    if (!raw) return { ...FACTORY_DEFAULTS };
    return { ...FACTORY_DEFAULTS, ...JSON.parse(raw) };
  } catch(e) { return { ...FACTORY_DEFAULTS }; }
}
function saveApproveDefaults(d) {
  try { localStorage.setItem(APPROVE_DEFAULTS_KEY, JSON.stringify(d)); } catch(e) {}
}

/* ════════════════════════════════════════════════════════════════════
   SESSION & TOPBAR
═══════════════════════════════════════════════════════════════════════ */
// `checkSession`, `logout`, `esc`, dan `BULAN` di-load dari apa-shared.js.
// Halaman ini admin-only — pakai apaCheckSession({ requireAdmin: true })
// di init().
// Topbar dan Sidebar di-handle secara terpadu oleh topbar.js dan sidebar.js.
// Sesi pengguna otomatis disinkronkan saat init.

/* ════════════════════════════════════════════════════════════════════
   HELPERS — escape, format tanggal, badge
═══════════════════════════════════════════════════════════════════════ */
// `esc` dari apa-shared.js. `escAttr` adalah alias `esc` (juga shared).

// ─── Format Tanggal & Badge Status (Global dari apa-shared.js) ──────────────
const fmtTgl = window.fmtTgl || function(str) {
  if (!str) return '';
  const d = parseISODate(str);
  if (!d) return '';
  return `${d.getDate()} ${(window.BULAN||[])[d.getMonth()]||''} ${d.getFullYear()}`;
};
const parseISODate = window.parseISODate || function(str) {
  if (!str) return null;
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2]-1, +m[3]);
  return isNaN(d) ? null : d;
};
const toISODate = window.toISODate || function(d) {
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const todayISO = window.todayISO || function() { return toISODate(new Date()); };
const fmtWaktu = window.fmtWaktu || function(mulai, selesai) {
  if (!mulai) return '';
  if (!selesai || selesai === mulai) return fmtTgl(mulai);
  const a = parseISODate(mulai), b = parseISODate(selesai);
  if (!a || !b) return fmtTgl(mulai);
  if (a.getMonth()===b.getMonth() && a.getFullYear()===b.getFullYear())
    return `${a.getDate()} s.d. ${b.getDate()} ${(window.BULAN||[])[b.getMonth()]||''} ${b.getFullYear()}`;
  if (a.getFullYear()===b.getFullYear())
    return `${a.getDate()} ${(window.BULAN||[])[a.getMonth()]||''} s.d. ${b.getDate()} ${(window.BULAN||[])[b.getMonth()]||''} ${b.getFullYear()}`;
  return `${fmtTgl(mulai)} s.d. ${fmtTgl(selesai)}`;
};
const badgeHTML = window.badgeHTML || function(status) {
  if (status === 'selesai') {
    return `<span class="badge selesai"><img src="Assets/checked.png" class="badge-status-icon" alt="">Selesai</span>`;
  }
  if (status === 'menunggu') {
    return `<span class="badge menunggu"><img src="Assets/hour-glass.png" class="badge-status-icon" alt="">Menunggu</span>`;
  }
  return `<span class="badge draft">${esc(status || '—')}</span>`;
};

function normalizeStatusKepegawaian(p) {
  return String(p && (p.status_kepegawaian || p.status_pegawai || '') || 'aktif').trim().toLowerCase();
}

function tanggalPensiunPegawai(p) {
  return String(p && (p.tanggal_pensiun || p.tmt_pensiun || '') || '').slice(0, 10);
}

function isPegawaiPensiunAt(p, isoRef) {
  if (!p || p._isMitra) return false;
  const status = normalizeStatusKepegawaian(p);
  if (status !== 'pensiun') return false;
  const tglPensiun = tanggalPensiunPegawai(p);
  if (!tglPensiun) return true;
  return String(isoRef || todayISO()).slice(0, 10) >= tglPensiun;
}

function statusPegawaiLabel(p, isoRef) {
  if (!isPegawaiPensiunAt(p, isoRef)) return '';
  const tglPensiun = tanggalPensiunPegawai(p);
  return tglPensiun ? `Pensiun per ${fmtTgl(tglPensiun)}` : 'Pensiun';
}

/* ════════════════════════════════════════════════════════════════════
   PARSER TANGGAL FLEKSIBEL
═══════════════════════════════════════════════════════════════════════ */
const BULAN_KEYS = {
  'januari':1,'jan':1,'1':1,'01':1,
  'februari':2,'feb':2,'2':2,'02':2,
  'maret':3,'mar':3,'3':3,'03':3,
  'april':4,'apr':4,'4':4,'04':4,
  'mei':5,'5':5,'05':5,
  'juni':6,'jun':6,'6':6,'06':6,
  'juli':7,'jul':7,'7':7,'07':7,
  'agustus':8,'agu':8,'aug':8,'8':8,'08':8,
  'september':9,'sep':9,'sept':9,'9':9,'09':9,
  'oktober':10,'okt':10,'oct':10,'10':10,
  'november':11,'nov':11,'11':11,
  'desember':12,'des':12,'dec':12,'12':12,
};
function normYear(y) {
  y = parseInt(y, 10);
  if (isNaN(y)) return null;
  if (y < 100) return y < 50 ? 2000 + y : 1900 + y;
  return y;
}
function parseFlexDate(input) {
  if (!input) return null;
  let s = String(input).trim().toLowerCase();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})$/);
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3];
    if (mo>=1&&mo<=12&&d>=1&&d<=31) return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  const parts = s.split(/[\/\-\.\s]+/).filter(Boolean);
  if (parts.length === 3) {
    let [d, mo, y] = parts;
    const moKey = BULAN_KEYS[mo];
    if (moKey) {
      d = parseInt(d, 10);
      const yy = normYear(y);
      if (d>=1&&d<=31 && yy) return `${yy}-${String(moKey).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }
    d = parseInt(d, 10);
    mo = parseInt(mo, 10);
    const yy = normYear(y);
    if (d>=1&&d<=31&&mo>=1&&mo<=12&&yy) {
      return `${yy}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }
  }
  if (parts.length === 2) {
    let [d, mo] = parts;
    const moKey = BULAN_KEYS[mo] || (parseInt(mo,10) >= 1 && parseInt(mo,10) <= 12 ? parseInt(mo,10) : null);
    d = parseInt(d, 10);
    if (d>=1&&d<=31&&moKey) {
      const y = new Date().getFullYear();
      return `${y}-${String(moKey).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }
  }
  return null;
}

function parseFlexRange(input) {
  if (!input) return { mulai: '', selesai: '' };
  let s = String(input).trim();
  if (!s) return { mulai: '', selesai: '' };
  const seps = [' s.d. ', ' sd ', ' - ', ' s/d ', ' to ', ' – ', ' — ', '~'];
  for (const sep of seps) {
    const idx = s.toLowerCase().indexOf(sep);
    if (idx > 0) {
      const left = s.slice(0, idx).trim();
      const right = s.slice(idx + sep.length).trim();
      const a = parseFlexDate(left);
      const b = parseFlexDate(right);
      if (a) return { mulai: a, selesai: b || '' };
    }
  }
  const dashSplit = s.split(/\s+-\s+|\s+–\s+|\s+—\s+/);
  if (dashSplit.length === 2) {
    const a = parseFlexDate(dashSplit[0]);
    const b = parseFlexDate(dashSplit[1]);
    if (a) return { mulai: a, selesai: b || '' };
  }
  const single = parseFlexDate(s);
  if (single) return { mulai: single, selesai: '' };
  return { mulai: '', selesai: '' };
}

/* ════════════════════════════════════════════════════════════════════
   LOAD DATA
═══════════════════════════════════════════════════════════════════════ */
async function loadPegawai() {
  try {
    // Ambil semua kolom supaya status_kepegawaian/tanggal_pensiun ikut
    // tersedia setelah migration dijalankan, tanpa perlu ubah select lagi.
    const res = await fetch(`${SUPABASE_URL}/rest/v1/data_pegawai?select=*&order=nama.asc`, { headers: H });
    if (!res.ok) return;
    pegawaiList = await res.json();
    pegawaiByNIP = {};
    pegawaiList.forEach(p => {
      const nip = String(pegawaiNip(p) || '').trim();
      if (nip) pegawaiByNIP[nip] = p;
    });
  } catch(e) { console.warn('Gagal load pegawai:', e); }
}

/* ════════════════════════════════════════════════════════════════════
   MITRA — load + helpers untuk integrasi ke picker pegawai
   ─────────────────────────────────────────────────────────────────────
   Mitra direkrut tahunan, di-load semua tahun supaya:
   - Picker form bisa filter ke mitra tahun aktif (tahun saat ini)
   - Surat lama yang sudah me-reference mitra tahun sebelumnya tetap bisa
     resolve nama-nya saat preview/regenerate (audit trail terjaga).

   NIP placeholder format: MITRA-{tahun}-{id_3digit}
     contoh: MITRA-2026-042 → mitra id=42 tahun 2026
   ─────────────────────────────────────────────────────────────────
   Kenapa pakai NIP placeholder?
   - Tabel surat_tugas.pegawai_nip[] paralel index dengan pegawai_list[].
     Mitra HARUS punya entry di pegawai_nip[] supaya tidak rusak indexing.
   - Format readable & deterministik — admin bisa langsung tahu ini mitra
     ID berapa, tahun apa, kalau debug DB.
═══════════════════════════════════════════════════════════════════════ */

// Format ID mitra → NIP placeholder. Pad id ke 3 digit untuk konsistensi
// visual (mis. ID 5 → "MITRA-2026-005").
function formatMitraNip(tahun, id) {
  return `MITRA-${tahun}-${String(id).padStart(3, '0')}`;
}

// Cek apakah NIP adalah placeholder mitra (bukan NIP pegawai asli).
// Pegawai asli NIP-nya numerik 18 digit, mitra prefixed "MITRA-".
function isMitraNip(nip) {
  return typeof nip === 'string' && nip.startsWith('MITRA-');
}

async function loadMitra() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/mitra?select=id,tahun,nama,no_hp,jabatan,instansi&order=tahun.desc,nama.asc`, { headers: H });
    if (!res.ok) {
      // Tabel mitra mungkin belum dibuat — fallback ke array kosong, jangan
      // hard-fail. Picker tetap berfungsi untuk pegawai biasa.
      console.warn('[APA] loadMitra: HTTP', res.status, '— skip (tabel mungkin belum ada)');
      return;
    }
    mitraList = await res.json();
    mitraByNip = {};
    mitraList.forEach(m => {
      const nip = formatMitraNip(m.tahun, m.id);
      mitraByNip[nip] = m;
    });
  } catch(e) {
    console.warn('Gagal load mitra:', e);
  }
}

let riwayatJabatanByNip = new Map();
let riwayatPangkatByNip = new Map();
let riwayatGelarByNip   = new Map();

function buildRiwayatIndex(list, filterFn) {
  const map = new Map();
  (list || []).forEach(r => {
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

async function loadRiwayatJabatan() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/riwayat_jabatan?select=*&order=tmt.desc`, { headers: H });
    if (!res.ok) return;
    riwayatJabatan = await res.json();
    riwayatJabatanByNip = buildRiwayatIndex(riwayatJabatan, r => (r.jenis || 'utama') === 'utama');
  } catch(e) { console.warn('Gagal load riwayat_jabatan:', e); }
}

// Load riwayat pangkat/golongan — dipakai untuk lookup {pangkat_golongan_p}
// per pegawai di buildPegawaiRow. Di-index ke Map per NIP agar lookup O(1).
async function loadRiwayatPangkatGolongan() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/riwayat_pangkat_golongan?select=*&order=tmt.desc`, { headers: H });
    if (!res.ok) return;
    riwayatPangkatGolongan = await res.json();
    riwayatPangkatByNip = buildRiwayatIndex(riwayatPangkatGolongan);
  } catch(e) { console.warn('Gagal load riwayat_pangkat_golongan:', e); }
}

async function loadRiwayatGelar() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/riwayat_gelar?select=*&order=tmt.desc`, { headers: H });
    if (!res.ok) return;
    riwayatGelar = await res.json();
    riwayatGelarByNip = buildRiwayatIndex(riwayatGelar);
  } catch(e) { console.warn('Gagal load riwayat_gelar:', e); }
}

// Load daftar user → dipakai untuk tampilkan nama pengaju di kolom "Diajukan oleh"
async function loadUsers() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,username,full_name`, { headers: H });
    if (!res.ok) return;
    const list = await res.json();
    userMap = {};
    list.forEach(u => { userMap[u.id] = u; });
  } catch(e) { console.warn('Gagal load users:', e); }
}

function getPengajuNama(s) {
  const u = userMap[s.user_id];
  if (!u) return '';
  return u.full_name || u.username || '';
}

async function loadSurat(options = {}) {
  const resetPage = !!options.resetPage;
  closeAllPopups();
  document.getElementById('table-area').innerHTML = `<div style="padding:24px"><div class="skel" style="height:44px;border-radius:6px;margin-bottom:8px"></div><div class="skel" style="height:44px;border-radius:6px;margin-bottom:8px"></div><div class="skel" style="height:44px;border-radius:6px"></div></div>`;
  document.getElementById('table-count').textContent = 'Memuat...';
  const pager = document.getElementById('table-pagination');
  if (pager) pager.hidden = true;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/surat_tugas?select=*&order=created_at.asc,id.asc`, { headers: H });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ascList = await res.json();
    suratOrderMap = {};
    ascList.forEach((s, i) => { suratOrderMap[s.id] = i + 1; });
    allSurat = ascList.slice().reverse();
    suratMap = {};
    allSurat.forEach(s => { suratMap[s.id] = s; });
    if (resetPage) suratPage = 1;
    updateStats();
    filterTable({ resetPage: false });
  } catch(e) {
    closeAllPopups();
  document.getElementById('table-area').innerHTML = `<div class="table-empty"><div class="table-empty-icon">⚠️</div><div class="table-empty-text">Gagal memuat data: ${esc(e.message)}</div></div>`;
    document.getElementById('table-count').textContent = 'Error';
    renderPagination(0);
  }
}

/* ════════════════════════════════════════════════════════════════════
   TAMBAH SURAT (Tugas #4) — admin bikin surat baru tanpa lewat user
   ─────────────────────────────────────────────────────────────────────
   Insert row baru ke tabel `surat_tugas` dengan:
     - user_id    = SESSION.id (admin sendiri sebagai pengaju)
     - status     = 'menunggu'
     - field2 lain kosong/default
   Setelah insert, reload tabel (dengan dirty-preserve agar edit di
   baris menunggu lain tidak hilang) lalu scroll & focus ke baris baru
   supaya admin bisa langsung mengisi.
═══════════════════════════════════════════════════════════════════════ */
async function addNewSurat() {
  if (!SESSION || !SESSION.id) {
    showPageAlert('Sesi tidak valid. Silakan refresh halaman.', 'error');
    return;
  }

  // Disable tombol selama proses agar tidak double-click
  const btn = document.querySelector('button[onclick="addNewSurat()"]');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }

  // Payload minimal — sesuai pattern dari surat-tugas.html (user side).
  // Field-field detail (nomor_surat, penandatangan_*, tipe, dll.) di-NULL
  // dulu — admin akan mengisi via tabel inline lalu klik Setujui.
  const todayIso = todayISO();
  const payload = {
    user_id:           SESSION.id,
    perihal:           '',
    tanggal_berangkat: todayIso,
    tanggal_kembali:   null,
    tujuan:            '',
    pegawai_nip:       [],
    pegawai_list:      [],
    status:            'menunggu',
    created_at:        new Date().toISOString(),
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/surat_tugas`, {
      method: 'POST',
      headers: { ...H, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); msg = j.message || j.hint || msg; } catch(_) {}
      throw new Error(msg);
    }
    const inserted = await res.json();
    const newId = Array.isArray(inserted) && inserted.length ? inserted[0].id : null;

    // Reload tabel — pakai pattern dirty-preserve yg sama dgn submitApprove
    // supaya edit di baris menunggu lain (kalau ada) tidak hilang.
    const dirtySnapshot = captureMenungguDirty(null);
    await loadSurat({ resetPage: true });
    reapplyMenungguDirty(dirtySnapshot);

    // Scroll & focus ke baris baru, isi sel pertama (perihal) supaya admin
    // bisa langsung ngetik.
    if (newId != null) {
      setTimeout(() => {
        const newRow = document.querySelector(`tr[data-surat-id="${newId}"]`);
        if (newRow) {
          newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight sebentar agar visible
          newRow.classList.add('row-focused');
          setTimeout(() => newRow.classList.remove('row-focused'), 2000);
          // Focus ke sel perihal (text input pertama di baris)
          const firstCell = newRow.querySelector('.xls-cell[data-field="perihal"], .xls-cell, .pg-input');
          if (firstCell) {
            firstCell.focus();
            if (firstCell.select) try { firstCell.select(); } catch(_) {}
          }
        }
      }, 50);
    }
  } catch(e) {
    showPageAlert(`Gagal menambahkan: ${e.message}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = ''; }
  }
}

/**
 * Duplikat surat tugas yang sudah ada menjadi surat tugas baru berstatus "menunggu".
 */
async function duplicateSuratTugas(id) {
  if (!SESSION || !SESSION.id) {
    showPageAlert('Sesi tidak valid. Silakan refresh halaman.', 'error');
    return;
  }
  const s = suratMap[id];
  if (!s) return;

  const cur = collectRowFields(id);
  const todayIso = todayISO();

  const payload = {
    user_id:                SESSION.id,
    perihal:                (cur ? cur.perihal : s.perihal) || '',
    tanggal_surat:          todayIso,
    tanggal_berangkat:      (cur ? cur.tanggal_berangkat : s.tanggal_berangkat) || todayIso,
    tanggal_kembali:        (cur ? cur.tanggal_kembali : s.tanggal_kembali) || null,
    waktu_pelaksanaan_text: (cur ? cur.waktu_pelaksanaan_text : s.waktu_pelaksanaan_text) || '',
    tujuan:                 (cur ? cur.tujuan : s.tujuan) || '',
    pegawai_nip:            (cur && cur.pegawai_nip && cur.pegawai_nip.length) ? cur.pegawai_nip : (Array.isArray(s.pegawai_nip) ? [...s.pegawai_nip] : []),
    pegawai_list:           (cur && cur.pegawai_list && cur.pegawai_list.length) ? cur.pegawai_list : (Array.isArray(s.pegawai_list) ? [...s.pegawai_list] : []),
    bertugas_sebagai:       (cur ? cur.bertugas_sebagai : s.bertugas_sebagai) || null,
    alat_angkutan:          (cur ? cur.alat_angkutan : s.alat_angkutan) || '',
    pembebanan:             (cur ? cur.pembebanan : s.pembebanan) || '',
    menimbang_custom:       (cur ? cur.menimbang_custom : s.menimbang_custom) || '',
    penandatangan_nama:     (cur ? cur.penandatangan_nama : s.penandatangan_nama) || '',
    penandatangan_nip:      (cur ? cur.penandatangan_nip : s.penandatangan_nip) || '',
    tipe:                   (cur ? cur.tipe : s.tipe) || 'surat_tugas',
    nomor_surat:            '', // nomor surat baru kosong untuk diisi
    status:                 'menunggu', // selalu menunggu untuk hasil duplikat
    created_at:             new Date().toISOString(),
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/surat_tugas`, {
      method: 'POST',
      headers: { ...H, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); msg = j.message || j.hint || msg; } catch(_) {}
      throw new Error(msg);
    }
    const inserted = await res.json();
    const newId = Array.isArray(inserted) && inserted.length ? inserted[0].id : null;

    const dirtySnapshot = captureMenungguDirty(null);
    await loadSurat({ resetPage: true });
    reapplyMenungguDirty(dirtySnapshot);

    if (newId != null) {
      setTimeout(() => {
        const newRow = document.querySelector(`tr[data-surat-id="${newId}"]`);
        if (newRow) {
          newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          newRow.classList.add('row-focused');
          setTimeout(() => newRow.classList.remove('row-focused'), 2000);
          const firstCell = newRow.querySelector('.xls-cell[data-field="perihal"], .xls-cell, .pg-input');
          if (firstCell) {
            firstCell.focus();
            if (firstCell.select) try { firstCell.select(); } catch(_) {}
          }
        }
      }, 50);
    }
  } catch(e) {
    showPageAlert(`Gagal menduplikat surat tugas: ${e.message}`, 'error');
  }
}
window.duplicateSuratTugas = duplicateSuratTugas;

/**
 * Mengembalikan status surat tugas dari 'selesai' ke 'menunggu'.
 * Row otomatis menjadi editable inline kembali seperti sedia kala.
 */
async function batalSelesaiSuratTugas(id) {
  const s = suratMap[id];
  if (!s || s.status !== 'selesai') return;

  try {
    await patchSuratTugas(id, { status: 'menunggu' });
    const dirtySnapshot = captureMenungguDirty(null);
    await loadSurat();
    reapplyMenungguDirty(dirtySnapshot);
  } catch (err) {
    showPageAlert(`Gagal membatalkan status selesai: ${err.message}`, 'error');
  }
}
window.batalSelesaiSuratTugas = batalSelesaiSuratTugas;

function setFilterStatus(status) {
  const sel = document.getElementById('filter-status');
  if (sel) sel.value = status;
  document.querySelectorAll('.stat-card').forEach(card => {
    if ((card.dataset.status || '') === (status || '')) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
  filterTable({ resetPage: true });
}
window.setFilterStatus = setFilterStatus;

function updateStats() {
  document.getElementById('st-total').textContent    = allSurat.length;
  document.getElementById('st-menunggu').textContent = allSurat.filter(s => s.status === 'menunggu').length;
  document.getElementById('st-selesai').textContent  = allSurat.filter(s => s.status === 'selesai').length;
}

function filterTable(options = {}) {
  const resetPage = !!options.resetPage;
  const q  = (document.getElementById('search-input').value || '').toLowerCase().trim();
  const st = document.getElementById('filter-status').value;
  let f = allSurat;
  if (q)  f = f.filter(s => {
    const noSurat = String(s.nomor_surat || '').toLowerCase();
    const perihal = String(s.perihal || '').toLowerCase();
    const tujuan  = String(s.tujuan || '').toLowerCase();
    const pok     = String(s.pembebanan || '').toLowerCase();
    const pegList = Array.isArray(s.pegawai_list) ? s.pegawai_list.join(' ').toLowerCase() : '';
    const pegNip  = Array.isArray(s.pegawai_nip)  ? s.pegawai_nip.join(' ').toLowerCase()  : '';
    const ttd     = String(s.penandatangan_nama || '').toLowerCase();
    const ttdNip  = String(s.penandatangan_nip || '').toLowerCase();
    const pengaju = (getPengajuNama(s) || '').toLowerCase();
    const alat    = String(s.alat_angkutan || '').toLowerCase();

    return noSurat.includes(q) ||
           perihal.includes(q) ||
           tujuan.includes(q) ||
           pok.includes(q) ||
           pegList.includes(q) ||
           pegNip.includes(q) ||
           ttd.includes(q) ||
           ttdNip.includes(q) ||
           pengaju.includes(q) ||
           alat.includes(q);
  });
  if (st) f = f.filter(s => s.status === st);
  f = sortData(f);
  filteredSurat = f;

  const totalPages = Math.max(1, Math.ceil(filteredSurat.length / SURAT_PAGE_SIZE));
  if (resetPage) suratPage = 1;
  if (suratPage > totalPages) suratPage = totalPages;
  if (suratPage < 1) suratPage = 1;

  const start = (suratPage - 1) * SURAT_PAGE_SIZE;
  const pageRows = filteredSurat.slice(start, start + SURAT_PAGE_SIZE);
  renderTable(pageRows, filteredSurat.length);
}

function goSuratPage(page) {
  const nextPage = Number(page);
  if (!Number.isFinite(nextPage)) return;
  suratPage = Math.max(1, Math.floor(nextPage));
  filterTable({ resetPage: false });
  const wrap = document.querySelector('.table-wrap');
  if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildPageList(current, total) {
  const pages = new Set([1, total]);
  for (let p = current - 2; p <= current + 2; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

function renderPagination(totalFiltered) {
  const pager = document.getElementById('table-pagination');
  if (!pager) return;
  const total = Number(totalFiltered) || 0;
  if (!total || total <= SURAT_PAGE_SIZE) {
    pager.hidden = true;
    pager.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(total / SURAT_PAGE_SIZE));
  const start = (suratPage - 1) * SURAT_PAGE_SIZE + 1;
  const end = Math.min(total, suratPage * SURAT_PAGE_SIZE);
  const pageItems = buildPageList(suratPage, totalPages).map(item => {
    if (item === 'gap') return '<span class="pager-gap">...</span>';
    const active = item === suratPage ? ' active' : '';
    return `<button type="button" class="pager-btn${active}" onclick="goSuratPage(${item})" ${item === suratPage ? 'aria-current="page"' : ''}>${item}</button>`;
  }).join('');

  pager.hidden = false;
  pager.innerHTML = `
    <div class="pager-summary">Menampilkan ${start}-${end} dari ${total} surat</div>
    <div class="pager-actions">
      <button type="button" class="pager-btn pager-nav" onclick="goSuratPage(1)" ${suratPage <= 1 ? 'disabled' : ''}>Awal</button>
      <button type="button" class="pager-btn pager-nav" onclick="goSuratPage(${suratPage - 1})" ${suratPage <= 1 ? 'disabled' : ''}>Sebelumnya</button>
      ${pageItems}
      <button type="button" class="pager-btn pager-nav" onclick="goSuratPage(${suratPage + 1})" ${suratPage >= totalPages ? 'disabled' : ''}>Berikutnya</button>
      <button type="button" class="pager-btn pager-nav" onclick="goSuratPage(${totalPages})" ${suratPage >= totalPages ? 'disabled' : ''}>Akhir</button>
    </div>`;
}

/* ════════════════════════════════════════════════════════════════════
   SORTING
═══════════════════════════════════════════════════════════════════════ */
// Default: urut berdasarkan No. descending (terbaru di atas) —
// sama dengan perilaku sebelum fitur sort ditambahkan.
let sortState = { col: 'no', dir: 'desc' };

function sortData(arr) {
  const { col, dir } = sortState;
  const mul = dir === 'asc' ? 1 : -1;

  return arr.slice().sort((a, b) => {
    let va, vb;
    switch (col) {
      case 'no':
        va = suratOrderMap[a.id] || 0;
        vb = suratOrderMap[b.id] || 0;
        return (va - vb) * mul;

      case 'nomor_surat':
        va = (a.nomor_surat || '').toString();
        vb = (b.nomor_surat || '').toString();
        // numeric:true agar "008" < "010" sesuai angka, bukan string
        return va.localeCompare(vb, 'id', { numeric: true, sensitivity: 'base' }) * mul;

      case 'tanggal_surat':
        va = a.tanggal_surat || '';
        vb = b.tanggal_surat || '';
        return va.localeCompare(vb) * mul;

      case 'waktu':
        // Sort by tanggal_berangkat; tie-breaker: tanggal_kembali
        va = a.tanggal_berangkat || '';
        vb = b.tanggal_berangkat || '';
        if (va !== vb) return va.localeCompare(vb) * mul;
        va = a.tanggal_kembali || '';
        vb = b.tanggal_kembali || '';
        return va.localeCompare(vb) * mul;

      case 'perihal':
        va = (a.perihal || '').toLowerCase();
        vb = (b.perihal || '').toLowerCase();
        return va.localeCompare(vb, 'id') * mul;

      case 'tujuan':
        va = (a.tujuan || '').toLowerCase();
        vb = (b.tujuan || '').toLowerCase();
        return va.localeCompare(vb, 'id') * mul;

      case 'status': {
        // Urutan logis: menunggu → selesai
        const order = { menunggu: 0, selesai: 1 };
        va = order[a.status] ?? 99;
        vb = order[b.status] ?? 99;
        return (va - vb) * mul;
      }

      case 'pengaju':
        va = getPengajuNama(a).toLowerCase();
        vb = getPengajuNama(b).toLowerCase();
        return va.localeCompare(vb, 'id') * mul;

      default:
        return 0;
    }
  });
}

function setSort(col) {
  if (sortState.col === col) {
    sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.col = col;
    // Kolom yang "secara intuitif" lebih bermakna descending
    sortState.dir = ['no', 'tanggal_surat', 'waktu'].includes(col) ? 'desc' : 'asc';
  }
  filterTable({ resetPage: true });
}

function sortHeader(col, label, cssClass) {
  const isActive = sortState.col === col;
  const activeCls = isActive ? ' sorted' : '';
  return `<th class="${cssClass} sortable${activeCls}" onclick="setSort('${col}')" title="Klik untuk mengurutkan">${label}</th>`;
}

/* ════════════════════════════════════════════════════════════════════
   RENDER TABLE
═══════════════════════════════════════════════════════════════════════ */

// State: id surat yang sedang di-edit (status selesai di-unlock secara
// inline). null kalau tidak ada baris yg sedang di-edit. Hanya boleh ada
// 1 baris dalam mode edit pada satu waktu agar UX tidak ambigu.
let editingRowId = null;

/* Build HTML untuk SATU <tr> berdasarkan object surat.
   Dipisah dari renderTable() supaya bisa dipakai juga oleh enableRowEdit()
   dan cancelRowEdit() — keduanya hanya perlu re-render 1 baris, bukan
   seluruh tabel. */
function renderRowHTML(s) {
  const isMenunggu  = s.status === 'menunggu';
  const isSelesai   = s.status === 'selesai';
  const isEditing   = editingRowId === s.id;

  // Field-field unlocked kalau: status menunggu, ATAU baris ini sedang di-edit.
  const editable = isMenunggu || isEditing;

  const todayStr  = todayISO();
  const urutNo    = suratOrderMap[s.id] || '—';
  // Prefill nomor surat untuk status menunggu = urutan No. di-pad 3 digit.
  // Mis. No. = 8 → "008". Admin tetap bisa mengedit via sel input.
  const urutNomor = (typeof urutNo === 'number') ? String(urutNo).padStart(3, '0') : '';

  const nomorSurat   = s.nomor_surat   || (isMenunggu ? urutNomor : '');
  const tanggalSurat = s.tanggal_surat || (isMenunggu ? todayStr  : '');
  const waktuMulai   = s.tanggal_berangkat || '';
  const waktuSelesai = s.tanggal_kembali   || '';
  const perihal      = s.perihal      || '';
  const tujuan       = s.tujuan       || '';
  // Kolom-kolom berikut TIDAK di-prefill untuk status menunggu —
  // admin mengisi manual saat approve. Prefill default disimpan terpisah
  // dan hanya diterapkan di modal approve.
  const menimbang    = s.menimbang_custom || '';
  const alat         = s.alat_angkutan || '';
  const mak          = s.pembebanan    || '';
  const ttdNama      = s.penandatangan_nama || '';
  const ttdNip       = s.penandatangan_nip  || '';

  const pegNips  = Array.isArray(s.pegawai_nip)  ? s.pegawai_nip  : [];
  const pegNames = Array.isArray(s.pegawai_list) ? s.pegawai_list : [];

  let aksi;
  const btnDuplicate = `<button class="btn-duplicate btn-icon" onclick="duplicateSuratTugas(${s.id})" title="Duplikat surat tugas"><img src="Assets/copy.png" class="btn-action-icon" alt="Duplikat"></button>`;

  if (isMenunggu) {
    // Tombol utama "Selesai" tetap pakai label — eye-catching karena ini
    // aksi paling penting di row status menunggu.
    aksi = `
      <button class="btn-approve" onclick="openApprove(${s.id})"><img src="Assets/checked.png" class="btn-action-icon" alt=""> Selesai</button>
      ${btnDuplicate}`;
  } else if (isSelesai) {
    if (isEditing) {
      // Mode edit aktif — Simpan (label) & Batal (logo only).
      aksi = `
        <button class="btn-save-edit" onclick="saveRowEdit(${s.id})"><img src="Assets/checked.png" class="btn-action-icon" alt=""> Simpan</button>
        <button class="btn-cancel-edit btn-icon" onclick="cancelRowEdit(${s.id})" title="Batal edit"><img src="Assets/undo.png" class="btn-action-icon" alt="Batal"></button>`;
    } else {
      // Tombol Aksi status selesai: Batal Selesai (revert ke menunggu), Duplikat, Preview, Download.
      // Semua tombol pakai LOGO ONLY dari folder assets (30x30 compact).
      const btnBatalSelesai = `<button class="btn-batal-selesai btn-icon" onclick="batalSelesaiSuratTugas(${s.id})" title="Batal Selesai (Kembalikan ke status Menunggu)"><img src="Assets/undo.png" class="btn-action-icon" alt="Batal Selesai"></button>`;
      aksi = `
        ${btnBatalSelesai}
        ${btnDuplicate}
        <button class="btn-preview btn-icon" onclick="openPreview(${s.id})" title="Preview surat"><img src="Assets/preview.png" class="btn-action-icon" alt="Preview"></button>
        <button class="btn-download btn-icon" onclick="downloadSuratTugas(${s.id})" title="Download .docx"><img src="Assets/export.png" class="btn-action-icon" alt="Download"></button>`;
    }
  } else {
    // Status tidak dikenal — tampilkan placeholder
    aksi = `<span style="font-size:11px;color:var(--muted);font-style:italic">—</span>`;
  }

  // Checkbox dual-purpose:
  //   - Baris 'selesai'  → bulk-dl-check  (untuk bulk download, navy default)
  //   - Baris 'menunggu' → bulk-approve-check (untuk bulk approve, hijau via .ck-success)
  // Keduanya pakai kolom yang sama supaya layout konsisten.
  // Styling visual checkbox di-handle global oleh apa-shared.js — di sini
  // cukup tambahkan class .ck-success untuk varian hijau.
  const checkCell = isSelesai
    ? `<td class="col-check"><input type="checkbox" class="bulk-dl-check" data-surat-id="${s.id}" onchange="updateBulkDownloadCounter()"></td>`
    : `<td class="col-check"><input type="checkbox" class="bulk-approve-check ck-success" data-surat-id="${s.id}" onchange="updateBulkApproveCounter()" title="Pilih untuk bulk selesai"></td>`;

  // data-editing sebagai marker tambahan agar styling/CSS bisa membedakan
  // baris yg sedang di-edit (ditambah border kuning di seksi CSS).
  return `
    <tr data-surat-id="${escAttr(s.id)}" data-status="${escAttr(s.status || '')}"${isEditing ? ' data-editing="1"' : ''}>
      ${checkCell}
      <td class="col-no">${urutNo}</td>

      ${cellTextHTML(s.id, 'nomor_surat', nomorSurat, editable, 'cth: 001 / 013A')}
      ${cellDateHTML(s.id, 'tanggal_surat', tanggalSurat, editable, 'tgl/bln/thn')}
      ${cellDateRangeHTML(s.id, 'waktu', waktuMulai, waktuSelesai, editable, s.waktu_pelaksanaan_text)}
      ${cellTextareaHTML(s.id, 'perihal', perihal, editable, 'Perihal surat')}
      ${cellTextareaHTML(s.id, 'tujuan', tujuan, editable, 'Kota/instansi')}
      ${cellPegawaiMultiHTML(s.id, pegNips, pegNames, editable, s.bertugas_sebagai)}
      ${cellAlatHTML(s.id, alat, editable)}
      ${cellMAKHTML(s.id, mak, editable)}
      ${cellPenandatanganHTML(s.id, ttdNip, ttdNama, editable)}

      <td class="col-aksi"><div class="aksi-wrap">${aksi}</div></td>
      <td class="col-status">${badgeHTML(s.status)}</td>
      <td class="col-pengaju" title="${esc(getPengajuNama(s))}">${esc(getPengajuNama(s)) || '<span style="color:var(--muted);font-style:italic">—</span>'}</td>
    </tr>`;
}

/* Pasang event listener (autoGrow + clear err) untuk semua input/textarea
   editable di dalam scope tertentu. Default scope = whole document.
   Dipakai oleh renderTable (semua baris) dan setelah re-render 1 baris. */
function attachEditableListeners(scope) {
  const root = scope || document;
  root.querySelectorAll('textarea.xls-cell').forEach(ta => {
    if (ta.dataset.draftWired) return;
    ta.dataset.draftWired = '1';
    ta.addEventListener('input', () => { autoGrow(ta); ta.classList.remove('err'); });
    ta.addEventListener('blur', () => {
      const tr = ta.closest('tr[data-surat-id]');
      if (tr) snapshotAdminDraft(tr.dataset.suratId);
    });
  });
  root.querySelectorAll('input.xls-cell').forEach(inp => {
    if (inp.dataset.draftWired) return;
    inp.dataset.draftWired = '1';
    inp.addEventListener('input', () => inp.classList.remove('err'));
    inp.addEventListener('blur', () => {
      const tr = inp.closest('tr[data-surat-id]');
      if (tr) snapshotAdminDraft(tr.dataset.suratId);
    });
  });
  // Pegawai multi-tag dan penandatangan: trigger snapshot saat tag berubah
  // via MutationObserver pada attribute data-nips / data-nip.
  root.querySelectorAll('.pg-cell').forEach(pg => {
    if (pg.dataset.draftWired) return;
    pg.dataset.draftWired = '1';
    const obs = new MutationObserver(() => {
      const tr = pg.closest('tr[data-surat-id]');
      if (tr) snapshotAdminDraft(tr.dataset.suratId);
    });
    obs.observe(pg, { attributes: true, attributeFilter: ['data-nips', 'data-nip', 'data-roles', 'data-bertugas'] });
  });
}

/* ════════════════════════════════════════════════════════════════════
   #8: ADMIN DRAFT PERSIST
   ─────────────────────────────────────────────────────────────────────
   Strategi:
     - Per-row: key = apa_st_admin_draft_{userId}_{suratId}
     - Snapshot tiap blur field
     - Restore dipanggil setelah loadSurat() selesai render
     - Cleanup: setelah save row sukses (saveRowEdit / submitApprove) atau
       saat user explicit cancel edit (cancelRowEdit)
   ════════════════════════════════════════════════════════════════════ */
function getAdminDraftKey(suratId) {
  let uid = 'anon';
  try {
    const s = (typeof SESSION !== 'undefined' && SESSION && SESSION.id) ? SESSION : JSON.parse(localStorage.getItem('apa_user') || 'null');
    if (s && s.id) uid = String(s.id);
  } catch (_) {}
  return `apa_st_admin_draft_${uid}_${suratId}`;
}
function snapshotAdminDraft(suratId) {
  const values = collectRowFields(suratId);
  if (!values) return;
  // Cek apakah ada perubahan substansial dari original. Kalau row kosong
  // total (mungkin baru), tetap save supaya state baru di-preserve.
  const sOrig = suratMap[suratId];
  const isEmpty = !values.nomor_surat && !values.tanggal_surat
                  && !values.tanggal_berangkat && !values.perihal
                  && !values.tujuan && !values.menimbang_custom
                  && !values.alat_angkutan && !values.pembebanan
                  && !values.penandatangan_nip && !values.tipe
                  && (!values.pegawai_nip || !values.pegawai_nip.length);
  // Cek diff dengan original — kalau identik, tidak perlu save.
  const isUnchanged = sOrig
    && (values.nomor_surat   || '') === (sOrig.nomor_surat   || '')
    && (values.tanggal_surat || '') === (sOrig.tanggal_surat || '')
    && (values.tanggal_berangkat || '') === (sOrig.tanggal_berangkat || '')
    && (values.tanggal_kembali   || '') === (sOrig.tanggal_kembali   || '')
    && (values.waktu_pelaksanaan_text || '') === (sOrig.waktu_pelaksanaan_text || '')
    && (values.perihal       || '') === (sOrig.perihal       || '')
    && (values.tujuan        || '') === (sOrig.tujuan        || '')
    && (values.menimbang_custom || '') === (sOrig.menimbang_custom || '')
    && (values.alat_angkutan || '') === (sOrig.alat_angkutan || '')
    && (values.pembebanan    || '') === (sOrig.pembebanan    || '')
    && (values.penandatangan_nip  || '') === (sOrig.penandatangan_nip  || '')
    && (values.penandatangan_nama || '') === (sOrig.penandatangan_nama || '')
    && (values.tipe || '') === (sOrig.tipe || '')
    && JSON.stringify(values.pegawai_nip || []) === JSON.stringify(sOrig.pegawai_nip || []);
  try {
    if (isEmpty || isUnchanged) {
      localStorage.removeItem(getAdminDraftKey(suratId));
    } else {
      localStorage.setItem(getAdminDraftKey(suratId), JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        suratId: suratId,
        values: values,
      }));
      // Tampilkan toast "Draft tersimpan" — ringan, auto-hide 1.5 detik.
      showDraftSavedToast();
    }
  } catch (e) {
    console.warn('[Admin Draft] gagal save:', e);
  }
}
function clearAdminDraft(suratId) {
  try {
    const key = getAdminDraftKey(suratId);
    localStorage.removeItem(key);
  } catch (_) {}
}
function loadAdminDraft(suratId) {
  try {
    const key = getAdminDraftKey(suratId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.values) return null;
    return obj;
  } catch (_) { return null; }
}
/* Apply draft values ke row DOM. Dipanggil setelah renderTable() selesai. */
function applyAdminDraftToRow(suratId) {
  const draft = loadAdminDraft(suratId);
  if (!draft) return false;
  const row = document.querySelector(`tr[data-surat-id="${suratId}"]`);
  if (!row) return false;
  const v = draft.values;
  // Helper update text field
  const setVal = (field, val) => {
    const el = row.querySelector(`[data-field="${field}"]`);
    if (el && 'value' in el) el.value = val || '';
  };
  setVal('nomor_surat',      v.nomor_surat);
  setVal('perihal',          v.perihal);
  setVal('tujuan',           v.tujuan);
  setVal('pembebanan',       v.pembebanan);
  const alatCell = row.querySelector('.alat-cell[data-field="alat_angkutan"]');
  if (alatCell) setAlatCellValue(alatCell, v.alat_angkutan);
  else setVal('alat_angkutan', v.alat_angkutan);
  // Tanggal
  const tglSurat = row.querySelector('[data-field="tanggal_surat"]');
  if (tglSurat && v.tanggal_surat) {
    tglSurat.dataset.iso = v.tanggal_surat;
    tglSurat.value = fmtTgl(v.tanggal_surat);
  }
  const waktu = row.querySelector('[data-field="waktu"]');
  if (waktu) {
    waktu.dataset.isoMulai = v.tanggal_berangkat || '';
    waktu.dataset.isoSelesai = v.tanggal_kembali || '';
    waktu.dataset.waktuTextCustom = v.waktu_pelaksanaan_text || '';
    waktu.value = v.waktu_pelaksanaan_text || (v.tanggal_berangkat ? fmtWaktu(v.tanggal_berangkat, v.tanggal_kembali) : '');
  }
  
  // Pegawai multi
  const pegCell = row.querySelector('[data-field="pegawai_multi"]');
  if (pegCell && Array.isArray(v.pegawai_nip) && v.pegawai_nip.length) {
    if (window.apaPegawai) {
      window.apaPegawai.renderCell(pegCell, v.pegawai_nip, v.pegawai_list || [], v.bertugas_sebagai || []);
    } else {
      pegCell.dataset.nips = JSON.stringify(v.pegawai_nip);
      pegCell.dataset.names = JSON.stringify(v.pegawai_list || []);
      if (v.bertugas_sebagai) pegCell.dataset.roles = JSON.stringify(v.bertugas_sebagai);
    }
  }
  // Penandatangan single
  const ttdCell = row.querySelector('[data-field="penandatangan"]');
  if (ttdCell && v.penandatangan_nip) {
    if (window.apaPegawai) {
      window.apaPegawai.renderCell(ttdCell, [v.penandatangan_nip], [v.penandatangan_nama || v.penandatangan_nip]);
    } else {
      ttdCell.dataset.nip = v.penandatangan_nip;
      ttdCell.dataset.nama = v.penandatangan_nama || '';
    }
  }
  // Tipe (custom dropdown — pakai data-value pada .tp-cell)
  const tpCell = row.querySelector('.tp-cell[data-field="tipe"]');
  if (tpCell && v.tipe) {
    setTipeCellValue(tpCell, v.tipe);
  }
  // Auto-grow textarea di row setelah draft di-apply
  row.querySelectorAll('textarea.xls-cell').forEach(autoGrow);
  return true;
}
/* Restore semua draft yang ada untuk surat-surat yang lagi tampil. */
function restoreAllAdminDrafts() {
  let restoredCount = 0;
  Array.from(document.querySelectorAll('tr[data-surat-id]')).forEach(tr => {
    const id = tr.dataset.suratId;
    if (loadAdminDraft(id)) {
      // Untuk surat selesai, draft hanya boleh restore kalau editingRowId
      // sama dengan id (= user sebelumnya sedang edit baris ini).
      // Tapi karena editingRowId tidak persist (cuma in-memory state),
      // kita cek: kalau status selesai dan tidak sedang di-edit, draft
      // tidak applicable — skip.
      const s = suratMap[id];
      if (!s) return;
      if (s.status === 'selesai' && editingRowId !== Number(id)) {
        // Draft ada tapi user belum klik "Edit" — biarkan saja, akan
        // restore otomatis kalau user enable edit.
        return;
      }
      if (applyAdminDraftToRow(id)) restoredCount++;
    }
  });
  // Pastikan tinggi semua textarea sinkron setelah draft di-restore
  autoGrowAll();
}

function renderTable(data, totalFiltered = data.length) {
  const total = Number(totalFiltered) || 0;
  renderPagination(total);
  if (total) {
    const start = (suratPage - 1) * SURAT_PAGE_SIZE + 1;
    const end = Math.min(total, start + data.length - 1);
    document.getElementById('table-count').textContent = `${start}-${end} dari ${total} surat`;
  } else {
    document.getElementById('table-count').textContent = '0 surat';
  }
  if (!data.length) {
    closeAllPopups();
  document.getElementById('table-area').innerHTML = `<div class="table-empty"><div class="table-empty-icon">📭</div><div class="table-empty-text">Tidak ada surat tugas ditemukan.</div></div>`;
    return;
  }

  // Kalau baris yg sedang di-edit tidak ada di data (mis. ke-filter out),
  // reset state edit supaya tombol Edit muncul lagi saat baris kembali.
  if (editingRowId != null && !data.some(s => s.id === editingRowId)) {
    editingRowId = null;
  }

  const rows = data.map(renderRowHTML).join('');

  closeAllPopups();
  document.getElementById('table-area').innerHTML = `
    <table class="list-table">
      <thead><tr>
        <th class="col-check col-check-dual" title="☐ atas = centang semua selesai (bulk download) | ☐ bawah = centang semua menunggu (bulk approve)">
          <div class="th-check-inner">
            <input type="checkbox" id="bulk-dl-master" onchange="toggleBulkDownloadAll(this.checked)" title="Centang semua surat selesai untuk bulk download">
            <input type="checkbox" id="bulk-ap-master" class="ap-master ck-success" onchange="toggleBulkApproveAll(this.checked)" title="Centang semua surat menunggu untuk bulk approve">
          </div>
        </th>
        ${sortHeader('no',            'No',                'col-no')}
        ${sortHeader('nomor_surat',   'Nomor Surat',       'col-nomor-surat')}
        ${sortHeader('tanggal_surat', 'Tanggal Surat',     'col-tgl-surat')}
        ${sortHeader('waktu',         'Waktu Pelaksanaan', 'col-waktu')}
        ${sortHeader('perihal',       'Perihal',           'col-perihal')}
        ${sortHeader('tujuan',        'Tempat Tujuan',     'col-tujuan')}
        <th class="col-nama">Nama</th>
        <th class="col-alat">Alat Angkutan</th>
        <th class="col-mak">POK</th>
        <th class="col-ttd">Penandatangan</th>
        <th class="col-aksi">Aksi</th>
        ${sortHeader('status',        'Status',            'col-status')}
        ${sortHeader('pengaju',       'Diajukan oleh',     'col-pengaju')}
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  requestAnimationFrame(() => {
    // Restore draft terlebih dahulu sebelum pasang MutationObserver, lalu batch 1x autoGrowAll
    restoreAllAdminDrafts();
    attachEditableListeners();
    autoGrowAll();
    setupTopScrollbar();
    updateBulkDownloadCounter();
    updateBulkApproveCounter();
  });
}

/* ════════════════════════════════════════════════════════════════════
   TOP SCROLLBAR — sinkron dengan scrollbar bawah
   Memungkinkan admin menggeser tabel horizontal tanpa harus scroll
   page ke baris paling bawah dulu.
═══════════════════════════════════════════════════════════════════════ */
function setupTopScrollbar() {
  const top      = document.getElementById('table-scroll-top');
  const topInner = document.getElementById('table-scroll-top-inner');
  const bottom   = document.getElementById('table-area');
  const sticky   = document.getElementById('table-sticky-cols');
  if (!top || !topInner || !bottom) return;
  const head = document.querySelector('.table-wrap .table-head');
  const headH = head ? Math.ceil(head.getBoundingClientRect().height) : 48;
  document.documentElement.style.setProperty('--st-table-head-h', `${headH}px`);
  bindMainScrollForStickyHeader();

  const tableEl    = bottom.querySelector('table');
  const tableWidth = tableEl ? tableEl.scrollWidth : bottom.scrollWidth;
  topInner.style.width = tableWidth + 'px';
  syncStickyColumnHeader(tableEl, tableWidth);

  // Sembunyikan top scrollbar kalau tabel tidak overflow horizontal
  // (mis. layar lebar / data sedikit kolomnya)
  if (tableWidth <= bottom.clientWidth) {
    top.style.display = 'none';
    document.documentElement.style.setProperty('--st-table-header-top', `${headH}px`);
    updateTableStickyState();
    return;
  }
  top.style.display = '';
  const topH = Math.ceil(top.getBoundingClientRect().height) || 11;
  document.documentElement.style.setProperty('--st-table-header-top', `${headH + topH}px`);

  // Pasang sync listener satu kali saja (idempotent — pakai flag di element)
  if (!top._syncBound) {
    let syncing = false;
    top.addEventListener('scroll', () => {
      if (syncing) return;
      syncing = true;
      bottom.scrollLeft = top.scrollLeft;
      if (sticky) sticky.scrollLeft = top.scrollLeft;
      requestAnimationFrame(() => { syncing = false; });
    });
    bottom.addEventListener('scroll', () => {
      if (syncing) return;
      syncing = true;
      top.scrollLeft = bottom.scrollLeft;
      if (sticky) sticky.scrollLeft = bottom.scrollLeft;
      requestAnimationFrame(() => { syncing = false; });
    });
    top._syncBound = true;
  }
  updateTableStickyState();
}

// Re-sync saat window di-resize (lebar tabel & overflow bisa berubah)
function syncStickyColumnHeader(tableEl, tableWidth) {
  const sticky = document.getElementById('table-sticky-cols');
  if (!sticky || !tableEl) return;
  const thead = tableEl.querySelector('thead');
  if (!thead) {
    sticky.innerHTML = '';
    return;
  }
  const clonedThead = thead.cloneNode(true);
  // Hapus atribut id hasil kloning agar tidak terjadi duplicate DOM ID (#bulk-dl-master, #bulk-ap-master)
  clonedThead.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  sticky.innerHTML = `<table class="list-table" style="width:${tableWidth}px"></table>`;
  sticky.firstElementChild.appendChild(clonedThead);
  sticky.scrollLeft = document.getElementById('table-area')?.scrollLeft || 0;
}

function updateTableStickyState() {
  const wrap = document.querySelector('.table-wrap');
  if (!wrap) return;
  const scroller = document.querySelector('.main');
  const scrollerTop = scroller ? scroller.getBoundingClientRect().top : 0;
  wrap.classList.toggle('table-is-stuck', wrap.getBoundingClientRect().top <= scrollerTop);
}

function bindMainScrollForStickyHeader() {
  const scroller = document.querySelector('.main');
  if (!scroller || scroller._stickyHeaderBound) return;
  scroller.addEventListener('scroll', updateTableStickyState, { passive: true });
  scroller._stickyHeaderBound = true;
}

let _resizeDebounceTimer = null;
window.addEventListener('resize', () => {
  if (_resizeDebounceTimer) clearTimeout(_resizeDebounceTimer);
  _resizeDebounceTimer = setTimeout(() => {
    setupTopScrollbar();
    updateTableStickyState();
    autoGrowAll();
  }, 150);
});

let _scrollRafPending = false;
window.addEventListener('scroll', () => {
  if (_scrollRafPending) return;
  _scrollRafPending = true;
  requestAnimationFrame(() => {
    _scrollRafPending = false;
    updateTableStickyState();
  });
}, { capture: true, passive: true });

function autoGrow(el) {
  if (!el || !el.style) return;
  el.style.height = 'auto';
  const h = el.scrollHeight;
  if (h > 0) el.style.height = Math.max(h, 38) + 'px';
}

// Batched read-then-write agar tidak memicu layout thrashing berulang
function autoGrowAll(scope) {
  const root = scope || document;
  const tas = Array.from(root.querySelectorAll('textarea.xls-cell'));
  if (!tas.length) return;
  tas.forEach(ta => { ta.style.height = 'auto'; });
  const heights = tas.map(ta => ta.scrollHeight);
  tas.forEach((ta, i) => {
    if (heights[i] > 0) ta.style.height = Math.max(heights[i], 38) + 'px';
  });
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => autoGrowAll());
}

/* ─────────────────────────────────────────────────────────────────────
   CELL BUILDERS
   Semua readonly cell kini punya tabindex="0" dan data-col-field
   sehingga bisa difokus, diselect, dicopy, dan dinavigasi dengan arrow.
───────────────────────────────────────────────────────────────────── */
const FIELD_TO_COL = {
  nomor_surat:      'col-nomor-surat',
  tanggal_surat:    'col-tgl-surat',
  waktu:            'col-waktu',
  perihal:          'col-perihal',
  tujuan:           'col-tujuan',
  pegawai_multi:    'col-nama',
  menimbang_custom: 'col-menimbang',
  alat_angkutan:    'col-alat',
  pembebanan:       'col-mak',
  penandatangan:    'col-ttd',
  tipe:             'col-tipe',
};

function cellTextHTML(id, field, val, editable, placeholder) {
  const cls = FIELD_TO_COL[field] || '';
  if (!editable) {
    return `<td class="${cls}">
      <div class="ro-text${val ? '' : ' muted'}"
           tabindex="0" data-col-field="${field}">${val ? esc(val) : '—'}</div>
    </td>`;
  }
  return `<td class="${cls}">
    <input type="text" class="xls-cell" data-field="${field}" data-id="${id}"
      data-col-field="${field}"
      value="${escAttr(val)}" placeholder="${escAttr(placeholder)}">
  </td>`;
}

function cellTextareaHTML(id, field, val, editable, placeholder) {
  const cls = FIELD_TO_COL[field] || '';
  if (!editable) {
    return `<td class="${cls}">
      <div class="ro-text${val ? '' : ' muted'}"
           tabindex="0" data-col-field="${field}">${val ? esc(val) : '—'}</div>
    </td>`;
  }
  return `<td class="${cls}">
    <textarea class="xls-cell" rows="1" data-field="${field}" data-id="${id}"
      data-col-field="${field}"
      placeholder="${escAttr(placeholder)}">${esc(val)}</textarea>
  </td>`;
}

const ALAT_ANGKUTAN_OPTIONS = [
  { value: 'Angkutan Darat', label: 'Angkutan Darat', icon: '🚗' },
  { value: 'Angkutan Udara', label: 'Angkutan Udara', icon: '✈️' },
  { value: 'Angkutan Laut',  label: 'Angkutan Laut',  icon: '🚢' },
  { value: 'Angkutan Umum',  label: 'Angkutan Umum',  icon: '🚌' },
];

function cellAlatHTML(id, val, editable) {
  if (!editable) {
    return `<td class="col-alat">
      <div class="ro-text${val ? '' : ' muted'}"
           tabindex="0" data-col-field="alat_angkutan">${val ? esc(val) : '—'}</div>
    </td>`;
  }
  const display = val || 'Pilih alat...';
  const isEmpty = !val;
  return `<td class="col-alat">
    <div class="alat-cell${isEmpty ? ' is-empty' : ' has-value'}"
      data-field="alat_angkutan" data-col-field="alat_angkutan" data-id="${id}"
      data-value="${escAttr(val || '')}"
      tabindex="0"
      onclick="openAlatDropdown(this)"
      onkeydown="onAlatCellKeydown(event, this)">
      <span class="alat-cell-text">${esc(display)}</span>
    </div>
  </td>`;
}

function setAlatCellValue(cellEl, value) {
  if (!cellEl) return;
  const clean = (value || '').trim();
  cellEl.dataset.value = clean;
  const textEl = cellEl.querySelector('.alat-cell-text');
  if (textEl) {
    textEl.textContent = clean || 'Pilih alat...';
  }
  cellEl.classList.toggle('is-empty', !clean);
  cellEl.classList.toggle('has-value', !!clean);
}


/* Cell khusus utk kolom Tipe — render <select> dengan 7 pilihan kalau
   editable, atau ro-text kalau status sudah selesai.
   Value NULL/empty di-display sebagai '—' (readonly) atau placeholder
   "— Pilih tipe —" (editable) — admin wajib pilih sebelum approve. */
function cellTipeHTML(id, val, editable) {
  if (!editable) {
    const label = tipeLabel(val);
    return `<td class="col-tipe">
      <div class="ro-text${val ? '' : ' muted'}"
           tabindex="0" data-col-field="tipe" data-value="${escAttr(val || '')}">${val ? esc(label) : '—'}</div>
    </td>`;
  }
  const tag = val ? buildTipeTag(val) : '';
  const placeholder = val ? '' : 'Pilih tipe...';
  return `<td class="col-tipe">
    <div class="tp-cell" data-field="tipe" data-col-field="tipe" data-id="${id}"
      data-value="${escAttr(val || '')}"
      onclick="onTpCellClick(event, this)">
      ${tag}
      <input type="text" class="tp-input" placeholder="${placeholder}"
        oninput="onTpInput(event, this)"
        onkeydown="onTpKeydown(event, this)"
        onfocus="onTpInputFocus(this)"
        onblur="onTpInputBlur(this)">
    </div>
  </td>`;
}

function buildTipeTag(val) {
  const label = tipeLabel(val);
  return `<span class="tp-tag" data-value="${escAttr(val)}" title="${escAttr(label)}">
    <span class="tp-tag-text">${esc(label)}</span>
    <button type="button" class="tp-tag-x" onclick="onTpTagRemove(event, this)">×</button>
  </span>`;
}

function setTipeCellValue(cellEl, value) {
  if (!cellEl) return null;
  const cleanValue = value || '';
  cellEl.dataset.value = cleanValue;
  cellEl.classList.remove('err');
  cellEl.querySelectorAll('.tp-tag').forEach(tag => tag.remove());
  const inp = cellEl.querySelector('.tp-input');
  if (cleanValue) {
    cellEl.insertAdjacentHTML('afterbegin', buildTipeTag(cleanValue));
  }
  if (inp) {
    inp.value = '';
    inp.placeholder = cleanValue ? '' : 'Pilih tipe...';
  }
  return inp;
}

function cellDateHTML(id, field, isoVal, editable, placeholder) {
  if (!editable) {
    return `<td class="col-tgl-surat">
      <div class="ro-text${isoVal ? '' : ' muted'}"
           tabindex="0" data-col-field="${field}">${isoVal ? esc(fmtTgl(isoVal)) : '—'}</div>
    </td>`;
  }
  const display = isoVal ? fmtTgl(isoVal) : '';
  return `<td class="col-tgl-surat">
    <textarea class="xls-cell" rows="1" data-field="${field}" data-id="${id}"
      data-col-field="${field}"
      data-iso="${escAttr(isoVal)}"
      placeholder="${escAttr(placeholder)}"
      onblur="onDateBlur(this)"
      onfocus="onDateFocus(this)"
      onclick="openCal(this, false)"
      ondblclick="openCal(this, false)"
      onkeydown="if(event.altKey&&event.key==='ArrowDown'){event.preventDefault();openCal(this,false);}">${esc(display)}</textarea>
  </td>`;
}

function cellDateRangeHTML(id, field, isoMulai, isoSelesai, editable, waktuTextCustom) {
  if (!editable) {
    const hasCustom = !!(waktuTextCustom && waktuTextCustom.trim());
    const displayText = hasCustom ? waktuTextCustom : (isoMulai ? fmtWaktu(isoMulai, isoSelesai) : '');
    const isEmpty = !displayText;
    return `<td class="col-waktu">
      <div class="ro-text${isEmpty ? ' muted' : ''}"
           tabindex="0" data-col-field="${field}">${isEmpty ? '—' : esc(displayText)}</div>
    </td>`;
  }
  const display = waktuTextCustom || (isoMulai ? fmtWaktu(isoMulai, isoSelesai) : '');
  return `<td class="col-waktu">
    <textarea class="xls-cell" rows="1" data-field="${field}" data-id="${id}"
      data-col-field="${field}"
      data-iso-mulai="${escAttr(isoMulai)}"
      data-iso-selesai="${escAttr(isoSelesai || '')}"
      data-waktu-text-custom="${escAttr(waktuTextCustom || '')}"
      placeholder="tgl atau rentang"
      onblur="onRangeBlur(this)"
      onclick="openCal(this, true)"
      ondblclick="openCal(this, true)"
      onkeydown="if(event.altKey&&event.key==='ArrowDown'){event.preventDefault();openCal(this,true);}">${esc(display)}</textarea>
  </td>`;
}



function cellPegawaiMultiHTML(id, nips, names, editable, roles) {
  nips = Array.isArray(nips) ? nips : [];
  names = Array.isArray(names) ? names : [];
  roles = Array.isArray(roles) ? roles : [];

  if (!editable) {
    if (!names.length) {
      return `<td class="col-nama">
        <div class="ro-text muted" tabindex="0" data-col-field="pegawai_multi">—</div>
      </td>`;
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
    return `<td class="col-nama">
      <div class="ro-text" tabindex="0" data-col-field="pegawai_multi">${names.map(esc).join(', ')}</div>
    </td>`;
  }

  let contentHtml = '';
  if (!nips.length) {
    contentHtml = `<span class="apa-pg-placeholder">Pilih pegawai / mitra...</span>`;
  } else if (nips.length === 1) {
    const nama = names[0] || nips[0];
    contentHtml = `<span class="apa-pg-single-name" title="${esc(nama)}">${esc(nama)}</span>`;
  } else {
    contentHtml = `<span class="apa-pg-badge-terlampir" title="${esc(names.join(', '))}">
      Terlampir
      <span class="count-pill">${nips.length}</span>
    </span>`;
  }

  return `<td class="col-nama">
    <div class="pg-cell" data-field="pegawai_multi" data-col-field="pegawai_multi" data-id="${id}"
      tabindex="0"
      data-nips='${escAttr(JSON.stringify(nips))}'
      data-names='${escAttr(JSON.stringify(names))}'
      data-roles='${escAttr(JSON.stringify(roles))}'
      onclick="openAc(this, false)">
      <div class="apa-pg-cell-wrapper">
        ${contentHtml}
      </div>
    </div>
  </td>`;
}

function cellPenandatanganHTML(id, nip, nama, editable) {
  const displayName = nama || (nip ? 'Pegawai ' + nip : '');
  if (!editable) {
    if (!displayName) {
      return `<td class="col-ttd">
        <div class="ro-text muted" tabindex="0" data-col-field="penandatangan">—</div>
      </td>`;
    }
    return `<td class="col-ttd">
      <div class="ro-text" tabindex="0" data-col-field="penandatangan">${esc(displayName)}</div>
    </td>`;
  }

  let contentHtml = '';
  if (!displayName) {
    contentHtml = `<span class="apa-pg-placeholder">Pilih penandatangan...</span>`;
  } else {
    contentHtml = `<span class="apa-pg-single-name" title="${esc(displayName)}">${esc(displayName)}</span>`;
  }

  return `<td class="col-ttd">
    <div class="pg-cell single" data-field="penandatangan" data-col-field="penandatangan" data-id="${id}"
      tabindex="0"
      data-nip="${escAttr(nip || '')}"
      data-nama="${escAttr(nama || '')}"
      onclick="openAc(this, true)">
      <div class="apa-pg-cell-wrapper">
        ${contentHtml}
      </div>
    </div>
  </td>`;
}

function buildPegTag(nip, nama, single) {
  const cls = single ? 'pg-tag single' : 'pg-tag';
  const display = nama && nama.length > 22 ? nama.slice(0, 20) + '…' : nama;
  return `<span class="${cls}" data-nip="${escAttr(nip)}" title="${escAttr(nama)}">
    <span class="pg-tag-text">${esc(display)}</span>
  </span>`;
}


/* ════════════════════════════════════════════════════════════════════
   DATE INPUT BEHAVIOR
═══════════════════════════════════════════════════════════════════════ */
function onDateFocus(el) {
  const iso = el.dataset.iso || '';
  if (iso) {
    const d = parseISODate(iso);
    if (d) el.value = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
  }
  setTimeout(() => el.select(), 0);
}

function onDateBlur(el) {
  if (window.apaCalendar && window.apaCalendar.isOpen()) return;

  const txt = el.value.trim();
  if (!txt) {
    el.dataset.iso = '';
    el.value = '';
    return;
  }
  const iso = parseFlexDate(txt);
  if (iso) {
    el.dataset.iso = iso;
    el.value = fmtTgl(iso);
    el.classList.remove('err');
  } else {
    el.classList.add('err');
  }
}
function onRangeBlur(el) {
  if (window.apaCalendar && window.apaCalendar.isOpen()) return;

  const txt = el.value.trim();
  if (!txt) {
    el.dataset.isoMulai = '';
    el.dataset.isoSelesai = '';
    el.dataset.waktuTextCustom = '';
    el.value = '';
    el.classList.remove('err');
    return;
  }

  // Jika teks sama dengan tampilan kalender atau custom text saat ini, pertahankan
  const currentFormatted = el.dataset.isoMulai ? fmtWaktu(el.dataset.isoMulai, el.dataset.isoSelesai || '') : '';
  if (el.dataset.waktuTextCustom && txt === el.dataset.waktuTextCustom.trim()) {
    el.classList.remove('err');
    return;
  }
  if (el.dataset.isoMulai && txt === currentFormatted) {
    el.classList.remove('err');
    return;
  }

  const r = parseFlexRange(txt);
  if (r.mulai) {
    el.dataset.isoMulai   = r.mulai;
    el.dataset.isoSelesai = r.selesai || '';
    el.dataset.waktuTextCustom = '';
    el.value = fmtWaktu(r.mulai, r.selesai);
    el.classList.remove('err');
  } else if (el.dataset.isoMulai) {
    el.value = el.dataset.waktuTextCustom || currentFormatted;
    el.classList.remove('err');
  } else {
    el.classList.add('err');
  }
}
/* ════════════════════════════════════════════════════════════════════
   CALENDAR (Dikelola terpusat secara global oleh apa-calendar.js)
═══════════════════════════════════════════════════════════════════════ */
function openCal(el, isRange) {
  closeAc();
  closeMakAc();
  closeTpAc();
  closeAlatDropdown();
  if (window.apaCalendar) {
    window.apaCalendar.open(el, isRange);
  }
}

function closeCal() {
  if (window.apaCalendar) {
    window.apaCalendar.close();
  }
}

/* ════════════════════════════════════════════════════════════════════
   AUTOCOMPLETE PEGAWAI & MITRA (Global apaPegawai bridge)
═══════════════════════════════════════════════════════════════════════ */
let acState = {
  cellEl: null,
  isSingle: false,
};

function openAc(cellEl, isSingle) {
  closeCal();
  closeMakAc();
  closeTpAc();
  closeAlatDropdown();
  if (window.apaPegawai) {
    window.apaPegawai.open(cellEl, isSingle, () => {
      const tr = cellEl.closest('tr[data-surat-id]');
      if (tr) snapshotAdminDraft(tr.dataset.suratId);
    });
  }
}

function closeAc() {
  if (window.apaPegawai) {
    window.apaPegawai.close();
  }
}


/* ════════════════════════════════════════════════════════════════════
   AUTOCOMPLETE POK (MAK PEMBEBANAN)

   Sumber data: distinct `pembebanan` dari tabel surat_tugas (history).
   MAK yang sering dipakai akan muncul di atas (sorted by frequency).
   User tetap bisa ketik MAK baru — validasi format pakai parseMAK()
   yang sudah ada (regex MAK_REGEX). Free-text fallback didukung untuk
   MAK yang belum pernah dipakai sebelumnya.
═══════════════════════════════════════════════════════════════════════ */
let makSuggestions = [];   // [{mak, count, ringkasan}]
let makACState = {
  cellEl:   null,
  inputEl:  null,
  filtered: [],
  focusIdx: -1,
  suppressUntil: 0,
};

async function loadMAKSuggestions() {
  try {
    let rows = Array.isArray(allSurat) && allSurat.length ? allSurat : null;
    if (!rows) {
      const url = `${SUPABASE_URL}/rest/v1/surat_tugas?select=pembebanan&pembebanan=not.is.null`;
      const res = await fetch(url, { headers: H });
      if (!res.ok) {
        console.warn(`[APA] loadMAKSuggestions HTTP ${res.status}`);
        return;
      }
      rows = await res.json();
    }
    // Hitung frekuensi pemakaian per MAK valid
    const counts = {};
    rows.forEach(r => {
      const m = (r.pembebanan || '').trim();
      if (m && parseMAK(m)) counts[m] = (counts[m] || 0) + 1;
    });
    makSuggestions = Object.entries(counts)
      .map(([mak, count]) => ({ mak, count, ringkasan: '' }))
      .sort((a, b) => b.count - a.count);
    // Bangun ringkasan (deskripsi gabungan) — load kamus_pok kalau ada
    await enrichMakSuggestionsWithDeskripsi();
    console.log(`[APA] loadMAKSuggestions: ${makSuggestions.length} unique MAK`);
  } catch (e) {
    console.warn('[APA] loadMAKSuggestions error:', e);
  }
}

async function enrichMakSuggestionsWithDeskripsi() {
  if (!makSuggestions.length) return;
  // Pakai tahun saat ini sebagai default lookup. Deskripsi cuma untuk
  // membantu admin mengenali MAK; kalau ada beda antar tahun, anggap saja
  // sebagai hint informatif, bukan otoritatif.
  const tahun = new Date().getFullYear();
  try {
    if (typeof loadKamusPok === 'function') await loadKamusPok(tahun);
  } catch (_) {}

  makSuggestions.forEach(s => {
    const mak = parseMAK(s.mak);
    if (!mak || typeof lookupDeskripsi !== 'function') return;
    const desKgt = lookupDeskripsi('kegiatan', mak.kegiatan);
    const desAkn = lookupDeskripsi('akun',     mak.akun);
    // Format ringkas: "Kegiatan ... · Akun ..."
    const parts = [];
    if (desKgt) parts.push(desKgt);
    if (desAkn) parts.push(desAkn);
    s.ringkasan = parts.join(' · ');
  });
}

function cellMAKHTML(id, val, editable) {
  if (!editable) {
    return `<td class="col-mak">
      <div class="ro-text${val ? '' : ' muted'}" tabindex="0" data-col-field="pembebanan">${val ? esc(val) : '—'}</div>
    </td>`;
  }
  return `<td class="col-mak">
    <textarea class="xls-cell mak-input" rows="1" data-field="pembebanan" data-id="${id}"
      data-col-field="pembebanan"
      placeholder="cth: 054.01.GG.2910.BMA.006.054.A.524119"
      oninput="onMAKInput(this)"
      onfocus="onMAKFocus(this)"
      onblur="onMAKBlur(this)"
      onkeydown="onMAKKeydown(event, this)"
      autocomplete="off">${esc(val || '')}</textarea>
  </td>`;
}

function onMAKFocus(inp) {
  if (Date.now() < makACState.suppressUntil) return;
  openMakAc(inp);
}

function onMAKBlur(inp) {
  // Delay supaya klik pada item popup sempat ke-handle sebelum popup ditutup
  setTimeout(() => {
    const ae = document.activeElement;
    if (!ae || !document.getElementById('mak-ac-popup').contains(ae)) {
      if (!ae || !ae.classList.contains('mak-input')) closeMakAc();
    }
  }, 150);
}

function onMAKInput(inp) {
  if (Date.now() < makACState.suppressUntil) return;
  makACState.inputEl = inp;
  if (!document.getElementById('mak-ac-popup').classList.contains('open')) {
    openMakAc(inp);
  }
  makAcFilter(inp.value);
}

function onMAKKeydown(e, inp) {
  const popup = document.getElementById('mak-ac-popup');
  const isOpen = popup.classList.contains('open');

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
      // Cegah newline — POK secara semantik adalah satu kode, bukan
      // multi-line. Wrap visual hanya supaya teks panjang terlihat,
      // bukan untuk menampung baris baru.
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
    // Enter HANYA untuk pilih item dari dropdown — TIDAK pindah cell.
    // Selalu preventDefault supaya textarea tidak menyisipkan newline,
    // baik ada item terpilih maupun tidak.
    e.preventDefault();
    if (makACState.focusIdx >= 0 && makACState.filtered[makACState.focusIdx]) {
      pickMAK(makACState.filtered[makACState.focusIdx].mak);
    }
    // Kalau tidak ada item terpilih → no-op (sesuai single-line behavior).
  } else if (e.key === 'Tab') {
    closeMakAc(); // biar handler Tab global yang pindah cell
  }
}

function openMakAc(inp) {
  closeCal();
  closeAc();
  closeTpAc();
  closeAlatDropdown();
  makACState.inputEl = inp;
  makACState.cellEl = inp.closest('td');
  makACState.focusIdx = -1;
  const popup = document.getElementById('mak-ac-popup');
  popup.classList.add('open');
  positionPopup(popup, inp);
  makAcFilter(inp.value);
}

function closeMakAc(restoreFocus = false) {
  const popup = document.getElementById('mak-ac-popup');
  if (popup) popup.classList.remove('open');
  const inpToRestore = makACState.inputEl;
  makACState.cellEl = null;
  makACState.inputEl = null;
  makACState.filtered = [];
  makACState.focusIdx = -1;
  if (restoreFocus && inpToRestore && typeof inpToRestore.focus === 'function') {
    inpToRestore.focus();
  }
}

function makAcFilter(q) {
  q = (q || '').toLowerCase().trim();
  makACState.filtered = makSuggestions.filter(s => {
    if (!q) return true;
    return s.mak.toLowerCase().includes(q) ||
           (s.ringkasan && s.ringkasan.toLowerCase().includes(q));
  }).slice(0, 50);
  makACState.focusIdx = -1;
  makAcRenderList();
  document.getElementById('mak-ac-count').textContent = `${makACState.filtered.length} hasil`;
}

function makAcRenderList() {
  const list = document.getElementById('mak-ac-list');
  if (!makSuggestions.length) {
    list.innerHTML = `<div class="mak-ac-empty">Belum ada riwayat POK.<br><span style="font-size:10.5px">Ketik MAK manual sesuai format.</span></div>`;
    return;
  }
  if (!makACState.filtered.length) {
    list.innerHTML = `<div class="mak-ac-empty">Tidak ada riwayat yang cocok.<br><span style="font-size:10.5px">Anda tetap bisa mengetik MAK baru langsung di field.</span></div>`;
    return;
  }
  list.innerHTML = makACState.filtered.map((s, i) => `
    <div class="mak-ac-item${i === makACState.focusIdx ? ' focused' : ''}"
         data-idx="${i}"
         data-mak="${escAttr(s.mak)}"
         onmousedown="onMakSuggestionMouseDown(event,this)">
      <div class="mak-ac-item-code">${esc(s.mak)}<span class="mak-ac-item-count">${s.count}×</span></div>
      ${s.ringkasan ? `<div class="mak-ac-item-desc">${esc(s.ringkasan)}</div>` : ''}
    </div>
  `).join('');
}

function onMakSuggestionMouseDown(event, itemEl) {
  event.preventDefault();
  event.stopPropagation();
  const idx = Number(itemEl && itemEl.dataset ? itemEl.dataset.idx : -1);
  if (Number.isInteger(idx) && idx >= 0) makAcPick(idx);
  return false;
}

function makAcRenderFocus() {
  const items = document.querySelectorAll('#mak-ac-list .mak-ac-item');
  items.forEach((el, i) => el.classList.toggle('focused', i === makACState.focusIdx));
  if (makACState.focusIdx >= 0) {
    const focused = items[makACState.focusIdx];
    if (focused) focused.scrollIntoView({ block: 'nearest' });
  }
}

function makAcPick(idx) {
  const item = makACState.filtered[idx];
  if (!item) return;
  pickMAK(item.mak);
}

function pickMAKForInput(inp, mak) {
  makACState.suppressUntil = Date.now() + 800;
  if (inp) {
    inp.value = mak;
    inp.classList.remove('err');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    const tr = inp.closest('tr[data-surat-id]');
    if (tr) snapshotAdminDraft(tr.dataset.suratId);
    setTimeout(() => {
      if (document.activeElement === inp) inp.blur();
    }, 0);
  }
  closeMakAc();
  setTimeout(closeMakAc, 0);
  setTimeout(closeMakAc, 120);
}

function findByDataId(selector, id) {
  if (id === undefined || id === null || id === '') return null;
  return Array.from(document.querySelectorAll(selector))
    .find(el => String(el.dataset.id || '') === String(id)) || null;
}

function pickMAKForId(id, mak) {
  const inp = findByDataId('.mak-input', id) || makACState.inputEl;
  pickMAKForInput(inp, mak);
}

function pickMAK(mak) {
  pickMAKForInput(makACState.inputEl, mak);
}

/* ════════════════════════════════════════════════════════════════════
   DROPDOWN ALAT ANGKUTAN (single-select 4 pilihan)
   Pola mirip dengan apaPegawai & apaCalendar (floating popup)
═══════════════════════════════════════════════════════════════════════ */
let alatState = {
  cellEl: null,
  focusIdx: -1,
  query: '',
  filtered: [...ALAT_ANGKUTAN_OPTIONS],
};

function openAlatDropdown(cellEl) {
  if (!cellEl) return;
  closeCal();
  closeAc();
  closeMakAc();
  closeTpAc();
  if (alatState.cellEl && alatState.cellEl !== cellEl) {
    alatState.cellEl.classList.remove('active');
  }
  alatState.cellEl = cellEl;
  cellEl.classList.add('active');

  const popup = document.getElementById('alat-popup');
  if (!popup) return;
  popup.classList.add('open');

  alatState.query = '';
  const searchInp = document.getElementById('alat-popup-search');
  if (searchInp) {
    searchInp.value = '';
    wireAlatSearchInput(searchInp);
    setTimeout(() => searchInp.focus(), 30);
  }

  filterAlatOptions('');
  positionAlatPopup(cellEl, popup);
}

function wireAlatSearchInput(searchInp) {
  if (searchInp.dataset.wired) return;
  searchInp.dataset.wired = '1';
  searchInp.addEventListener('input', (e) => {
    filterAlatOptions(e.target.value);
  });
  searchInp.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeAlatDropdown();
      if (alatState.cellEl) alatState.cellEl.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (alatState.filtered.length) {
        alatState.focusIdx = Math.min(alatState.focusIdx + 1, alatState.filtered.length - 1);
        renderAlatPopupList();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (alatState.filtered.length) {
        alatState.focusIdx = Math.max(alatState.focusIdx - 1, 0);
        renderAlatPopupList();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (alatState.focusIdx >= 0 && alatState.filtered[alatState.focusIdx]) {
        pickAlatOption(alatState.filtered[alatState.focusIdx].value);
      }
    } else if (e.key === 'Tab') {
      closeAlatDropdown();
    }
  });
}

function filterAlatOptions(q) {
  alatState.query = (q || '').trim().toLowerCase();
  if (!alatState.query) {
    alatState.filtered = [...ALAT_ANGKUTAN_OPTIONS];
  } else {
    alatState.filtered = ALAT_ANGKUTAN_OPTIONS.filter(o =>
      o.label.toLowerCase().includes(alatState.query) ||
      o.value.toLowerCase().includes(alatState.query)
    );
  }

  const curVal = alatState.cellEl ? (alatState.cellEl.dataset.value || '').trim().toLowerCase() : '';
  let idx = alatState.filtered.findIndex(o => o.value.toLowerCase() === curVal);
  if (idx < 0 && alatState.filtered.length) idx = 0;
  alatState.focusIdx = idx;

  renderAlatPopupList();
}

function closeAlatDropdown(restoreFocus = false) {
  const popup = document.getElementById('alat-popup');
  if (popup) popup.classList.remove('open');
  const cellToRestore = alatState.cellEl;
  if (cellToRestore) {
    cellToRestore.classList.remove('active');
    alatState.cellEl = null;
    if (restoreFocus && typeof cellToRestore.focus === 'function') {
      cellToRestore.focus();
    }
  }
  alatState.focusIdx = -1;
  alatState.query = '';
  alatState.filtered = [...ALAT_ANGKUTAN_OPTIONS];
}

function positionAlatPopup(cellEl, popup) {
  const rect = cellEl.getBoundingClientRect();
  const popH = 240;
  const spaceBelow = window.innerHeight - rect.bottom;
  const above = spaceBelow < popH && rect.top > popH;

  let left = rect.left + (rect.width / 2) - 130;
  if (left < 8) left = 8;
  if (left + 260 > window.innerWidth) left = window.innerWidth - 265;

  popup.style.left = `${left}px`;
  if (above) {
    popup.style.top = '';
    popup.style.bottom = `${window.innerHeight - rect.top + 4}px`;
  } else {
    popup.style.bottom = '';
    popup.style.top = `${rect.bottom + 4}px`;
  }
}

function renderAlatPopupList() {
  const list = document.getElementById('alat-popup-list');
  if (!list) return;
  if (!alatState.filtered.length) {
    list.innerHTML = `<div class="alat-popup-empty">Tidak ada pilihan yang cocok</div>`;
    return;
  }
  const curVal = alatState.cellEl ? (alatState.cellEl.dataset.value || '').trim().toLowerCase() : '';

  list.innerHTML = alatState.filtered.map((opt, i) => {
    const isSelected = opt.value.toLowerCase() === curVal;
    const isFocused = i === alatState.focusIdx;
    const cls = [
      'alat-popup-item',
      isSelected ? 'selected' : '',
      isFocused ? 'focused' : '',
    ].filter(Boolean).join(' ');

    return `
      <div class="${cls}" data-idx="${i}" data-value="${escAttr(opt.value)}"
           onmousedown="onAlatOptionMouseDown(event, this)">
        <div class="alat-item-icon">${opt.icon}</div>
        <div class="alat-item-label">${esc(opt.label)}</div>
        <span class="alat-item-check">✓</span>
      </div>
    `;
  }).join('');
}

function onAlatOptionMouseDown(e, itemEl) {
  e.preventDefault();
  e.stopPropagation();
  const val = itemEl.getAttribute('data-value');
  pickAlatOption(val);
}

function pickAlatOption(val) {
  if (!alatState.cellEl) {
    closeAlatDropdown();
    return;
  }
  const cellEl = alatState.cellEl;
  setAlatCellValue(cellEl, val);
  const tr = cellEl.closest('tr[data-surat-id]');
  if (tr) snapshotAdminDraft(tr.dataset.suratId);
  closeAlatDropdown();
  cellEl.focus();
}

function clearAlatSelection() {
  if (alatState.cellEl) {
    const cellEl = alatState.cellEl;
    setAlatCellValue(cellEl, '');
    const tr = cellEl.closest('tr[data-surat-id]');
    if (tr) snapshotAdminDraft(tr.dataset.suratId);
    cellEl.focus();
  }
  closeAlatDropdown();
}

function onAlatCellKeydown(e, cellEl) {
  const popup = document.getElementById('alat-popup');
  const isOpen = popup && popup.classList.contains('open');

  if (!isOpen) {
    if (e.key === 'Enter' || e.key === ' ' || (e.altKey && e.key === 'ArrowDown')) {
      e.preventDefault();
      openAlatDropdown(cellEl);
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      setAlatCellValue(cellEl, '');
      const tr = cellEl.closest('tr[data-surat-id]');
      if (tr) snapshotAdminDraft(tr.dataset.suratId);
      return;
    }
    // Biarkan ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Tab bubble ke global keydown listener
    return;
  }

  if (e.key === 'Escape') {
    e.preventDefault();
    closeAlatDropdown();
    cellEl.focus();
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (alatState.filtered.length) {
      alatState.focusIdx = Math.min(alatState.focusIdx + 1, alatState.filtered.length - 1);
      renderAlatPopupList();
    }
    return;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (alatState.filtered.length) {
      alatState.focusIdx = Math.max(alatState.focusIdx - 1, 0);
      renderAlatPopupList();
    }
    return;
  }

  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (alatState.focusIdx >= 0 && alatState.filtered[alatState.focusIdx]) {
      pickAlatOption(alatState.filtered[alatState.focusIdx].value);
    }
    return;
  }

  if (e.key === 'Tab') {
    closeAlatDropdown();
  }
}


// No-op kompatibilitas (subsistem Tipe Autocomplete lama telah dihapus di P3)
function closeTpAc() {}

/* ════════════════════════════════════════════════════════════════════
   ARROW NAVIGATION GRID — Diinisialisasi via apa-grid-nav.js
═══════════════════════════════════════════════════════════════════════ */
const NAV_FIELDS = [
  'nomor_surat',
  'tanggal_surat',
  'waktu',
  'perihal',
  'tujuan',
  'pegawai_multi',
  'alat_angkutan',
  'pembebanan',
  'penandatangan',
];

if (window.apaGridNav) {
  window.apaGridNav.init({
    rowSelector: 'tr[data-surat-id]',
    fields: NAV_FIELDS,
    onClearCell: function(cellTarget, field, tr) {
      if (cellTarget.classList.contains('alat-cell')) {
        setAlatCellValue(cellTarget, '');
        if (tr && tr.dataset.suratId) snapshotAdminDraft(tr.dataset.suratId);
      } else if (cellTarget.classList.contains('pg-cell')) {
        cellTarget.dataset.nips = '[]';
        cellTarget.dataset.names = '[]';
        delete cellTarget.dataset.nip;
        delete cellTarget.dataset.nama;
        if (window.apaPegawai) {
          window.apaPegawai.renderCell(cellTarget, [], []);
        }
        if (tr && tr.dataset.suratId) snapshotAdminDraft(tr.dataset.suratId);
      }
    },
    onOpenCell: function(cellTarget, field, tr) {
      if (cellTarget.classList.contains('pg-cell')) {
        const isSingle = cellTarget.classList.contains('single') || cellTarget.dataset.field === 'penandatangan';
        openAc(cellTarget, isSingle);
      } else if (cellTarget.classList.contains('alat-cell')) {
        openAlatDropdown(cellTarget);
      }
    },
    onClosePopups: function() {
      closeAllPopups();
    },
    closeModals: function() {
      ['modal-approve','modal-preview','modal-bulk-approve','modal-edit-bertugas'].forEach(closeModal);
    },
    getActivePopupCell: function() {
      if (typeof alatState !== 'undefined' && alatState && alatState.cellEl) return alatState.cellEl;
      if (typeof makACState !== 'undefined' && makACState && makACState.inputEl) return makACState.inputEl;
      return null;
    }
  });
}


/* ════════════════════════════════════════════════════════════════════
   CLOSE POPUPS saat klik di luar
═══════════════════════════════════════════════════════════════════════ */
document.addEventListener('click', (e) => {
  // Calendar outside click ditangani secara mandiri oleh apaCalendar
  const ac = document.getElementById('ac-popup');
  if (ac && ac.classList.contains('open') && !ac.contains(e.target)) {
    const inAnyPgCell = e.target.closest && e.target.closest('.pg-cell');
    if (!inAnyPgCell) closeAc();
  }
  const macAc = document.getElementById('mak-ac-popup');
  if (macAc && macAc.classList.contains('open') && !macAc.contains(e.target)) {
    const inMakInput = e.target.closest && e.target.closest('.mak-input');
    if (!inMakInput) closeMakAc();
  }
  const tpAc = document.getElementById('tp-ac-popup');
  if (tpAc && tpAc.classList.contains('open') && !tpAc.contains(e.target)) {
    const inAnyTpCell = e.target.closest && e.target.closest('.tp-cell');
    if (!inAnyTpCell) closeTpAc();
  }
  const alatPop = document.getElementById('alat-popup');
  if (alatPop && alatPop.classList.contains('open') && !alatPop.contains(e.target)) {
    const inAlatCell = e.target.closest && e.target.closest('.alat-cell');
    if (!inAlatCell) closeAlatDropdown();
  }
  // Hapus highlight baris jika klik di luar tabel
  if (!e.target.closest('tr[data-surat-id]')) {
    document.querySelectorAll('tr.row-focused').forEach(tr => tr.classList.remove('row-focused'));
  }
});

/* ════════════════════════════════════════════════════════════════════
   AUTO-SELECT TEKS di readonly cell saat difokus
   Sehingga langsung bisa Ctrl+C tanpa perlu drag manual
═══════════════════════════════════════════════════════════════════════ */
document.addEventListener('focus', (e) => {
  const target = e.target;
  if (!target || !target.classList) return;
  const isRo = target.classList.contains('ro-text') || target.classList.contains('ro-ttd');
  if (!isRo) return;
  try {
    const range = document.createRange();
    range.selectNodeContents(target);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  } catch(_) {}
}, true); // useCapture=true karena focus tidak bubble secara default

function closeAllPopups() {
  closeCal();
  closeAc();
  closeMakAc();
  closeTpAc();
  closeAlatDropdown();
}

/* ════════════════════════════════════════════════════════════════════
   COLLECT FIELDS dari row sebelum approve
═══════════════════════════════════════════════════════════════════════ */
function collectRowFields(suratId) {
  const row = document.querySelector(`tr[data-surat-id="${suratId}"]`);
  if (!row) return null;

  const get = (field) => {
    const el = row.querySelector(`[data-field="${field}"]`);
    if (!el) return '';
    if (el.dataset && el.dataset.value !== undefined) return el.dataset.value.trim();
    return (el.value || '').trim();
  };
  const getISO = (field) => {
    const el = row.querySelector(`[data-field="${field}"]`);
    return el ? (el.dataset.iso || '') : '';
  };
  const getRange = (field) => {
    const el = row.querySelector(`[data-field="${field}"]`);
    if (!el) return { mulai: '', selesai: '' };
    return { mulai: el.dataset.isoMulai || '', selesai: el.dataset.isoSelesai || '' };
  };
  const getMulti = (field) => {
    const el = row.querySelector(`[data-field="${field}"]`);
    if (!el) return { nips: [], names: [], roles: [] };
    let nips = [], names = [], roles = [];
    try { nips  = JSON.parse(el.dataset.nips  || '[]'); } catch(_) {}
    try { names = JSON.parse(el.dataset.names || '[]'); } catch(_) {}
    try { roles = JSON.parse(el.dataset.roles || el.dataset.bertugas || '[]'); } catch(_) {}
    return { nips, names, roles };
  };
  const getSingle = (field) => {
    const el = row.querySelector(`[data-field="${field}"]`);
    if (!el) return { nip: '', nama: '' };
    return { nip: el.dataset.nip || '', nama: el.dataset.nama || '' };
  };
  // Tipe disimpan di dataset.value pada .tp-cell (bukan value/value attribute)
  // karena cell custom autocomplete, bukan <select> native.
  const getTipe = () => {
    const el = row.querySelector('.tp-cell[data-field="tipe"]');
    if (el) return el.dataset.value || '';
    // Fallback: kalau row sudah selesai (read-only ro-text), baca data-col-field
    const ro = row.querySelector('[data-col-field="tipe"]');
    return ro ? (ro.dataset.value || '') : '';
  };

  const waktu = getRange('waktu');
  const peg   = getMulti('pegawai_multi');
  const ttd   = getSingle('penandatangan');
  const waktuInp = row.querySelector('.xls-cell[data-field="waktu"]');
  const waktuTextCustom = waktuInp ? (waktuInp.dataset.waktuTextCustom || (waktuInp.value && waktuInp.value.includes('&') ? waktuInp.value.trim() : '')) : '';

  const sOrig = suratMap[suratId];

  return {
    nomor_surat:       get('nomor_surat'),
    tanggal_surat:     getISO('tanggal_surat'),
    tanggal_berangkat: waktu.mulai,
    tanggal_kembali:   waktu.selesai,
    waktu_pelaksanaan_text: waktuTextCustom,
    perihal:           get('perihal'),
    tujuan:            get('tujuan'),
    pegawai_nip:       peg.nips,
    pegawai_list:      peg.names,
    bertugas_sebagai:  (Array.isArray(peg.roles) && peg.roles.some(Boolean))
                         ? peg.roles
                         : ((sOrig && Array.isArray(sOrig.bertugas_sebagai) && sOrig.bertugas_sebagai.some(Boolean)) ? sOrig.bertugas_sebagai : null),
    menimbang_custom:  get('menimbang_custom') || (sOrig && sOrig.menimbang_custom) || '',
    alat_angkutan:     get('alat_angkutan'),
    pembebanan:        get('pembebanan'),
    penandatangan_nip:    ttd.nip,
    penandatangan_nama:   ttd.nama,
    tempat_terbit:        'Waisai',
    tipe:                 (sOrig && sOrig.tipe) || 'surat_tugas',
  };
}

function validateApproveFields(values) {
  const checks = [
    ['nomor_surat',        'Nomor Surat'],
    ['tanggal_surat',      'Tgl Surat'],
    ['tanggal_berangkat',  'Waktu Pelaksanaan'],
    ['perihal',            'Perihal'],
    // OPSIONAL (boleh kosong): tujuan, pembebanan, alat_angkutan
    //  - tujuan kosong       → {untuk_text} fallback ke "{perihal} pada tanggal ..."
    //  - pembebanan kosong   → kolom MAK di template render kosong
    //  - alat_angkutan kosong → kolom alat angkutan render kosong
    //  - menimbang & tipe diatur otomatis oleh sistem
    ['penandatangan_nama', 'Penandatangan'],
  ];
  const errors = [], errFields = [];
  checks.forEach(([k, label]) => {
    const v = values[k];
    if (!v || (Array.isArray(v) && !v.length)) { errors.push(label); errFields.push(k); }
  });
  if (!values.pegawai_nip.length && !values.pegawai_list.length) {
    errors.push('Nama');
    errFields.push('pegawai_multi');
  }
  // Validasi format MAK Pembebanan — hanya jika field-nya terisi.
  // Kalau kosong, sudah di-tangkap oleh required-check di atas.
  // Format wajib: 054.01.GG.2910.BMA.006.054.A.524119
  if (values.pembebanan && !parseMAK(values.pembebanan)) {
    errors.push('Format POK tidak valid (contoh: 054.01.GG.2910.BMA.006.054.A.524119)');
    if (!errFields.includes('pembebanan')) errFields.push('pembebanan');
  }
  const availability = validatePegawaiAvailability(values);
  availability.errors.forEach(msg => errors.push(msg));
  availability.errFields.forEach(f => {
    if (!errFields.includes(f)) errFields.push(f);
  });
  return { errors, errFields };
}

function validatePegawaiAvailability(values) {
  const errors = [];
  const errFields = [];
  const tglSurat = values.tanggal_surat || '';
  const tugasMulai = values.tanggal_berangkat || '';
  const tugasSelesai = values.tanggal_kembali || values.tanggal_berangkat || '';

  const addField = (f) => {
    if (!errFields.includes(f)) errFields.push(f);
  };
  const checkPegawai = (nip, nama, field) => {
    if (!nip || isMitraNip(nip)) return;
    const p = pegawaiByNIP[String(nip).trim()];
    if (!p) return;
    const tglPensiun = tanggalPensiunPegawai(p);
    if (isPegawaiPensiunAt(p, tglSurat)) {
      errors.push(`${nama || pegawaiNama(p) || nip} sudah pensiun pada tanggal surat${tglPensiun ? ` (${fmtTgl(tglPensiun)})` : ''}.`);
      addField(field);
      return;
    }
    if (normalizeStatusKepegawaian(p) === 'pensiun' && tglPensiun && tugasMulai && tugasMulai >= tglPensiun) {
      errors.push(`${nama || pegawaiNama(p) || nip} tidak bisa ditugaskan karena waktu pelaksanaan dimulai setelah pensiun.`);
      addField(field);
    } else if (normalizeStatusKepegawaian(p) === 'pensiun' && tglPensiun && tugasSelesai && tugasSelesai >= tglPensiun) {
      errors.push(`${nama || pegawaiNama(p) || nip} pensiun per ${fmtTgl(tglPensiun)}, sedangkan waktu pelaksanaan melewati tanggal tersebut.`);
      addField(field);
    }
  };

  (values.pegawai_nip || []).forEach((nip, idx) => checkPegawai(nip, (values.pegawai_list || [])[idx], 'pegawai_multi'));
  checkPegawai(values.penandatangan_nip, values.penandatangan_nama, 'penandatangan');

  return { errors, errFields };
}

function highlightRowFieldErrors(suratId, fields) {
  const row = document.querySelector(`tr[data-surat-id="${suratId}"]`);
  if (!row) return;
  row.querySelectorAll('.xls-cell.err, .pg-cell.err, .tp-cell.err').forEach(el => el.classList.remove('err'));

  const FIELD_DOM_MAP = {
    tanggal_berangkat: 'waktu',
    pegawai_nip:       'pegawai_multi',
    pegawai_list:      'pegawai_multi',
    penandatangan_nama: 'penandatangan',
    penandatangan_nip:  'penandatangan',
  };

  fields.forEach(f => {
    const domField = FIELD_DOM_MAP[f] || f;
    const el = row.querySelector(`[data-field="${domField}"]`);
    if (el) el.classList.add('err');
  });

  if (fields.length) {
    const first = row.querySelector('.xls-cell.err, .pg-cell.err, .tp-cell.err');
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      setTimeout(() => {
        if (first.tagName === 'INPUT' || first.tagName === 'TEXTAREA') first.focus();
        else {
          const inp = first.querySelector('input, textarea, .pg-input, .tp-input');
          if (inp) inp.focus();
        }
      }, 300);
    }
  }
}


/* ════════════════════════════════════════════════════════════════════
   MODAL HELPERS
═══════════════════════════════════════════════════════════════════════ */
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
  // File preview dijadwalkan hapus 10 menit sejak dibuat.
  if (id === 'modal-preview' && _previewUploadedPath) {
    schedulePreviewCleanup(_previewUploadedPath);
  }
  // Reset state khusus modal preview & hentikan iframe agar tidak membebani memori
  if (id === 'modal-preview') {
    _previewVisumOpts = null;
    _previewBlob = null;
    currentPreviewSurat = null;
    const container = document.getElementById('preview-container');
    if (container) container.innerHTML = '';
  }
  // Reset state edit-bertugas saat modal ditutup
  if (id === 'modal-edit-bertugas') {
    _editBertugasSuratId = null;
  }
}

let _pageAlertTimer = null;
function showPageAlert(msg, type='error') {
  const alert = document.getElementById('page-alert');
  // Map type ke icon. Default ke error icon.
  const iconMap = { success: '✅', error: '⚠️', info: 'ℹ️' };
  document.getElementById('page-alert-icon').textContent = iconMap[type] || iconMap.error;
  document.getElementById('page-alert-text').textContent = msg;
  alert.className = `alert ${type} show`;
  alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (_pageAlertTimer) clearTimeout(_pageAlertTimer);
  _pageAlertTimer = setTimeout(() => { alert.className = 'alert'; _pageAlertTimer = null; }, 5500);
}

/* ════════════════════════════════════════════════════════════════════
   APPROVE
═══════════════════════════════════════════════════════════════════════ */
async function openApprove(id) {
  selectedId = id;
  const s = suratMap[id]; if (!s) return;
  const values = collectRowFields(id);
  if (!values) return;

  const { errors, errFields } = validateApproveFields(values);
  if (errors.length) {
    highlightRowFieldErrors(id, errFields);
    showPageAlert(`⚠️ Lengkapi dulu di tabel: ${errors.join(', ')}`, 'error');
    return;
  }

  const jabatan = lookupJabatan(values.penandatangan_nip, values.tanggal_surat);
  const waktuPelaksanaanText = values.waktu_pelaksanaan_text && values.waktu_pelaksanaan_text.length
    ? values.waktu_pelaksanaan_text
    : null;

  // Pertahankan bertugas_sebagai jika sudah pernah ada
  const bertugas = (tipeHasLampiran(values.tipe) && values.pegawai_list.length >= 2)
    ? (Array.isArray(s.bertugas_sebagai) && s.bertugas_sebagai.some(Boolean) ? s.bertugas_sebagai : null)
    : null;

  const payload = {
    status: 'selesai',
    nomor_surat:           values.nomor_surat,
    tanggal_surat:         values.tanggal_surat,
    tanggal_berangkat:     values.tanggal_berangkat,
    tanggal_kembali:       values.tanggal_kembali || null,
    waktu_pelaksanaan_text: waktuPelaksanaanText,
    perihal:               values.perihal,
    tujuan:                values.tujuan,
    pegawai_nip:           values.pegawai_nip,
    pegawai_list:          values.pegawai_list,
    menimbang_custom:      values.menimbang_custom,
    alat_angkutan:         values.alat_angkutan,
    pembebanan:            values.pembebanan,
    tempat_terbit:         values.tempat_terbit,
    penandatangan_nama:    values.penandatangan_nama,
    penandatangan_nip:     values.penandatangan_nip,
    penandatangan_jabatan: jabatan || '',
    tipe:                  values.tipe,
    bertugas_sebagai:      bertugas,
    jumlah_responden:      s.jumlah_responden || null,
  };

  const rowEl = document.querySelector(`tr[data-surat-id="${id}"]`);
  const btn = rowEl ? rowEl.querySelector('.btn-approve') : null;
  if (btn) {
    btn.disabled = true;
    btn.classList.add('loading');
  }

  try {
    await patchSuratTugas(id, payload);

    // Auto-save defaults
    const newDefaults = {};
    if (values.alat_angkutan)       newDefaults.alat_angkutan = values.alat_angkutan;
    if (values.pembebanan)          newDefaults.pembebanan    = values.pembebanan;
    if (values.penandatangan_nip)   newDefaults.ttd_nip       = values.penandatangan_nip;
    if (values.penandatangan_nama)  newDefaults.ttd_nama      = values.penandatangan_nama;
    saveApproveDefaults({ ...loadApproveDefaults(), ...newDefaults });

    clearAdminDraft(id);
    const dirtySnapshot = captureMenungguDirty(id);
    await loadSurat();
    reapplyMenungguDirty(dirtySnapshot);
    loadMAKSuggestions();
  } catch(e) {
    showPageAlert(`Gagal menandai selesai: ${e.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  }
}

/* ════════════════════════════════════════════════════════════════════
   BERTUGAS SEBAGAI — UI helpers
   ─────────────────────────────────────────────────────────────────────
   Render list editor + apply-all/clear-all + collect values.
   Dipakai oleh modal-approve (saat setujui) dan modal-edit-bertugas
   (edit setelah surat selesai).

   Pattern: setiap input punya id `${idPrefix}-${index}` supaya bisa
   di-collect via for-loop. Index sesuai posisi di array pegawai.
═══════════════════════════════════════════════════════════════════════ */

/**
 * Render list pegawai dengan input "Bertugas Sebagai" di sebelahnya.
 *
 * @param {string}    containerId  ID elemen container yg akan diisi
 * @param {string[]}  pegawaiNames Array nama pegawai (urutan = index)
 * @param {string[]}  existing     Array nilai bertugas yg sudah ada
 *                                 (panjang bisa < pegawaiNames; sisanya '')
 * @param {string}    idPrefix     Prefix untuk id input. Mis. 'inp-bertugas-row'
 *                                 → input id = 'inp-bertugas-row-0', '...row-1', dst.
 */
function renderBertugasList(containerId, pegawaiNames, existing, idPrefix) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = pegawaiNames.map((nm, i) => {
    const val = esc(existing[i] || '');
    return `
      <div style="display:flex;gap:8px;align-items:center">
        <span style="flex:0 0 28px;text-align:right;font-size:12px;color:var(--muted);font-weight:600">${i + 1}.</span>
        <span style="flex:1;font-size:12.5px;color:var(--navy);font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(nm)}">${esc(nm)}</span>
        <input type="text"
               id="${idPrefix}-${i}"
               value="${val}"
               placeholder="Bertugas sebagai…"
               style="flex:0 0 240px;padding:6px 9px;border:1.5px solid var(--border2);border-radius:6px;font-family:'Plus Jakarta Sans',sans-serif;font-size:12.5px;outline:none">
      </div>
    `;
  }).join('');
}

/**
 * Collect nilai dari list bertugas. Trim setiap value, return array dengan
 * panjang sesuai pegawaiCount.
 *
 * @param {number} pegawaiCount  Jumlah pegawai (= panjang array yg di-return)
 * @param {string} idPrefix      Prefix id input (sama dengan render*)
 * @returns {string[]}  Array string. Element kosong = '' (bukan null).
 */
function collectBertugasValues(pegawaiCount, idPrefix) {
  const out = [];
  for (let i = 0; i < pegawaiCount; i++) {
    const el = document.getElementById(`${idPrefix}-${i}`);
    out.push(el ? String(el.value || '').trim() : '');
  }
  return out;
}

/** Apply nilai dari input quick ke semua field bertugas — modal Approve. */
function bertugasApplyAll() {
  const v = (document.getElementById('inp-bertugas-quick')?.value || '').trim();
  document.querySelectorAll('#approve-bertugas-list input[id^="inp-bertugas-row-"]')
    .forEach(el => { el.value = v; });
}

/** Kosongkan semua field bertugas — modal Approve. */
function bertugasClearAll() {
  document.querySelectorAll('#approve-bertugas-list input[id^="inp-bertugas-row-"]')
    .forEach(el => { el.value = ''; });
}

/** Apply quick value ke semua field — modal Edit Bertugas. */
function editBertugasApplyAll() {
  const v = (document.getElementById('inp-edit-bertugas-quick')?.value || '').trim();
  document.querySelectorAll('#edit-bertugas-list input[id^="inp-edit-bertugas-row-"]')
    .forEach(el => { el.value = v; });
}

/** Kosongkan semua field — modal Edit Bertugas. */
function editBertugasClearAll() {
  document.querySelectorAll('#edit-bertugas-list input[id^="inp-edit-bertugas-row-"]')
    .forEach(el => { el.value = ''; });
}

/* ════════════════════════════════════════════════════════════════════
   EDIT BERTUGAS — open modal & submit handler
   ─────────────────────────────────────────────────────────────────────
   Modal khusus untuk admin mengedit role pegawai pada surat yang sudah
   selesai (status=selesai). Hanya field bertugas_sebagai yang di-PATCH;
   surat lainnya tidak disentuh.

   Diakses dari tombol "✏ Edit Role" di tabel (kolom Aksi). Tombol
   tersebut hanya muncul kalau tipeHasLampiran(s.tipe) && pegawai >= 2.
═══════════════════════════════════════════════════════════════════════ */
let _editBertugasSuratId = null;  // surat ID yang sedang di-edit

/** Buka modal Edit Bertugas untuk surat tertentu. */
function openEditBertugas(suratId) {
  const s = suratMap[suratId];
  if (!s) return;
  // Defensive: kalau dari refresh data tipe sudah berubah jadi non-lampiran
  // atau jumlah pegawai jadi < 2, tampilkan alert dan abort.
  if (!tipeHasLampiran(s.tipe)) {
    showPageAlert('Tipe surat tidak punya halaman lampiran — role tidak relevan.', 'error');
    return;
  }
  const pegawai = Array.isArray(s.pegawai_list) ? s.pegawai_list : [];
  if (pegawai.length < 2) {
    showPageAlert('Surat dengan 1 pegawai tidak butuh role bertugas.', 'error');
    return;
  }

  _editBertugasSuratId = suratId;
  document.getElementById('edit-bertugas-perihal').textContent = s.perihal || '—';
  // Reset quick-fill
  const quick = document.getElementById('inp-edit-bertugas-quick');
  if (quick) quick.value = '';

  // Render list pakai existing data
  const existing = Array.isArray(s.bertugas_sebagai) ? s.bertugas_sebagai : [];
  renderBertugasList(
    'edit-bertugas-list',
    pegawai,
    existing,
    'inp-edit-bertugas-row'
  );

  openModal('modal-edit-bertugas');
}

/** Submit perubahan ke DB via PATCH. Hanya kolom bertugas_sebagai. */
async function submitEditBertugas() {
  const id = _editBertugasSuratId;
  if (!id) return;
  const s = suratMap[id];
  if (!s) return;

  const pegawaiCount = Array.isArray(s.pegawai_list) ? s.pegawai_list.length : 0;
  const arr = collectBertugasValues(pegawaiCount, 'inp-edit-bertugas-row');

  // Sama logic dengan submitApprove: kalau semua kosong, kirim NULL
  // (tidak ngotorin DB dengan array empty-strings).
  const payload = {
    bertugas_sebagai: arr.some(v => v.length > 0) ? arr : null,
  };

  const btn = document.getElementById('btn-edit-bertugas-submit');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/surat_tugas?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...H, 'Prefer': 'return=minimal' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); msg = j.message || msg; } catch(_) {}
      throw new Error(msg);
    }

    // Update suratMap in-memory supaya tidak perlu reload semua data
    s.bertugas_sebagai = payload.bertugas_sebagai;

    closeModal('modal-edit-bertugas');
    _editBertugasSuratId = null;
    showPageAlert('✅ Role pegawai berhasil disimpan.', 'success');
  } catch(e) {
    console.error('[APA] submitEditBertugas:', e);
    showPageAlert(`Gagal menyimpan: ${e.message}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
  }
}

/* ════════════════════════════════════════════════════════════════════
   PRESERVE DIRTY EDITS — helper supaya edit DOM di baris-baris
   "menunggu" lain tidak hilang saat tabel di-render ulang setelah
   sebuah baris di-approve / di-save edit. Bug-fix untuk skenario:
     1. Admin edit banyak baris menunggu sekaligus (belum di-approve)
     2. Approve 1 baris → loadSurat() reload semua → re-render tabel
     3. Edit di baris-baris lain hilang karena DOM dibangun ulang
        dari data server (yang belum punya edit tsb).
   Fix: capture nilai DOM dirty SEBELUM reload, lalu re-apply ke DOM
   SETELAH render ulang.
═══════════════════════════════════════════════════════════════════════ */

/**
 * Snapshot nilai semua cell yang "dirty" di baris status="menunggu".
 * @param {*} excludeId — id baris yang baru di-approve (tidak perlu di-snap
 *                       karena status-nya akan berubah jadi 'selesai').
 * @returns {Object<string, {cells:Array, pegawai:?{nips,names}}>}
 */
function captureMenungguDirty(excludeId = null) {
  const out = {};
  const exclStr = excludeId != null ? String(excludeId) : null;

  document.querySelectorAll('tr[data-status="menunggu"]').forEach(tr => {
    const id = tr.dataset.suratId;
    if (!id) return;
    if (exclStr && String(id) === exclStr) return;

    const entry = { cells: [], pegawai: null };

    // Capture semua xls-cell (input/textarea/select)
    tr.querySelectorAll('.xls-cell').forEach(el => {
      const field = el.dataset.field;
      if (!field) return;
      const cell = { field, value: el.value || '' };
      // Date cells: simpan dataset attr juga (single date dan range)
      if (el.dataset.iso        !== undefined) cell.iso        = el.dataset.iso        || '';
      if (el.dataset.isoMulai   !== undefined) cell.isoMulai   = el.dataset.isoMulai   || '';
      if (el.dataset.isoSelesai !== undefined) cell.isoSelesai = el.dataset.isoSelesai || '';
      entry.cells.push(cell);
    });

    // Capture pg-cell (pegawai multi-select)
    const pg = tr.querySelector('.pg-cell');
    if (pg) {
      try {
        entry.pegawai = {
          nips:  JSON.parse(pg.dataset.nips  || '[]'),
          names: JSON.parse(pg.dataset.names || '[]'),
        };
      } catch(_) { entry.pegawai = { nips: [], names: [] }; }
    }

    // Capture tp-cell (tipe single-select)
    const tp = tr.querySelector('.tp-cell');
    if (tp) entry.tipe = tp.dataset.value || '';

    out[id] = entry;
  });

  return out;
}

/**
 * Restore snapshot ke DOM. Hanya target baris yang masih ada DAN masih
 * berstatus 'menunggu' (defensive — kalau status berubah krn admin lain
 * meng-approve di window yg sama, kita skip).
 */
function reapplyMenungguDirty(snapshot) {
  if (!snapshot) return;
  Object.keys(snapshot).forEach(id => {
    const tr = document.querySelector(`tr[data-surat-id="${id}"][data-status="menunggu"]`);
    if (!tr) return;
    const entry = snapshot[id];

    // Re-apply cells
    entry.cells.forEach(cell => {
      const el = tr.querySelector(`.xls-cell[data-field="${cell.field}"]`);
      if (!el) return;
      el.value = cell.value;
      if (cell.iso        !== undefined) el.dataset.iso        = cell.iso;
      if (cell.isoMulai   !== undefined) el.dataset.isoMulai   = cell.isoMulai;
      if (cell.isoSelesai !== undefined) el.dataset.isoSelesai = cell.isoSelesai;
    });

    // Re-apply tp-cell (tipe): re-render tag + sync data-value
    if (entry.tipe !== undefined) {
      const tp = tr.querySelector('.tp-cell');
      if (tp) {
        setTipeCellValue(tp, entry.tipe);
      }
    }

    // Re-apply pegawai (re-render visual cell)
    if (entry.pegawai) {
      const pg = tr.querySelector('.pg-cell');
      if (pg) {
        const nips  = entry.pegawai.nips  || [];
        const names = entry.pegawai.names || [];
        if (window.apaPegawai) {
          window.apaPegawai.renderCell(pg, nips, names);
        } else {
          pg.dataset.nips  = JSON.stringify(nips);
          pg.dataset.names = JSON.stringify(names);
        }
      }
    }
  });
}

/**
 * Helper untuk PATCH record surat_tugas ke Supabase dengan auto-retry resilience.
 * Jika kolom penandatangan_jabatan belum ada di database,
 * otomatis coba lagi tanpa kolom tersebut agar user tidak gagal approve.
 */
async function patchSuratTugas(id, payload) {
  let res = await fetch(`${SUPABASE_URL}/rest/v1/surat_tugas?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...H, 'Prefer': 'return=minimal' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.message || msg; } catch(_) {}
    if (msg.includes('penandatangan_jabatan') && 'penandatangan_jabatan' in payload) {
      console.warn('[APA] Kolom penandatangan_jabatan belum ada di schema database, auto-retry tanpa kolom tersebut...');
      const fallbackPayload = { ...payload };
      delete fallbackPayload.penandatangan_jabatan;
      res = await fetch(`${SUPABASE_URL}/rest/v1/surat_tugas?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...H, 'Prefer': 'return=minimal' },
        body: JSON.stringify(fallbackPayload)
      });
      if (!res.ok) {
        let msg2 = `HTTP ${res.status}`;
        try { const j2 = await res.json(); msg2 = j2.message || msg2; } catch(_) {}
        throw new Error(msg2);
      }
      return res;
    }
    throw new Error(msg);
  }
  return res;
}

async function submitApprove() {
  const values = collectRowFields(selectedId);
  if (!values) return;
  const { errors, errFields } = validateApproveFields(values);
  if (errors.length) {
    document.getElementById('approve-alert-icon').textContent = '⚠️';
    document.getElementById('approve-alert-text').textContent = `Lengkapi: ${errors.join(', ')}`;
    document.getElementById('approve-alert').className = 'alert error show';
    highlightRowFieldErrors(selectedId, errFields);
    setTimeout(() => closeModal('modal-approve'), 1500);
    return;
  }

  const jabatan = lookupJabatan(values.penandatangan_nip, values.tanggal_surat);

  // #3: waktu_pelaksanaan_text sudah ter-collect di values via collectRow()
  // dari toggle expand di kolom waktu (bukan lagi dari modal).
  // Kalau kosong setelah trim, kirim NULL (fallback ke auto format dari
  // tanggal_berangkat & tanggal_kembali saat render docx).
  const waktuPelaksanaanText = values.waktu_pelaksanaan_text && values.waktu_pelaksanaan_text.length
    ? values.waktu_pelaksanaan_text
    : null;

  const payload = {
    status: 'selesai',
    nomor_surat:           values.nomor_surat,
    tanggal_surat:         values.tanggal_surat,
    tanggal_berangkat:     values.tanggal_berangkat,
    tanggal_kembali:       values.tanggal_kembali || null,
    waktu_pelaksanaan_text: waktuPelaksanaanText,
    perihal:               values.perihal,
    tujuan:                values.tujuan,
    pegawai_nip:           values.pegawai_nip,
    pegawai_list:          values.pegawai_list,
    menimbang_custom:      values.menimbang_custom,
    alat_angkutan:         values.alat_angkutan,
    pembebanan:            values.pembebanan,
    tempat_terbit:         values.tempat_terbit,
    penandatangan_nama:    values.penandatangan_nama,
    penandatangan_nip:     values.penandatangan_nip,
    penandatangan_jabatan: jabatan || '',
    tipe:                  values.tipe,
    // bertugas_sebagai: hanya disertakan kalau tipe ada lampiran & ≥2 pegawai
    // (kondisi yang sama dengan show-condition di openApprove). Untuk tipe
    // lain, NULL — biarkan engine docxtemplater lookup → string kosong.
    // collectBertugasValues() return string[] — element kosong = '' (string).
    // Kalau SEMUA element kosong, kita kirim NULL juga supaya tidak nyampah
    // di DB. Cek: ada minimal 1 element non-empty?
    bertugas_sebagai:      (tipeHasLampiran(values.tipe) && values.pegawai_list.length >= 2)
                             ? (() => {
                                 const arr = collectBertugasValues(values.pegawai_list.length, 'inp-bertugas-row');
                                 return arr.some(v => v.length > 0) ? arr : null;
                               })()
                             : null,
    // #2: jumlah_responden — hanya disertakan kalau tipe surat ada visum.
    // Untuk non-visum, kirim NULL (kolom unused). Empty string → NULL juga.
    jumlah_responden:      (tipeHasVisum(values.tipe))
                             ? (() => {
                                 const el = document.getElementById('inp-jumlah-responden');
                                 const v = el ? el.value.trim() : '';
                                 if (!v) return null;
                                 const n = parseInt(v, 10);
                                 return (isFinite(n) && n >= 0) ? n : null;
                               })()
                             : null,
  };

  const btn = document.getElementById('btn-approve-submit');
  btn.disabled = true; btn.classList.add('loading');
  try {
    await patchSuratTugas(selectedId, payload);

    // Auto-save defaults (alat_angkutan/POK/penandatangan) tanpa checkbox.
    // Sebelumnya ada checkbox "Simpan default" yang dihapus dari UI —
    // sekarang behavior-nya selalu auto-save kalau ada nilai. Admin
    // tidak perlu mikir lagi, dan halaman pengajuan baru langsung
    // pakai defaults yang sudah pernah dipakai sebelumnya.
    {
      const newDefaults = {};
      if (values.alat_angkutan)       newDefaults.alat_angkutan = values.alat_angkutan;
      if (values.pembebanan)          newDefaults.pembebanan    = values.pembebanan;
      if (values.penandatangan_nip)   newDefaults.ttd_nip       = values.penandatangan_nip;
      if (values.penandatangan_nama)  newDefaults.ttd_nama      = values.penandatangan_nama;
      const merged = { ...loadApproveDefaults(), ...newDefaults };
      saveApproveDefaults(merged);
    }

    closeModal('modal-approve');
    // #8: cleanup draft surat ini setelah sukses approve.
    clearAdminDraft(selectedId);
    // BUG FIX (#5): preserve edit di baris menunggu lain — capture sebelum
    // reload, re-apply sesudah render ulang.
    const dirtySnapshot = captureMenungguDirty(selectedId);
    await loadSurat();
    reapplyMenungguDirty(dirtySnapshot);
    // Refresh autocomplete POK — kalau MAK yang baru di-approve belum
    // pernah ada di history, tambahkan ke daftar suggestion.
    loadMAKSuggestions();
  } catch(e) {
    document.getElementById('approve-alert-icon').textContent = '⚠️';
    document.getElementById('approve-alert-text').textContent = `Gagal: ${e.message}`;
    document.getElementById('approve-alert').className = 'alert error show';
  } finally {
    btn.disabled = false; btn.classList.remove('loading');
  }
}

/* ════════════════════════════════════════════════════════════════════
   EDIT ROW (untuk surat yang sudah selesai)
   ─────────────────────────────────────────────────────────────────────
   Mengubah baris readonly (status='selesai') menjadi editable inline
   tanpa membuka modal. Tombol Aksi berubah jadi Simpan / Batal.

   Aturan:
     - Hanya 1 baris yg boleh edit pada satu waktu. Klik Edit pada baris
       lain otomatis menutup edit yang sedang berjalan.
     - Status TIDAK berubah setelah save — tetap 'selesai'. Hanya
       field-field yg di-PATCH.
     - Validasi field memakai validateApproveFields() yang sama dengan
       flow approve, supaya tidak ada celah field invalid lolos.
     - Jabatan penandatangan di-recompute dari riwayat_jabatan berdasar
       NIP+tanggal_surat baru (sama seperti saat approve).
═══════════════════════════════════════════════════════════════════════ */

function enableRowEdit(id) {
  // Kalau ada baris lain yg sedang di-edit, batalkan dulu (revert ke
  // readonly). Pakai cancelRowEdit supaya logikanya konsisten.
  if (editingRowId != null && editingRowId !== id) {
    cancelRowEdit(editingRowId);
  }

  const s = suratMap[id];
  if (!s || s.status !== 'selesai') return;

  editingRowId = id;
  const row = document.querySelector(`tr[data-surat-id="${id}"]`);
  if (!row) return;

  // Re-render hanya baris ini dgn editable=true. Pakai template dummy
  // untuk parse string HTML jadi <tr> element, lalu replace.
  const wrapper = document.createElement('tbody');
  wrapper.innerHTML = renderRowHTML(s);
  const newRow = wrapper.firstElementChild;
  row.replaceWith(newRow);

  // Pasang autoGrow + clear-err handler hanya untuk baris baru ini.
  attachEditableListeners(newRow);

  // Fokus ke field pertama yg editable supaya admin langsung bisa ngetik.
  const firstInput = newRow.querySelector('.xls-cell, .pg-input');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 50);
  }
}

function cancelRowEdit(id) {
  const s = suratMap[id];
  if (!s) { editingRowId = null; return; }

  editingRowId = null;
  // #8: cleanup draft saat user explicit cancel edit.
  clearAdminDraft(id);
  const row = document.querySelector(`tr[data-surat-id="${id}"]`);
  if (!row) return;

  // Render ulang baris dgn editable=false (data lama dari suratMap).
  // Tidak ada perubahan ke DB — ini benar-benar discard.
  const wrapper = document.createElement('tbody');
  wrapper.innerHTML = renderRowHTML(s);
  row.replaceWith(wrapper.firstElementChild);
}

async function saveRowEdit(id) {
  if (editingRowId !== id) return;

  // Pakai collectRowFields & validateApproveFields yang sama dgn approve
  // — biar field rules-nya konsisten (mis. format MAK, required field).
  const values = collectRowFields(id);
  if (!values) return;
  const { errors, errFields } = validateApproveFields(values);
  if (errors.length) {
    highlightRowFieldErrors(id, errFields);
    showPageAlert(`⚠️ Lengkapi dulu: ${errors.join(', ')}`, 'error');
    return;
  }

  // Recompute jabatan penandatangan berdasarkan tanggal_surat (mungkin
  // berubah) — sama seperti di submitApprove.
  const jabatan = lookupJabatan(values.penandatangan_nip, values.tanggal_surat);

  // #3: waktu_pelaksanaan_text sekarang bisa di-edit langsung di tabel
  // via toggle expand di kolom waktu. Ambil dari values (collectRow).
  // Kalau kosong → kirim NULL.
  const waktuTextForEdit = values.waktu_pelaksanaan_text && values.waktu_pelaksanaan_text.length
    ? values.waktu_pelaksanaan_text
    : null;

  // Payload TANPA field 'status' — status tetap 'selesai'.
  const payload = {
    nomor_surat:           values.nomor_surat,
    tanggal_surat:         values.tanggal_surat,
    tanggal_berangkat:     values.tanggal_berangkat,
    tanggal_kembali:       values.tanggal_kembali || null,
    waktu_pelaksanaan_text: waktuTextForEdit,
    perihal:               values.perihal,
    tujuan:                values.tujuan,
    pegawai_nip:           values.pegawai_nip,
    pegawai_list:          values.pegawai_list,
    menimbang_custom:      values.menimbang_custom,
    alat_angkutan:         values.alat_angkutan,
    pembebanan:            values.pembebanan,
    tempat_terbit:         values.tempat_terbit,
    penandatangan_nama:    values.penandatangan_nama,
    penandatangan_nip:     values.penandatangan_nip,
    penandatangan_jabatan: jabatan || '',
    tipe:                  values.tipe,
  };

  // Edge case: kalau admin edit pegawai_list (tambah/hapus/ubah urutan),
  // index di bertugas_sebagai tidak lagi valid — reset ke NULL agar admin
  // ulangi via tombol "Edit Role". Kita compare urutan NIP lama vs baru.
  // Kalau sama persis → biarkan (tidak ikutkan di payload). Kalau beda →
  // include bertugas_sebagai: null di payload.
  const sBefore = suratMap[id];
  const oldNips = Array.isArray(sBefore && sBefore.pegawai_nip) ? sBefore.pegawai_nip : [];
  const newNips = values.pegawai_nip;
  const nipsChanged = oldNips.length !== newNips.length
                      || oldNips.some((n, i) => String(n).trim() !== String(newNips[i] || '').trim());
  if (nipsChanged && Array.isArray(sBefore && sBefore.bertugas_sebagai) && sBefore.bertugas_sebagai.length) {
    payload.bertugas_sebagai = null;
    console.log('[APA] saveRowEdit: pegawai_list berubah → bertugas_sebagai di-reset ke NULL');
  }

  const row = document.querySelector(`tr[data-surat-id="${id}"]`);
  const btn = row ? row.querySelector('.btn-save-edit') : null;
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }

  try {
    await patchSuratTugas(id, payload);

    // Sukses — exit edit mode & reload data dari server agar in-memory
    // suratMap ter-sinkron (termasuk updated_at, dll).
    editingRowId = null;
    showPageAlert('✅ Perubahan berhasil disimpan.', 'success');
    // #8: cleanup draft surat ini setelah sukses save edit.
    clearAdminDraft(id);
    // BUG FIX (#5): preserve edit di baris menunggu lain — capture sebelum
    // reload, re-apply sesudah render ulang. (Baris yg di-edit di sini
    // sendiri ber-status 'selesai', jadi tidak ter-include di dirty
    // snapshot — exclude id sebagai safety net.)
    const dirtySnapshot = captureMenungguDirty(id);
    await loadSurat();
    reapplyMenungguDirty(dirtySnapshot);
    // Refresh autocomplete POK kalau MAK pembebanan diganti — sama
    // perlakuannya dgn submitApprove.
    loadMAKSuggestions();
  } catch(e) {
    showPageAlert(`Gagal menyimpan: ${e.message}`, 'error');
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
  }
}



/* ════════════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════════════ */
async function init() {
  SESSION = apaCheckSession({ requireAdmin: true });
  if (!SESSION) return;
  SESSION = await apaVerifyAdminSession(SESSION);
  if (!SESSION) return;
  if (window.APATopbar && typeof window.APATopbar.renderUser === 'function') window.APATopbar.renderUser(SESSION);
  if (window.APASidebar && typeof window.APASidebar.renderUser === 'function') window.APASidebar.renderUser(SESSION);
  
  await Promise.all([loadPegawai(), loadMitra(), loadRiwayatJabatan(), loadRiwayatPangkatGolongan(), loadRiwayatGelar(), loadUsers(), loadSurat()]);

  // Panaskan library saja. Template .docx tidak diambil saat halaman dibuka
  // supaya download manager tidak menangkap request storage sebagai unduhan.
  ensureDocxtemplaterLoaded().catch(() => {});

  // Load history POK dari allSurat yang sudah dimuat agar tidak request surat_tugas dua kali.
  loadMAKSuggestions();

  // Bersihkan file preview .docx yatim (>10 menit) di Supabase Storage secara fire-and-forget
  cleanupOrphanPreviewFiles();
}
init();

