// ═══════════════════════════════════════════════════════════════════════════════
// st-lookups.js — HR Lookups, Format Nomor Surat & Preview Storage
// Modul hasil refactor P3 dari admin-surat-tugas.js (APA - BPS Kab. Raja Ampat)
// ═══════════════════════════════════════════════════════════════════════════════

/* ════════════════════════════════════════════════════════════════════
   LOOKUP JABATAN dari riwayat_jabatan
═══════════════════════════════════════════════════════════════════════ */

/**
 * Normalisasi format tanggal TMT ke string ISO (YYYY-MM-DD).
 * Mendukung format:
 *   - YYYY-MM-DD (ISO standard)
 *   - M/D/YYYY atau D/M/YYYY (format export Excel BPS, mis. "7/1/2026", "6/29/2020")
 */
function normTmtIso(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parts = s.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let [p1, p2, p3] = parts;
    if (p1.length === 4) {
      return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
    }
    let mo = parseInt(p1, 10);
    let d = parseInt(p2, 10);
    let y = parseInt(p3, 10);
    if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;
    if (mo > 12 && d <= 12) {
      const tmp = mo; mo = d; d = tmp;
    }
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y) {
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return s;
}

function lookupJabatan(nip, tglSuratIso) {
  if (!nip) return '';
  // Early exit untuk mitra — mitra tidak punya riwayat_jabatan (selalu "Mitra").
  if (isMitraNip(nip)) return '';

  // 1. Ambil riwayat jabatan utama dari pre-indexed Map (O(1))
  const key = String(nip).trim();
  let candidates = riwayatJabatanByNip.get(key) || [];

  // 2. Fallback pencarian by nama jika by NIP tidak ditemukan
  if (!candidates.length) {
    const peg = pegawaiByNIP[nip];
    const pegNama = pegawaiNama(peg);
    if (peg && pegNama) {
      candidates = riwayatJabatan
        .filter(r => (r.nama || '').trim().toLowerCase() === pegNama.trim().toLowerCase())
        .filter(r => (r.jenis || 'utama') === 'utama')
        .map(r => ({ ...r, _isoTmt: normTmtIso(r.tmt) }))
        .sort((a, b) => (b._isoTmt || '').localeCompare(a._isoTmt || ''));
    }
  }

  if (!candidates.length) return '';

  // 3. Filter yang TMT-nya <= tglSuratIso (berlaku pada tanggal surat)
  if (tglSuratIso) {
    const valid = candidates.filter(r => r._isoTmt && r._isoTmt <= tglSuratIso);
    if (valid.length) return valid[0].jabatan || '';
  }

  // 4. Fallback: jika tanggal surat sebelum TMT paling awal, gunakan record terlama
  return candidates[candidates.length - 1].jabatan || '';
}

/**
 * Lookup jabatan_lainnya (Plt., PPK, dll) by nama jabatan & tanggal surat.
 * Return record terbaru yang TMT-nya <= tanggal_surat.
 */
function lookupJabatanLainnya(jabatanLainnya, tglSuratIso) {
  if (!jabatanLainnya) return null;
  const candidates = riwayatJabatan
    .filter(r => (r.jenis || '') === 'lainnya')
    .filter(r => (r.jabatan || '') === jabatanLainnya)
    .map(r => ({ ...r, _isoTmt: normTmtIso(r.tmt), _isoSelesai: normTmtIso(r.tmt_selesai) }))
    .sort((a, b) => (b._isoTmt || '').localeCompare(a._isoTmt || ''));

  if (!candidates.length) return null;

  if (tglSuratIso) {
    const valid = candidates
      .filter(r => r._isoTmt && r._isoTmt <= tglSuratIso)
      .filter(r => !r._isoSelesai || r._isoSelesai >= tglSuratIso);
    if (valid.length) return valid[0];
  }

  return candidates[0] || null;
}

/**
 * Lookup pangkat & golongan terbaru per pegawai by NIP & tanggal surat.
 * Return record dari riwayat_pangkat_golongan, atau null.
 */
