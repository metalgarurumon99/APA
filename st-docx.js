// ═══════════════════════════════════════════════════════════════════════════════
// st-docx.js — Generator DOCX, Kamus POK & OOXML Post-Processing
// Modul hasil refactor P3 dari admin-surat-tugas.js (APA - BPS Kab. Raja Ampat)
// ═══════════════════════════════════════════════════════════════════════════════

/* ════════════════════════════════════════════════════════════════════
   GENERATOR DOCX
═══════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════
   HELPERS UNTUK TEMPLATE BARU — MAK Pembebanan, Hari Inclusive, PPK Lookup
   ──────────────────────────────────────────────────────────────────────
   Semua helper di sini dipakai oleh buildTemplateData() di bawah.
   Dipisah agar mudah di-maintain dan ditest secara terpisah.
═══════════════════════════════════════════════════════════════════════ */

/**
 * Format MAK Pembebanan yang valid:
 *   054.01.GG.2910.BMA.006.054.A.524119
 *   └─program─┘ └kgt─┘└kro┘└ro─┘└kmp┘└s┘└─akun─┘
 *
 * Aturan tiap komponen:
 *   - program       : 3 segmen "ddd.dd.GG|WA"
 *   - kegiatan      : 4 digit angka
 *   - kro           : 3 huruf kapital
 *   - ro            : 3 digit angka
 *   - komponen      : 3 digit angka
 *   - sub_komponen  : 1 huruf kapital
 *   - akun          : 6 digit angka
 */
const MAK_REGEX = /^(\d{3}\.\d{2}\.(?:GG|WA))\.(\d{4})\.([A-Z]{3})\.(\d{3})\.(\d{3})\.([A-Z])\.(\d{6})$/;

function parseMAK(str) {
  if (!str) return null;
  const m = String(str).trim().match(MAK_REGEX);
  if (!m) return null;
  return {
    program:      m[1],
    kegiatan:     m[2],
    kro:          m[3],
    ro:           m[4],
    komponen:     m[5],
    sub_komponen: m[6],
    akun:         m[7],
  };
}

/**
 * Bangun string MAK lengkap untuk placeholder {mak_pembebanan} di template.
 * Format: "{program} {kegiatan}.{kro}.{ro}.{komponen}.{sub_komponen}.{akun}"
 * Catatan: ada SPASI antara program dan kegiatan (sesuai spesifikasi).
 */
function formatMAKLengkap(mak) {
  if (!mak) return '';
  return `${mak.program} ${mak.kegiatan}.${mak.kro}.${mak.ro}.${mak.komponen}.${mak.sub_komponen}.${mak.akun}`;
}

/**
 * Bangun nomor SPD: B-{nomor}/668870-92800/SPPD-{kode_mak}/{mm}/{yyyy}
 * kode_mak diturunkan dari kegiatan:
 *   - kegiatan === '2886'  →  'DM2886'
 *   - lainnya              →  'PPIS{kegiatan}'
 */
function buildNomorSPD(nomor, tglSuratIso, mak) {
  if (!nomor || !tglSuratIso || !mak || !mak.kegiatan) return '';
  const d = parseISODate(tglSuratIso);
  if (!d) return '';
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  const kodeMAK = mak.kegiatan === '2886' ? 'DM2886' : `PPIS${mak.kegiatan}`;
  return `B-${nomor}/668870-92800/SPPD-${kodeMAK}/${mm}/${yyyy}`;
}

/* ════════════════════════════════════════════════════════════════════
   KAMUS POK — lookup deskripsi kode anggaran

   Tabel `kamus_pok` di Supabase menyimpan deskripsi untuk 7 segmen MAK.
   Hierarki: KRO punya parent = kode kegiatan, RO punya parent =
   "kegiatan.kro". Selain itu standalone (parent_kode = NULL).

   Strategi cache: muat sekali per tahun anggaran. Row dengan
   tahun_anggaran NULL = berlaku semua tahun (default). Row dengan tahun
   spesifik = override khusus tahun tersebut. Saat lookup, row tahun
   spesifik selalu menang.
═══════════════════════════════════════════════════════════════════════ */
let _kamusPokCache = null;  // Map<string, string>
let _kamusPokYear  = null;

async function loadKamusPok(tahun) {
  if (_kamusPokCache && _kamusPokYear === tahun) return _kamusPokCache;

  // Ambil row aktif untuk tahun spesifik DAN row default (NULL).
  const url = `${SUPABASE_URL}/rest/v1/kamus_pok` +
    `?aktif=eq.true` +
    `&or=(tahun_anggaran.eq.${tahun},tahun_anggaran.is.null)` +
    `&select=segmen,kode,parent_kode,deskripsi,tahun_anggaran`;

  const res = await fetch(url, { headers: { ...H } });
  if (!res.ok) {
    console.warn(`[APA] Gagal load kamus_pok (HTTP ${res.status}). Deskripsi POK akan kosong sementara (tidak di-cache permanen).`);
    return {};
  }
  const rows = await res.json();

  // Sort: row tahun spesifik di depan supaya menang saat first-wins build.
  rows.sort((a, b) => {
    if (a.tahun_anggaran && !b.tahun_anggaran) return -1;
    if (!a.tahun_anggaran && b.tahun_anggaran) return 1;
    return 0;
  });

  const map = {};
  rows.forEach(r => {
    const key = `${r.segmen}:${r.kode}:${r.parent_kode || ''}`;
    if (!(key in map)) map[key] = r.deskripsi || '';
  });

  _kamusPokCache = map;
  _kamusPokYear  = tahun;
  console.log(`[APA] Kamus POK loaded: ${rows.length} rows untuk tahun ${tahun}`);
  return map;
}

function lookupDeskripsi(segmen, kode, parent_kode) {
  if (!_kamusPokCache || !kode) return '';
  const key = `${segmen}:${kode}:${parent_kode || ''}`;
  return _kamusPokCache[key] || '';
}

// Dipanggil dari halaman manajemen-kamus-pok kalau admin edit data.
// Pasang juga listener storage event supaya tab admin lain auto-refresh.
function invalidateKamusPokCache() {
  _kamusPokCache = null;
  _kamusPokYear  = null;
}
window.addEventListener('storage', e => {
  if (e.key === 'apa_kamus_pok_invalidate') invalidateKamusPokCache();
});