function lookupPangkatGolongan(nip, tglSuratIso) {
  if (!nip || isMitraNip(nip)) return null;
  const candidates = riwayatPangkatByNip.get(String(nip).trim()) || [];

  if (!candidates.length) return null;

  if (tglSuratIso) {
    const valid = candidates.filter(r => r._isoTmt && r._isoTmt <= tglSuratIso);
    if (valid.length) return valid[0];
  }

  return candidates[candidates.length - 1] || null;
}

function lookupGelar(nip, tglSuratIso) {
  if (!nip || isMitraNip(nip)) return '';
  const candidates = riwayatGelarByNip.get(String(nip).trim()) || [];

  if (!candidates.length) return '';

  if (tglSuratIso) {
    const valid = candidates.filter(r => r._isoTmt && r._isoTmt <= tglSuratIso);
    if (valid.length) return valid[0].gelar || '';
  }

  return candidates[candidates.length - 1].gelar || '';
}

/**
 * Transform jabatan_penandatangan sesuai rule bisnis.
 * Input value WAJIB salah satu dari 3 nilai canonical (di-validate di UI/DB):
 *   - "Kepala BPS Kabupaten Raja Ampat"      → tampilkan apa adanya
 *   - "Plt. Kepala Badan Pusat Statistik"    → "Plt. Kepala BPS Kabupaten Raja Ampat"
 *   - lainnya                                 → "Plh. Kepala BPS Kabupaten Raja Ampat"
 *
 * Logic ini di-compute saat render, BUKAN saat approve. Konsekuensinya:
 * kalau di masa depan rule diubah (mis. "Plh." jadi sesuatu yang lain),
 * surat lama yang di-regenerate akan ikut rule baru. Untuk audit trail,
 * teks asli yang user pilih tetap tersimpan di kolom penandatangan_jabatan.
 */
function transformJabatanPenandatangan(jab) {
  const j = String(jab || '').trim();
  if (j === 'Kepala BPS Kabupaten Raja Ampat')      return j;
  if (j === 'Plt. Kepala Badan Pusat Statistik')    return 'Plt. Kepala BPS Kabupaten Raja Ampat';
  return 'Plh. Kepala BPS Kabupaten Raja Ampat';
}

/**
 * Compute {awalan} dari perihal surat tugas.
 * Rule: kalau perihal mengandung kata "pelatihan" (case-insensitive,
 *       partial match) → "Daftar Peserta", lainnya → "Daftar Petugas".
 */
function computeAwalan(perihal) {
  return /pelatihan/i.test(String(perihal || ''))
    ? 'Daftar Peserta'
    : 'Daftar Petugas';
}

/* ════════════════════════════════════════════════════════════════════
   FORMAT NOMOR SURAT LENGKAP
═══════════════════════════════════════════════════════════════════════ */
function buildNomorSuratFull(nomor, tglSuratIso) {
  if (!nomor) return '....................';
  const d = parseISODate(tglSuratIso);
  const mm = d ? String(d.getMonth() + 1).padStart(2, '0') : '..';
  const yyyy = d ? String(d.getFullYear()) : '....';
  return `B-${nomor}/668870-92800/KP-650/${mm}/${yyyy}`;
}


/* ════════════════════════════════════════════════════════════════════
   PREVIEW & DOWNLOAD DOCX
═══════════════════════════════════════════════════════════════════════ */
let currentPreviewSurat = null;

/* ── Office Online Viewer (preview) ──────────────────────────────────
   Bucket Supabase Storage tempat file .docx sementara disimpan.
   File otomatis dijadwalkan hapus 10 menit sejak preview dibuat.
   Orphan files (kalau user crash/close paksa) dibersihkan saat halaman load
   via cleanupOrphanPreviewFiles().
─────────────────────────────────────────────────────────────────── */
const PREVIEW_BUCKET = 'surat-tugas-preview';
const PREVIEW_TTL_MS = 10 * 60 * 1000;
const PREVIEW_SIGNED_URL_TTL_SEC = Math.ceil(PREVIEW_TTL_MS / 1000);
const _previewCleanupTimers = {};
let _previewUploadedPath = null;
let _previewBlob = null;

async function uploadPreviewDocx(blob, suratId) {
  const filename = `${suratId}_${Date.now()}.docx`;
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${PREVIEW_BUCKET}/${filename}`,
    {
      method: 'POST',
      headers: {
        apikey: H.apikey || SUPABASE_ANON_KEY,
        Authorization: H.Authorization,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'x-upsert': 'true',
      },
      body: blob,
    }
  );
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const err = await res.json(); msg = err.message || err.error || msg; } catch(_) {}
    throw new Error(`Upload preview gagal: ${msg}`);
  }
  schedulePreviewCleanup(filename);
  return filename;
}

async function getPreviewSignedUrl(filename, expiresInSec = PREVIEW_SIGNED_URL_TTL_SEC) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/sign/${PREVIEW_BUCKET}/${filename}`,
    {
      method: 'POST',
      headers: { ...H },
      body: JSON.stringify({ expiresIn: expiresInSec }),
    }
  );
  if (!res.ok) throw new Error(`Gagal membuat signed URL (HTTP ${res.status})`);
  const data = await res.json();
  // signedURL format: "/object/sign/{bucket}/{path}?token=..."
  return `${SUPABASE_URL}/storage/v1${data.signedURL}`;
}

function buildPreviewViewerUrl(signedUrl) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;
}

async function deletePreviewFile(filename) {
  if (!filename) return;
  clearPreviewCleanupTimer(filename);
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${PREVIEW_BUCKET}/${filename}`, {
      method: 'DELETE',
      headers: { apikey: H.apikey || SUPABASE_ANON_KEY, Authorization: H.Authorization },
    });
  } catch (e) { console.warn('[APA] Cleanup preview file gagal:', e); }
}

function clearPreviewCleanupTimer(filename) {
  const timer = _previewCleanupTimers[filename];
  if (timer) {
    clearTimeout(timer);
    delete _previewCleanupTimers[filename];
  }
}

function schedulePreviewCleanup(filename, delayMs = PREVIEW_TTL_MS) {
  if (!filename || _previewCleanupTimers[filename]) return;
  const delay = Math.max(0, Number(delayMs) || PREVIEW_TTL_MS);
  _previewCleanupTimers[filename] = setTimeout(() => {
    delete _previewCleanupTimers[filename];
    deletePreviewFile(filename);
  }, delay);
}

/* Defensive cleanup: hapus file preview lama (>10 menit) yang mungkin
   ter-orphan kalau user close paksa. Fire-and-forget, dipanggil di init(). */
async function cleanupOrphanPreviewFiles() {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${PREVIEW_BUCKET}`, {
      method: 'POST',
      headers: { ...H },
      body: JSON.stringify({ limit: 1000, prefix: '' }),
    });
    if (!res.ok) return;
    const files = await res.json();
    const expiredBefore = Date.now() - PREVIEW_TTL_MS;
    files.forEach(f => {
      // Filename pattern: "{suratId}_{timestamp}.docx"
      const m = f.name && f.name.match(/_(\d+)\.docx$/);
      if (f.name && /^pak_/.test(f.name)) return;
      if (m && parseInt(m[1], 10) < expiredBefore) deletePreviewFile(f.name);
    });
  } catch (e) { /* fire-and-forget */ }
}

function ensureLibrariesLoaded() {
  if (typeof saveAs === 'undefined') {
    throw new Error('Library FileSaver gagal dimuat. Refresh halaman.');
  }
}

/* #5: Lazy-load SheetJS untuk export/import Excel.
   SheetJS hanya di-load saat user klik tombol Export/Import — tidak
   membebani initial page load. Pakai pattern Promise + caching. */