/**
 * Hitung lama hari INCLUSIVE.
 *   - Tanggal tunggal     → 1 hari
 *   - 20 s.d. 22 April    → 3 hari (22-20+1)
 */
function hitungHariInclusive(isoMulai, isoSelesai) {
  if (!isoMulai) return 0;
  const ms = parseISODate(isoMulai);
  if (!ms) return 0;
  const se = isoSelesai ? parseISODate(isoSelesai) : ms;
  if (!se) return 1;
  const diff = Math.round((se.getTime() - ms.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

/**
 * Hitung jumlah destinasi dari teks tujuan, untuk loop {#destinasi}
 * di Section II SPD (Tiba di / Berangkat dari … N kali).
 *
 * Logika: count berapa kali kata "Kampung", "Desa", atau "Kelurahan"
 * muncul di teks tujuan (case-insensitive, word boundary).
 *
 * Contoh:
 *   "Kampung A dan Kampung C, Distrik Z; Kampung G, Distrik F;
 *    dan Kampung Y, Distrik X"
 *   → 4 (kata "Kampung" muncul 4 kali)
 *
 * Edge cases:
 * - Word boundary `\b` mencegah false-match (mis. "kampungan" tidak match)
 * - Case-insensitive (KAMPUNG, Kampung, kampung — semua match)
 * - Fallback minimum 1 — kalau tujuan kosong / tidak ada kata kunci,
 *   tetap render 1 baris supaya Section II tidak hilang.
 *
 * Kata kunci ke depan bisa ditambah (Pekon/Nagari/Gampong/dll) dengan
 * meng-extend regex di bawah.
 */
const RE_DE = /\b(kampung|desa|kelurahan)\b/gi;
function countDe(tujuanText) {
  if (!tujuanText) return 1;
  const matches = String(tujuanText).match(RE_DE);
  const count = matches ? matches.length : 0;
  return Math.max(1, count);
}

/**
 * Cari NIP berdasarkan nama di tabel riwayat_jabatan.
 * Toleran terhadap suffix gelar setelah koma — mis. "Abdillah Humam, SST"
 * akan match record dengan nama "Abdillah Humam, SST" maupun "Abdillah Humam".
 * Kalau lebih dari satu record (riwayat jabatan banyak), ambil yang pertama
 * — semua record untuk orang yang sama akan punya pegawai_nip yang sama.
 */
function findNipByNama(namaCari) {
  if (!namaCari || !Array.isArray(riwayatJabatan)) return '';
  const target     = String(namaCari).toLowerCase().trim();
  const targetCore = target.split(',')[0].trim(); // tanpa gelar

  const found = riwayatJabatan.find(r => {
    const nama = (r.nama || '').toLowerCase().trim();
    if (!nama) return false;
    const namaCore = nama.split(',')[0].trim();
    return nama === target || namaCore === targetCore;
  });
  return found ? String(found.pegawai_nip || '').trim() : '';
}

/**
 * Konstanta nama PPK — sementara hardcode di kode.
 * Nanti idealnya dipindah ke kolom config / DB agar tidak perlu deploy ulang
 * saat ada pergantian PPK. NIP di-lookup runtime dari riwayat_jabatan.
 */
const PPK_NAMA_DEFAULT = 'Abdillah Humam, SST';


/* ════════════════════════════════════════════════════════════════════
   TEMPLATE-BASED BUILDER — docxtemplater

   URL template & mapping tipe → template ada di TIPE_TO_TEMPLATE
   (didefinisikan di awal file). Loader-nya: loadTemplateBuffer(tipe).

   Tiga template di Supabase Storage:
     - template-surat-tugas-spd-kendaraan-menginap.docx              (T1)
     - template-surat-tugas-lampiran.docx                             (T2)
     - template-surat-tugas-lampiran-spd-kendaraan-menginap.docx     (T3)

   Tipe surat dipilih admin saat approve (kolom `tipe` di tabel persetujuan).
   Lihat TIPE_OPTIONS, TIPE_TO_FLAGS untuk daftar lengkap.
════════════════════════════════════════════════════════════════════ */

/* Helper untuk load script dinamis dengan verifikasi SRI */
function loadScript(src, integrity) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    if (integrity) {
      s.integrity = integrity;
      s.crossOrigin = 'anonymous';
    }
    s.onload = () => { console.log('[APA] Loaded:', src); resolve(); };
    s.onerror = () => reject(new Error(`Gagal load ${src}`));
    document.head.appendChild(s);
  });
}

async function ensureDocxtemplaterLoaded() {
  // Kalau sudah ada, return langsung
  if ((window.docxtemplater || window.Docxtemplater) && (window.PizZip || window.pizzip)) {
    return true;
  }
  const SRI_DXT = 'sha384-iFfWkkwxgayOORmVuUa4qEjdYyil2iKW0E2D1CgOQvaVkeKHJO1I8jc3OOhsRrX5';
  const SRI_PZZ = 'sha384-EKMdeygnsgFUPocowqWjGXhnzFAiDXk3KuOx8g8lsB5/JNEQYTWaADHxmioDiFU8';
  // Coba load dinamis dengan multiple CDN fallback + SRI
  const CDNS = [
    { dxt: 'https://unpkg.com/docxtemplater@3.68.5/build/docxtemplater.js',
      pzz: 'https://unpkg.com/pizzip@3.2.0/dist/pizzip.js' },
    { dxt: 'https://cdn.jsdelivr.net/npm/docxtemplater@3.68.5/build/docxtemplater.js',
      pzz: 'https://cdn.jsdelivr.net/npm/pizzip@3.2.0/dist/pizzip.js' },
    { dxt: 'https://cdnjs.cloudflare.com/ajax/libs/docxtemplater/3.68.5/docxtemplater.js',
      pzz: 'https://cdn.jsdelivr.net/npm/pizzip@3.2.0/dist/pizzip.js' },
  ];
  for (const cdn of CDNS) {
    try {
      if (!window.PizZip && !window.pizzip) await loadScript(cdn.pzz, SRI_PZZ);
      if (!window.docxtemplater && !window.Docxtemplater) await loadScript(cdn.dxt, SRI_DXT);
      if ((window.docxtemplater || window.Docxtemplater) && (window.PizZip || window.pizzip)) {
        return true;
      }
    } catch(e) {
      console.warn('[APA] CDN gagal, coba berikutnya:', e.message);
    }
  }
  return false;
}