let _sheetjsLoadPromise = null;
function ensureSheetJSLoaded() {
  if (typeof window.XLSX !== 'undefined' && window.XLSX.utils) {
    return Promise.resolve();
  }
  if (_sheetjsLoadPromise) return _sheetjsLoadPromise;
  _sheetjsLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    s.integrity = 'sha384-EnyY0/GSHQGSxSgMwaIPzSESbqoOLSexfnSMN2AP+39Ckmn92stwABZynq1JyzdT';
    s.crossOrigin = 'anonymous';
    s.async = true;
    s.onload = () => {
      if (typeof window.XLSX !== 'undefined') resolve();
      else reject(new Error('SheetJS load tidak return XLSX object'));
    };
    s.onerror = () => {
      _sheetjsLoadPromise = null;  // izinkan retry
      reject(new Error('Gagal load library Excel. Periksa koneksi internet.'));
    };
    document.head.appendChild(s);
  });
  return _sheetjsLoadPromise;
}


function buildFileName(surat) {
  const base = (surat.nomor_surat || surat.id).toString().replace(/[^a-zA-Z0-9-_]/g, '-');
  return `Surat-Tugas_${base}.docx`;
}

let _previewReqSeq = 0;
async function openPreview(suratId) {
  const surat = suratMap[suratId];
  if (!surat) return;
  if (surat.status !== 'selesai') {
    showPageAlert('Surat hanya bisa di-preview jika sudah selesai.', 'error');
    return;
  }

  const reqSeq = ++_previewReqSeq;

  currentPreviewSurat = surat;
  _previewBlob = null;

  openModal('modal-preview');

  // Bersihkan file preview sebelumnya kalau user buka ulang dengan cepat
  if (_previewUploadedPath) {
    deletePreviewFile(_previewUploadedPath);
    _previewUploadedPath = null;
  }

  const container = document.getElementById('preview-container');
  container.innerHTML = `<div class="preview-loading">
    <div class="preview-loading-spin"></div>
    <div>Menyiapkan dokumen…</div>
    <div style="font-size:11px;color:var(--muted);margin-top:6px">
      Dokumen yang sama dengan tombol download akan dibuka via Office Online.
    </div>
  </div>`;

  try {
    ensureLibrariesLoaded();
    const blob = await buildSuratTugasDoc(surat);
    if (reqSeq !== _previewReqSeq) return;
    _previewBlob = blob;
    const filename = await uploadPreviewDocx(blob, surat.id);
    if (reqSeq !== _previewReqSeq) {
      deletePreviewFile(filename);
      return;
    }
    _previewUploadedPath = filename;
    const signedUrl = await getPreviewSignedUrl(filename);
    if (reqSeq !== _previewReqSeq) return;
    const viewerUrl = buildPreviewViewerUrl(signedUrl);

    container.innerHTML = `
      <iframe src="${esc(viewerUrl)}"
        style="width:100%;height:80vh;min-height:600px;border:0;display:block;background:#fff"
        title="Preview Surat Tugas"
        allowfullscreen>
      </iframe>`;
  } catch (e) {
    console.error(e);
    container.innerHTML = `<div class="preview-error">
      <div class="preview-error-icon">⚠️</div>
      <div><strong>Gagal memuat preview</strong></div>
      <div style="font-size:12px;margin-top:8px;color:var(--muted)">${esc(e.message)}</div>
    </div>`;
  }
}

async function downloadSuratTugas(suratId) {
  const surat = suratMap[suratId];
  if (!surat) return;
  if (surat.status !== 'selesai') {
    showPageAlert('Surat hanya bisa di-download jika sudah selesai.', 'error'); return;
  }
  try {
    ensureLibrariesLoaded();
    const blob = await buildSuratTugasDoc(surat);
    saveAs(blob, buildFileName(surat));
    showPageAlert(`📥 Berhasil di-download: ${buildFileName(surat)}`, 'success');
  } catch(e) {
    console.error(e);
    showPageAlert(`Gagal download: ${e.message}`, 'error');
  }
}