/* ════════════════════════════════════════════════════════════════════
   TEMPLATE LOADER (tipe-based)
   ─────────────────────────────────────────────────────────────────────
   Cache buffer per-URL supaya template yg sudah pernah di-fetch tidak
   di-download ulang. Mendukung 3 template (T1/T2/T3) yg URL-nya
   ditentukan oleh `data.tipe` lewat helper tipeTemplateUrl() di awal
   file ini.

   Fungsi loadTemplateBuffer(tipe):
     - tipe valid → fetch URL yg sesuai (cache-aware) → return ArrayBuffer
     - tipe null/invalid → throw dengan pesan jelas
═══════════════════════════════════════════════════════════════════════ */

const _templateBufferCache = {};   // url → ArrayBuffer

async function loadTemplateBuffer(tipe) {
  const url = tipeTemplateUrl(tipe);
  if (!url) {
    throw new Error(
      `Tipe surat tidak valid atau belum dipilih (tipe="${tipe}"). ` +
      `Admin wajib memilih tipe sebelum approve. Silakan edit baris ini ` +
      `dan set ulang tipe.`
    );
  }
  if (_templateBufferCache[url]) return _templateBufferCache[url];

  console.log('[APA] Memuat template (tipe=' + tipe + ') dari:', url);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Gagal memuat template untuk tipe "${tipe}" (HTTP ${res.status}). ` +
      `Pastikan file ${url} ada di Supabase Storage dan bisa diakses publik.`
    );
  }
  const buf = await res.arrayBuffer();
  _templateBufferCache[url] = buf;
  console.log('[APA] Template loaded:', buf.byteLength, 'bytes');
  return buf;
}

/* Helper format tanggal ISO → "DD Nama-Bulan YYYY" (Indonesia) */
function fmtTglId(isoStr) {
  if (!isoStr) return '';
  const d = parseISODate(isoStr);
  if (!d) return '';
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/* Bangun objek mapping data → placeholder template.
   Satu-satunya tempat di mana field dari DB di-mapping ke nama placeholder.
   ──────────────────────────────────────────────────────────────────────
   Daftar placeholder yang dipakai template — terurut sesuai kemunculan:

   HALAMAN 1 (Surat Tugas):
     {nomor_surat}, {menimbang}, {nama}, {jabatan}, {perihal},
     {tempat_tujuan}, {waktu_pelaksanaan}, {tahun}, {mak_pembebanan},
     {tgl_surat}, {jabatan_penandatangan}, {penandatangan},
     {nip_penandatangan}

     CATATAN: jika pegawai_list >= 2, {nama} & {jabatan} otomatis
     terisi "Terlampir" — daftar lengkap dimunculkan di halaman lampiran.

   HALAMAN 2 (SPD):
     {nomor_spd}, {nama_ppk}, {nip}, {pangkat}, {angkutan},
     {hari}, {tanggal_berangkat}, {tanggal_kembali},
     {program}, {kegiatan}, {kro}, {ro}, {komponen}, {sub_komponen}, {akun},
     {des_program}, {des_kegiatan}, {des_kro}, {des_ro},
     {des_komponen}, {des_sub_komponen}, {des_akun}, {nip_ppk}

   HALAMAN 3 (Lampiran — hanya jika ≥2 pegawai):
     {#has_lampiran_st}...{/has_lampiran_st}  ← bungkus seluruh halaman
     {#ul}...{/ul}                            ← bungkus baris tabel
       Field per-iterasi: {no}, {nama_p}, {nip_p},
                          {pangkat_p}, {golongan_p}, {pangkat_golongan_p},
                          {jabatan_p}, {bertugas_p}, {jabatan_bertugas_p}
       Catatan: {jabatan_bertugas_p} adalah field gabungan untuk kolom
       "Jabatan/Bertugas Sebagai" — sudah di-format jadi
       "{jabatan_p} / {bertugas_p}" kalau bertugas_p terisi, atau
       "{jabatan_p}" saja kalau kosong. Pakai {jabatan_bertugas_p}
       di template (single placeholder), bukan dua tag terpisah.
       Sama untuk {pangkat_golongan_p}: gabungan "pangkat / golongan"
       (atau "-" untuk mitra). Tag {pangkat_p} & {golongan_p} masih
       di-populate untuk backward-compat dengan template lama, tapi
       template baru cukup pakai {pangkat_golongan_p}.
     Header lampiran ikut pakai: {nomor_surat}, {tgl_surat}, {awalan},
                                 {menimbang},
                                 {jabatan_penandatangan}, {penandatangan},
                                 {nip_penandatangan}
*/
async function buildTemplateData(data, opts) {
  // opts: { jumlahResponden?: number|string|null }
  // Hanya dipakai untuk tipe yang punya visum. Diabaikan untuk tipe lain.
  const jumlahResponden = (opts && opts.jumlahResponden != null) ? opts.jumlahResponden : null;
  // ── Flags dari tipe ──────────────────────────────────────────────────
  // Sumber kebenaran sekarang adalah `data.tipe`, bukan jumlah pegawai.
  // Kalau tipe NULL/invalid, tipeFlags() return all-false (defensive).
  const flags = tipeFlags(data.tipe);

  // ── Daftar pegawai ───────────────────────────────────────────────────
  const nipList  = Array.isArray(data.pegawai_nip)  ? data.pegawai_nip  : [];
  const nameList = Array.isArray(data.pegawai_list) ? data.pegawai_list : [];

  // Pegawai pertama — dipakai untuk halaman 1 (kalau cuma 1 orang) dan SPD
  const firstNip = String(nipList[0] || '').trim();
  const firstNm  = nameList[0] || '';
  // Lookup pegawai DAN mitra. Mitra punya NIP placeholder MITRA-{tahun}-{id};
  // untuk pegawai asli, lookup pegawaiByNIP[nip]. Lihat helper isMitraNip()
  // untuk deteksi.
  const peg              = isMitraNip(firstNip) ? null : pegawaiByNIP[firstNip];
  const mitr             = isMitraNip(firstNip) ? mitraByNip[firstNip]      : null;
  const namaPegawai      = lookupGelar(firstNip, data.tanggal_surat)
                             || pegawaiNama(peg)
                             || (mitr && mitr.nama)
                             || firstNm
                             || '';
  // Untuk mitra: jabatan = "Mitra" (dari record mitra), pangkat = "-"
  // Untuk pegawai: jabatan = lookup riwayat_jabatan, pangkat = '' (belum ada di skema)
  const jabatanPegawai   = mitr
                             ? (mitr.jabatan || 'Mitra')
                             : (lookupJabatan(firstNip, data.tanggal_surat) || '');
  // Pangkat & golongan pegawai tunggal diambil dari riwayat_pangkat_golongan (mitra = '-')
  const pgTunggal        = mitr ? null : lookupPangkatGolongan(firstNip, data.tanggal_surat);
  const pangkatPegawai   = mitr
                             ? '-'
                             : (pgTunggal
                                 ? (pgTunggal.pangkat && pgTunggal.golongan
                                     ? `${pgTunggal.pangkat} (${pgTunggal.golongan})`
                                     : (pgTunggal.pangkat || pgTunggal.golongan || ''))
                                 : '');
  // Satuan kerja: pegawai dari kolom UNIT KERJA, mitra dari kolom instansi
  const skerjaPegawai    = mitr
                             ? (mitr.instansi || '')
                             : pegawaiUnitKerja(peg);

  // ── Halaman 1: nama, jabatan, pangkat → "Terlampir" kalau ≥2 pegawai
  // Sesuai konfirmasi user: untuk pegawai >1 nama, jabatan, pangkat &
  // golongan, serta jabatan/instansi memang menjadi "Terlampir".
  // (Termasuk di SPD — sengaja, supaya konsisten.)
  // ─────────────────────────────────────────────────────────────────────
  const banyakPegawai = nameList.length >= 2;
  const namaHal1      = banyakPegawai ? 'Terlampir' : namaPegawai;
  const jabatanHal1   = banyakPegawai ? 'Terlampir' : jabatanPegawai;
  const pangkatHal1   = banyakPegawai ? 'Terlampir' : pangkatPegawai;

  // Array role tambahan per pegawai (paralel dengan nipList & nameList).
  // Format DB: TEXT[] — element kosong/NULL artinya pegawai tsb tanpa role
  // tambahan. Hanya relevan untuk tipe lampiran (T2/T3V); tipe non-lampiran
  // tidak akan punya field ini di DB → array kosong → semua bertugas_p = ''.
  const bertugasList = Array.isArray(data.bertugas_sebagai) ? data.bertugas_sebagai : [];

  // Helper kecil — bangun row pegawai standar yang dipakai di lampiran
  // maupun di array kendaraan/menginap. DRY: kedua array isi pegawai-nya
  // identik, hanya beda nama variable. Sebelumnya ada duplikasi 100% di
  // dua .map() berbeda — sekarang konsolidasi via helper ini.
  //
  // Aturan format kolom "Jabatan/Bertugas Sebagai":
  //   - bertugas_p kosong  → tampilkan {jabatan_p} saja
  //   - bertugas_p terisi  → tampilkan "{jabatan_p} / {bertugas_p}"
  // Logic ini di-precompute jadi field jabatan_bertugas_p supaya template
  // tinggal pakai 1 placeholder saja (tidak perlu {#bertugas_p}{/bertugas_p}
  // conditional di template, lebih simple di-maintain).
  function buildPegawaiRow(nm, i) {
    const nip  = String(nipList[i] || '').trim();
    // Branch: pegawai biasa vs mitra. Lookup ke pegawaiByNIP atau mitraByNip
    // sesuai prefix NIP. Lihat isMitraNip() helper.
    const isMitra = isMitraNip(nip);
    const p    = isMitra ? null : pegawaiByNIP[nip];
    const m    = isMitra ? mitraByNip[nip] : null;

    // Field-field dasar (nama, jabatan, pangkat, golongan, skerja, nip_p)
    // di-resolve sesuai sumber data:
    //   - Pegawai biasa: lookup pegawaiByNIP + riwayat_jabatan + riwayat_pangkat_golongan
    //   - Mitra: dari record mitra (jabatan='Mitra', pangkat='-', nip='-')
    const nama_p     = lookupGelar(nip, data.tanggal_surat)
                       || pegawaiNama(p) || (m && m.nama) || nm || '';
    const nip_p      = isMitra ? '-' : (nip || '-');
    const jabatan_p  = isMitra
                         ? (m ? (m.jabatan || 'Mitra') : 'Mitra')
                         : (lookupJabatan(nip, data.tanggal_surat) || '');
    // Pangkat & golongan — lookup dari riwayat_pangkat_golongan (TMT-aware).
    // Mitra: keduanya "-" (mitra tidak punya pangkat resmi).
    const pgRecord = isMitra ? null : lookupPangkatGolongan(nip, data.tanggal_surat);
    const pangkat_p  = isMitra ? '-' : (pgRecord ? (pgRecord.pangkat  || '') : '');
    const golongan_p = isMitra ? '-' : (pgRecord ? (pgRecord.golongan || '') : '');
    // Field gabungan untuk template (rule: "pangkat / golongan" untuk pegawai,
    // "-" untuk mitra). Ini yang dipakai di template (single placeholder).
    let pangkat_golongan_p;
    if (isMitra) {
      pangkat_golongan_p = '-';
    } else if (pangkat_p && golongan_p) {
      pangkat_golongan_p = `${pangkat_p} / ${golongan_p}`;
    } else if (pangkat_p) {
      pangkat_golongan_p = pangkat_p;
    } else if (golongan_p) {
      pangkat_golongan_p = golongan_p;
    } else {
      pangkat_golongan_p = '';
    }

    const skerja_p   = isMitra
                         ? (m ? (m.instansi || '') : '')
                         : pegawaiUnitKerja(p);

    const bertugas_p = String(bertugasList[i] || '').trim();
    const jabatan_bertugas_p = bertugas_p
      ? `${jabatan_p} / ${bertugas_p}`
      : jabatan_p;

    return {
      no:                 String(i + 1),
      nama_p,
      nip_p,
      pangkat_p,
      golongan_p,
      pangkat_golongan_p,
      jabatan_p,
      bertugas_p,
      jabatan_bertugas_p,
      skerja_p,
    };
  }

  // Bangun array pegawai untuk loop tabel di halaman lampiran (T2/T3V).
  // Setiap item: { no, nama_p, nip_p, pangkat_p, golongan_p,
  //                pangkat_golongan_p, jabatan_p, bertugas_p,
  //                jabatan_bertugas_p, skerja_p }
  // pangkat_p, golongan_p, pangkat_golongan_p di-lookup dari
  // riwayat_pangkat_golongan (TMT-aware). Mitra → semua "-".
  const pegawaiLampiran = nameList.map(buildPegawaiRow);

  // Reuse hasil mapping pegawaiLampiran (menghindari double mapping identik)
  const pegawaiBaris = pegawaiLampiran;

  // ── Penandatangan ────────────────────────────────────────────────────
  // Rule transform jabatan_penandatangan (lihat transformJabatanPenandatangan):
  //   Input dari kolom penandatangan_jabatan adalah salah satu dari:
  //     - "Kepala BPS Kabupaten Raja Ampat"
  //     - "Plt. Kepala Badan Pusat Statistik"
  //     - lainnya
  //   Output di template:
  //     - "Kepala BPS Kabupaten Raja Ampat"   (apa adanya)
  //     - "Plt. Kepala BPS Kabupaten Raja Ampat"
  //     - "Plh. Kepala BPS Kabupaten Raja Ampat"
  // Fallback: kalau penandatangan_jabatan kosong, lookup via lookupJabatan
  // (jenis='utama') untuk konsistensi dengan behavior lama.
  const ttdNip        = data.penandatangan_nip  || '';
  const ttdNama       = lookupGelar(ttdNip, data.tanggal_surat)
                     || data.penandatangan_nama
                     || '';
  const ttdJabRaw     = data.penandatangan_jabatan
                     || lookupJabatan(ttdNip, data.tanggal_surat)
                     || '';
  const ttdJabatan    = transformJabatanPenandatangan(ttdJabRaw);

  // ── PPK (Pejabat Pembuat Komitmen) ───────────────────────────────────
  // Lookup dari riwayat_jabatan jenis='lainnya' untuk row dengan
  // jabatan='Pejabat Pembuat Komitmen' dan tmt <= tanggal_surat.
  // Ambil yang TMT-nya paling baru.
  const ppkRecord = lookupJabatanLainnya('Pejabat Pembuat Komitmen', data.tanggal_surat);
  const nipPPK    = ppkRecord ? String(ppkRecord.pegawai_nip || '').trim() : '';
  // Resolve nama PPK: pertama dari data_pegawai (NAMA), fallback ke
  // riwayat_jabatan.nama (denormalized), lalu fallback ke default.
  let namaPPK = '';
  if (nipPPK) {
    const pegPPK = pegawaiByNIP[nipPPK];
    namaPPK = lookupGelar(nipPPK, data.tanggal_surat)
            || pegawaiNama(pegPPK)
            || (ppkRecord && ppkRecord.nama)
            || '';
  }
  // Fallback terakhir: kalau lookup tidak return (data belum di-seed),
  // pakai PPK_NAMA_DEFAULT supaya surat tetap render dengan placeholder
  // yang masuk akal — bukan string kosong.
  if (!namaPPK) namaPPK = PPK_NAMA_DEFAULT;

  // ── MAK Pembebanan ───────────────────────────────────────────────────
  const mak        = parseMAK(data.pembebanan);
  const makLengkap = formatMAKLengkap(mak);

  // ── Nomor surat & tahun dari tanggal_surat ───────────────────────────
  const nomorSuratFull = buildNomorSuratFull(data.nomor_surat, data.tanggal_surat);
  const tglSuratDate   = parseISODate(data.tanggal_surat);
  const tahun          = tglSuratDate ? String(tglSuratDate.getFullYear()) : '';

  // ── Nomor SPD ────────────────────────────────────────────────────────
  const nomorSPD = buildNomorSPD(data.nomor_surat, data.tanggal_surat, mak);

  // ── Lama hari (inclusive) ────────────────────────────────────────────
  const hari = hitungHariInclusive(data.tanggal_berangkat, data.tanggal_kembali);

  // ── Waktu pelaksanaan ─────────────────────────────────────────────────
  // Prioritas: kolom waktu_pelaksanaan_text (admin override untuk kasus
  // multi-range, mis. "25 s.d. 27 Maret & 30 Maret s.d. 1 April 2026").
  // Kalau kosong, fallback ke format auto dari range tanggal.
  const waktuPelaksanaan = (data.waktu_pelaksanaan_text && data.waktu_pelaksanaan_text.trim())
                        || fmtWaktu(data.tanggal_berangkat, data.tanggal_kembali)
                        || '';

  // ── Awalan untuk header tabel lampiran ───────────────────────────────
  // "Daftar Peserta" untuk surat pelatihan, "Daftar Petugas" untuk lainnya.
  const awalan = computeAwalan(data.perihal);

  // ── Load kamus POK untuk tahun anggaran surat ────────────────────────
  const tahunAnggaran = tglSuratDate ? tglSuratDate.getFullYear() : new Date().getFullYear();
  await loadKamusPok(tahunAnggaran);

  return {
    // ─────────────────────────────────────────────────────────────────
    // HALAMAN 1 — Surat Tugas
    // ─────────────────────────────────────────────────────────────────
    nomor_surat:           nomorSuratFull,
    menimbang:             data.menimbang_custom || '',
    nama:                  namaHal1,        // ← "Terlampir" jika ≥2 pegawai
    jabatan:               jabatanHal1,     // ← "Terlampir" jika ≥2 pegawai
    perihal:               data.perihal || '',
    tempat_tujuan:         data.tujuan  || '',
    // {untuk_text} — field gabungan untuk baris "Untuk" di surat tugas:
    //   - Kalau tempat_tujuan terisi → pakai tempat_tujuan
    //   - Kalau tempat_tujuan kosong → "{perihal} pada tanggal {waktu_pelaksanaan}"
    // Pakai tag {untuk_text} di template (single placeholder), bukan
    // docxtemplater conditional yang sulit dengan format multi-paragraf.
    untuk_text:            (data.tujuan && data.tujuan.trim())
                             ? data.tujuan
                             : `${data.perihal || ''} pada tanggal ${waktuPelaksanaan}`,
    waktu_pelaksanaan:     waktuPelaksanaan,
    tahun:                 tahun,
    mak_pembebanan:        makLengkap,
    tgl_surat:             fmtTglId(data.tanggal_surat),
    jabatan_penandatangan: ttdJabatan,
    penandatangan:         ttdNama,
    nip_penandatangan:     ttdNip,

    // ─────────────────────────────────────────────────────────────────
    // HALAMAN 2 — SPD (toggle dengan {#has_spd}...{/has_spd} di T1)
    //   Catatan: T3 tidak punya {#has_spd} wrapper — SPD selalu render
    //   di sana. Aman karena tipe yg pakai T3 memang selalu ada SPD.
    // ─────────────────────────────────────────────────────────────────
    has_spd:               flags.has_spd,
    nomor_spd:             nomorSPD,
    nama_ppk:              namaPPK,
    nip_ppk:               nipPPK,
    // {nip} — tetap NIP asli (dipakai di beberapa tempat lain di template).
    // Untuk SPD baris "Nama/NIP", pakai tag TUNGGAL {nama_nip} di template
    // supaya hasilnya "Terlampir" (bukan "Terlampir / Terlampir").
    // → Di template Word: ganti "{nama} / {nip}" menjadi "{nama_nip}"
    nip:                   firstNip,
    // {nama_nip} — tag gabungan untuk sel "Nama / NIP" di SPD.
    //   1 pegawai  : "Nama Lengkap / NIP123"
    //   ≥ 2 pegawai: "Terlampir"
    nama_nip:              banyakPegawai
                             ? 'Terlampir'
                             : (namaPegawai && firstNip
                                  ? `${namaPegawai} / ${firstNip}`
                                  : (namaPegawai || firstNip || '')),
    // {skerja_p} halaman 1: unit kerja pegawai / instansi mitra.
    // "Terlampir" jika ≥2 pegawai (konsisten dengan {nama}/{jabatan}).
    skerja_p:              banyakPegawai ? 'Terlampir' : skerjaPegawai,
    pangkat:               pangkatHal1,    // ← "Terlampir" jika ≥2 pegawai
    angkutan:              data.alat_angkutan || '',
    hari:                  hari ? String(hari) : '',
    tanggal_berangkat:     fmtTglId(data.tanggal_berangkat),
    tanggal_kembali:       fmtTglId(data.tanggal_kembali || data.tanggal_berangkat),

    // ── Mata Anggaran (per komponen) ─────────────────────────────────
    program:               mak ? mak.program       : '',
    kegiatan:              mak ? mak.kegiatan      : '',
    kro:                   mak ? `${mak.kegiatan}.${mak.kro}`               : '',
    ro:                    mak ? `${mak.kegiatan}.${mak.kro}.${mak.ro}`     : '',
    komponen:              mak ? mak.komponen      : '',
    sub_komponen:          mak ? mak.sub_komponen  : '',
    akun:                  mak ? mak.akun          : '',

    // ── Deskripsi mata anggaran ──────────────────────────────────────
    des_program:           mak ? lookupDeskripsi('program',      mak.program)                                  : '',
    des_kegiatan:          mak ? lookupDeskripsi('kegiatan',     mak.kegiatan)                                 : '',
    des_kro:               mak ? lookupDeskripsi('kro',          mak.kro,          mak.kegiatan)               : '',
    des_ro:                mak ? lookupDeskripsi('ro',           mak.ro,           `${mak.kegiatan}.${mak.kro}`) : '',
    des_komponen:          mak ? lookupDeskripsi('komponen',     mak.komponen)                                 : '',
    des_sub_komponen:      mak ? lookupDeskripsi('sub_komponen', mak.sub_komponen)                             : '',
    des_akun:              mak ? lookupDeskripsi('akun',         mak.akun)                                     : '',

    // ─────────────────────────────────────────────────────────────────
    // BLOK KENDARAAN — toggle {#kendaraan}...{/kendaraan}
    // BLOK MENGINAP  — toggle {#menginap}...{/menginap}
    //
    // Array kosong → blok hilang dari output.
    // Array berisi → blok render N kali (N = jumlah pegawai).
    // ─────────────────────────────────────────────────────────────────
    kendaraan:             flags.has_kendaraan ? pegawaiBaris : [],
    menginap:              flags.has_menginap  ? pegawaiBaris : [],

    // ─────────────────────────────────────────────────────────────────
    // SECTION II SPD — multi-row loop {#destinasi}...{/destinasi}
    //
    // 4 baris tabel (Tiba di / Berangkat dari / Pada tanggal / spasi)
    // direplikasi N kali. N dihitung dari jumlah kata "Kampung/Desa/
    // Kelurahan" di teks tujuan (lihat countDestinasi() di atas).
    //
    // Setiap iterasi adalah object KOSONG ({}) — tidak ada placeholder
    // di template Section II, semua label-only. User isi manual di Word
    // setelah generate.
    //
    // Hanya aktif di tipe yang punya SPD (T1/T3 dengan {#has_spd}).
    // Untuk tipe non-SPD, array tetap di-build tapi tidak dipakai.
    // ─────────────────────────────────────────────────────────────────
    de:             Array(countDe(data.tujuan)).fill({}),

    // ─────────────────────────────────────────────────────────────────
    // HALAMAN LAMPIRAN — toggle {#ul}...{/ul} (T2 & T3)
    //
    // Untuk T1 (tanpa lampiran), array kosong cukup karena T1 tidak
    // punya tag {#ul} sama sekali — engine ignore field tak terpakai.
    // - has_lampiran_st: legacy field (backward-compat dgn template lama
    //   yg pakai {#has_lampiran_st}, kalau masih ada di production).
    // - awalan: pembuka kalimat sebelum {menimbang} di header lampiran.
    //   "Daftar Peserta" untuk surat pelatihan, "Daftar Petugas" lainnya.
    // ─────────────────────────────────────────────────────────────────
    has_lampiran_st:       flags.has_lampiran,
    awalan:                awalan,
    ul:                    flags.has_lampiran ? pegawaiLampiran : [],

    // ─────────────────────────────────────────────────────────────────
    // LEMBAR VISUM — toggle {#visum}...{/visum} (T1V & T3V)
    //
    // Struktur tabel di template:
    //   - 1 baris header (No, Tanggal, Nama, Instansi, TTD, Ket)
    //   - 1 baris angka (1)(2)(3)(4)(5)(6)
    //   - 6 baris kosong default (untuk diisi manual setelah cetak)
    //   - 1 baris loop {#r}...{/r} di akhir
    //
    // Untuk loop {#r}{/r}: kalau jumlah_responden user input ≤ 6 atau
    // kosong → array `r` punya 1 elemen (baris loop tetap render 1x →
    // total 7 baris kosong terlihat). Kalau input > 6 → array `r` punya
    // (input - 6) elemen → total = input baris.
    //
    // Setiap elemen `r` adalah object kosong {} karena tabel ini
    // dirancang untuk dicetak & diisi manual — tidak ada placeholder
    // data di kolom-kolomnya.
    //
    // visum: array dengan 1 elemen kalau has_visum, supaya seluruh
    // section visum render 1x. Kalau false → array kosong → section
    // hilang dari output.
    //
    // Kenapa visum dibungkus array (bukan boolean)?
    //   docxtemplater: {#visum}...{/visum} dengan array berisi N elemen
    //   akan render N kali. Dengan boolean true → render 1x (sama).
    //   Pakai array supaya scope `r` di dalamnya bisa di-reference.
    // ─────────────────────────────────────────────────────────────────
    visum:                 flags.has_visum
                             ? [{ r: Array(calcVisumLoopCount(jumlahResponden)).fill({}) }]
                             : [],
  };
}

/* ════════════════════════════════════════════════════════════════════
   POST-PROCESSING: hapus paragraf kosong di akhir body (Tugas #6)
   ─────────────────────────────────────────────────────────────────────
   Konteks: blok loop {#menginap}...{/menginap} di template kadang
   meninggalkan paragraf kosong di akhir document (artefak engine
   docxtemplater) yang men-trigger blank page di Word. Karena meta-module
   `dropLastPageIfEmpty()` adalah PAID module, kita lakukan post-processing
   manual: ambil `word/document.xml` dari zip, parse via DOMParser, hapus
   paragraf kosong yang ada DI AKHIR body (tepat sebelum final <w:sectPr>),
   lalu write back ke zip.

   Struktur OOXML body biasanya berakhir salah satu dari pola ini:
     Pola A:  ...<w:p>konten</w:p><w:p>kosong</w:p><w:sectPr>...</w:sectPr></w:body>
                                                    ^^^^^^^^^^
                                                    sectPr SEBAGAI CHILD body
     Pola B:  ...<w:p>konten</w:p><w:p><w:pPr><w:sectPr>...</w:sectPr></w:pPr>...</w:p></w:body>
                                                ^^^^^^^^^^
                                                sectPr DI DALAM pPr paragraf terakhir

   Implementasi lama: cek `body.lastElementChild` — kalau ketemu <w:sectPr>
   (Pola A) langsung break tanpa cleaning. Itu BUG: paragraf-paragraf
   kosong sebelum sectPr tetap ada → blank page.

   Fix: skip <w:sectPr> di posisi paling akhir, lalu walk ke belakang dari
   sibling sebelumnya. Untuk Pola B, paragraf carrier sectPr-nya tetap
   tidak boleh dihapus (sudah di-handle dgn cek nested sectPr).

   Tambahan: paragraf yang isinya hanya page break (<w:br w:type="page"/>)
   tanpa text/media juga di-hapus — ini sumber blank page lain yang
   sebelumnya tidak ter-handle.

   Defensive:
     - SEMUA error dibungkus try/catch — kalau apapun gagal, document
       asli TIDAK disentuh (no-op fallback).
     - Berhenti iterasi begitu ketemu konten meaningful (text run, gambar,
       atau sectPr nested).
     - Cap maksimal 30 paragraf untuk mencegah loop accidental.

   Aman dipanggil walaupun template tidak punya trailing empty para
   (no-op).
═══════════════════════════════════════════════════════════════════════ */
function dropTrailingEmptyParagraphs(doc) {
  let zip;
  try { zip = doc.getZip(); } catch(_) { return; }

  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) {
    console.warn('[APA] dropTrailingEmpty: word/document.xml not found');
    return;
  }

  let xml;
  try { xml = file.asText(); } catch(_) { return; }
  if (!xml || typeof xml !== 'string') return;

  // Preserve XML declaration kalau ada (XMLSerializer biasanya drop ini)
  let xmlDecl = '';
  const declMatch = xml.match(/^<\?xml[^?]*\?>\s*/);
  if (declMatch) xmlDecl = declMatch[0];

  // Parse
  let xmlDoc;
  try {
    xmlDoc = new DOMParser().parseFromString(xml, 'application/xml');
  } catch(e) {
    console.warn('[APA] dropTrailingEmpty: parse failed', e);
    return;
  }

  // Cek error parse (browser inject <parsererror>)
  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    console.warn('[APA] dropTrailingEmpty: parsererror found, skip');
    return;
  }

  // Cari <w:body> (namespace-agnostic via localName)
  const body = xmlDoc.getElementsByTagNameNS('*', 'body')[0];
  if (!body) {
    console.warn('[APA] dropTrailingEmpty: <w:body> not found');
    return;
  }

  // Helper: cek apakah suatu <w:p> dianggap "kosong" — boleh dihapus?
  // Kosong = tidak punya text content, drawing, pict, atau object.
  // Paragraf yang isinya HANYA page break / line break / properties juga
  // dianggap kosong.
  function isEmptyParagraph(p) {
    // Ada text dengan konten?
    const texts = p.getElementsByTagNameNS('*', 't');
    for (let i = 0; i < texts.length; i++) {
      if ((texts[i].textContent || '').length > 0) return false;
    }
    // Ada media?
    if (p.getElementsByTagNameNS('*', 'drawing').length > 0)  return false;
    if (p.getElementsByTagNameNS('*', 'pict').length > 0)     return false;
    if (p.getElementsByTagNameNS('*', 'object').length > 0)   return false;
    // Konten lain (mis. SmartArt, math, dll) — kalau ragu, jangan hapus.
    // Cek tag-tag content lain yang mungkin penting.
    if (p.getElementsByTagNameNS('*', 'oMath').length > 0)    return false;
    return true;
  }

  // Helper: cek apakah <w:p> ini carrier untuk final <w:sectPr> (Pola B).
  // Kalau iya, JANGAN dihapus — dokumen butuh section properties.
  function carriesSectPr(p) {
    return p.getElementsByTagNameNS('*', 'sectPr').length > 0;
  }

  // ── STEP 1: identifikasi posisi awal walk ──────────────────────────
  // Kalau child terakhir body adalah <w:sectPr> (Pola A), skip dia —
  // mulai walk dari sibling sebelumnya.
  let cursor = body.lastElementChild;
  if (cursor && cursor.localName === 'sectPr') {
    cursor = cursor.previousElementSibling;
  }

  // ── STEP 2: walk ke belakang, hapus paragraf kosong ────────────────
  let removed = 0;
  const MAX_REMOVE = 30;

  while (cursor && removed < MAX_REMOVE) {
    // Hanya proses <w:p>. Selain itu (mis. <w:tbl>, <w:sectPr> tak
    // terduga) → STOP.
    if (cursor.localName !== 'p') break;

    // Carrier sectPr (Pola B) → STOP, jangan disentuh.
    if (carriesSectPr(cursor)) break;

    // Punya konten meaningful → STOP.
    if (!isEmptyParagraph(cursor)) break;

    // Hapus paragraf kosong, geser cursor ke sibling sebelumnya.
    const prev = cursor.previousElementSibling;
    cursor.parentNode.removeChild(cursor);
    removed++;
    cursor = prev;
  }

  if (removed === 0) return;

  // Serialize kembali ke string XML
  let newXml;
  try {
    newXml = new XMLSerializer().serializeToString(xmlDoc);
  } catch(e) {
    console.warn('[APA] dropTrailingEmpty: serialize failed', e);
    return;
  }

  // Restore XML declaration kalau XMLSerializer drop
  if (xmlDecl && !newXml.startsWith('<?xml')) {
    newXml = xmlDecl + newXml;
  }

  // Write back ke zip
  try {
    zip.file(xmlPath, newXml);
    console.log(`[APA] dropTrailingEmpty: removed ${removed} empty trailing paragraph(s)`);
  } catch(e) {
    console.warn('[APA] dropTrailingEmpty: zip update failed', e);
  }
}

async function buildSuratTugasDoc(data, opts) {
  // opts: { jumlahResponden?: number|string|null }
  // jumlahResponden tidak disimpan ke DB — di-pass per-call dari UI
  // (modal Approve / dialog input saat preview/download).
  console.log('[APA] buildSuratTugasDoc() dipanggil', { suratId: data.id, opts });

  // Pastikan docxtemplater sudah ter-load (dengan fallback dynamic loading)
  await ensureDocxtemplaterLoaded();

  // Docxtemplater bisa ter-expose sebagai window.docxtemplater (lowercase, UMD modern)
  // atau window.Docxtemplater (uppercase, versi lama). Kita handle keduanya.
  const DocxtemplaterCtor =
      (window.docxtemplater && (window.docxtemplater.default || window.docxtemplater))
   || (window.Docxtemplater && (window.Docxtemplater.default || window.Docxtemplater));
  const PizZipCtor =
      (window.PizZip && (window.PizZip.default || window.PizZip))
   || (window.pizzip  && (window.pizzip.default  || window.pizzip));

  if (!DocxtemplaterCtor || !PizZipCtor) {
    console.error('[APA] Docxtemplater / PizZip belum dimuat.',
      'window.docxtemplater =', typeof window.docxtemplater,
      'window.Docxtemplater =', typeof window.Docxtemplater,
      'window.PizZip =', typeof window.PizZip,
      'window.pizzip =', typeof window.pizzip);
    throw new Error(
      'Library docxtemplater / PizZip gagal dimuat. ' +
      'Periksa koneksi internet/firewall, lalu refresh halaman.'
    );
  }
  console.log('[APA] Docxtemplater OK — akan pakai template-based rendering');

  // Tentukan template berdasarkan `data.tipe`. Validasi sudah dilakukan
  // di sisi UI (admin wajib pilih tipe sebelum approve), tapi defensive
  // check di sini supaya pesan error-nya jelas kalau ada surat lama yg
  // tipe-nya null (mis. row legacy yg belum di-backfill).
  if (!data.tipe) {
    throw new Error(
      'Surat tugas ini belum punya tipe. Buka tabel persetujuan, atur ' +
      'kembali tipe, lalu approve ulang.'
    );
  }

  const buf = await loadTemplateBuffer(data.tipe);
  const zip = new PizZipCtor(buf);
  const doc = new DocxtemplaterCtor(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' },
  });

  const templateData = await buildTemplateData(data, opts);
  try {
    doc.render(templateData);
  } catch (err) {
    // Docxtemplater error biasanya informatif — munculkan ke console
    console.error('Template render error:', err, err.properties);
    throw new Error(`Template error: ${err.message}`);
  }

  // Tugas #6: post-processing untuk hapus blank page yg muncul setelah
  // {#menginap}...{/menginap} (atau loop lain) — wrapped try/catch supaya
  // error apapun di sini TIDAK menggagalkan generate doc.
  try {
    dropTrailingEmptyParagraphs(doc);
  } catch (e) {
    console.warn('[APA] dropTrailingEmptyParagraphs error (non-fatal):', e);
  }

  const out = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });
  return out;
}

