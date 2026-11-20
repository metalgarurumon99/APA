// ═══════════════════════════════════════════════════════════════════════════════
// st-excel.js — Export & Import Excel Surat Tugas (SheetJS)
// Modul hasil refactor P3 dari admin-surat-tugas.js (APA - BPS Kab. Raja Ampat)
// ═══════════════════════════════════════════════════════════════════════════════

/* ════════════════════════════════════════════════════════════════════
   #5: EXPORT & IMPORT EXCEL
   ─────────────────────────────────────────────────────────────────────
   Format: XLSX (Excel native) via SheetJS.
   Export: semua kolom utama (lengkap) dari semua surat user.
   Import: parse → match pegawai by NAMA exact → INSERT ke DB sebagai
           surat 'menunggu' (admin lalu approve via tabel).
   ════════════════════════════════════════════════════════════════════ */

// Definisi header kolom Excel — urutan, label, dan field DB-nya.
// Single source of truth untuk export DAN import (consistency).
const EXCEL_COLUMNS = [
  // Field input-able (boleh diisi user di Excel, akan di-import balik)
  { header: 'Nomor Surat',           field: 'nomor_surat',            importable: true },
  { header: 'Tanggal Surat',         field: 'tanggal_surat',          importable: true,  isDate: true },
  { header: 'Tanggal Berangkat',     field: 'tanggal_berangkat',      importable: true,  isDate: true },
  { header: 'Tanggal Kembali',       field: 'tanggal_kembali',        importable: true,  isDate: true },
  { header: 'Waktu Pelaksanaan Custom', field: 'waktu_pelaksanaan_text', importable: true },
  { header: 'Perihal',               field: 'perihal',                importable: true },
  { header: 'Tempat Tujuan',         field: 'tujuan',                 importable: true },
  { header: 'Pegawai',               field: 'pegawai_list',           importable: true,  isList: true },
  { header: 'Bertugas Sebagai',      field: 'bertugas_sebagai',       importable: true,  isList: true },
  { header: 'Menimbang',             field: 'menimbang_custom',       importable: true },
  { header: 'Alat Angkutan',         field: 'alat_angkutan',          importable: true },
  { header: 'POK (Pembebanan)',      field: 'pembebanan',             importable: true },
  { header: 'Penandatangan',         field: 'penandatangan_nama',     importable: true,
    importMatchField: 'penandatangan_nip' /* match by nama, dapat NIP */ },
  { header: 'Tipe Surat',            field: 'tipe',                   importable: true },
  { header: 'Tempat Terbit',         field: 'tempat_terbit',          importable: true },
  // Field NON-input-able (read-only — hanya tampil di export, di-skip saat import)
  { header: 'Status',                field: 'status',                 importable: false },
  { header: 'Diajukan Oleh',         field: '_pengaju_nama',          importable: false },
  { header: 'Dibuat',                field: 'created_at',             importable: false, isDate: true },
];

/**
 * EXPORT: Generate XLSX file dari semua surat (allSurat) yang sedang tampil
 * di tabel admin (sudah di-filter & di-sort). Download via saveAs.
 */
async function exportSuratToExcel() {
  if (!Array.isArray(allSurat) || !allSurat.length) {
    showPageAlert('Belum ada data surat untuk di-export.', 'error');
    return;
  }
  try {
    showPageAlert('⏳ Memuat library Excel...', 'info');
    await ensureSheetJSLoaded();

    // Build data array — header row + data rows.
    // SheetJS aoa_to_sheet expects 2D array.
    const headers = EXCEL_COLUMNS.map(c => c.header);
    const rows = allSurat.map(s => EXCEL_COLUMNS.map(c => extractFieldForExport(s, c)));
    const aoa = [headers, ...rows];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Auto-width per kolom — hitung max length tiap kolom (sederhana).
    ws['!cols'] = headers.map((h, ci) => {
      let maxLen = h.length;
      for (let r = 1; r < aoa.length; r++) {
        const cell = aoa[r][ci];
        const len = cell != null ? String(cell).length : 0;
        if (len > maxLen) maxLen = len;
      }
      // Cap width supaya tidak terlalu lebar (mis. kolom Pegawai bisa panjang)
      return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
    });

    // Freeze header row supaya saat scroll, header tetap visible
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: headers.length - 1, r: aoa.length - 1 }
    })};

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Surat Tugas');

    // Filename pakai timestamp supaya unik
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    const filename = `Surat-Tugas_Export_${ts}.xlsx`;

    XLSX.writeFile(wb, filename);
    showPageAlert(`✅ Berhasil export ${allSurat.length} surat ke ${filename}.`, 'success');
  } catch (e) {
    console.error('[APA] export gagal:', e);
    showPageAlert(`Gagal export: ${e.message}`, 'error');
  }
}

/* Helper: ekstrak nilai dari surat object untuk kolom Excel tertentu.
   Mengembalikan string/number yang siap masuk cell Excel. */
function extractFieldForExport(s, col) {
  if (col.field === '_pengaju_nama') {
    return getPengajuNama(s) || '';
  }
  let v = s[col.field];
  if (v == null) return '';
  if (col.isList && Array.isArray(v)) {
    // pegawai_list, bertugas_sebagai → joined dengan ", "
    return v.filter(x => x != null && x !== '').join(', ');
  }
  if (col.isDate && typeof v === 'string') {
    // ISO format → biarkan seperti itu (Excel akan deteksi sebagai date)
    return v;
  }
  if (col.isNumber) {
    const n = parseInt(v, 10);
    return isFinite(n) ? n : '';
  }
  return String(v);
}

let suratImportState = {
  fileName: '',
  rows: [],
  payloads: [],
  warnings: [],
};

const SURAT_IMPORT_ALIASES = {
  nomor_surat: ['nomor surat', 'nomor surat tugas'],
  tanggal_surat: ['tanggal surat', 'tanggal surat tugas'],
  tanggal_berangkat: ['tanggal berangkat'],
  tanggal_kembali: ['tanggal kembali'],
  waktu_pelaksanaan_text: ['waktu pelaksanaan', 'waktu pelaksanaan custom', 'waktu'],
  perihal: ['perihal', 'tujuan/tugas', 'tujuan / tugas', 'tujuan tugas', 'tugas'],
  tujuan: ['tempat tujuan', 'tujuan'],
  pegawai_list: ['pegawai', 'nama'],
  bertugas_sebagai: ['bertugas sebagai'],
  menimbang_custom: ['menimbang'],
  alat_angkutan: ['alat angkutan'],
  pembebanan: ['pok', 'pok (pembebanan)', 'mak pembebanan', 'pembebanan'],
  _program: ['program'],
  penandatangan_nama: ['penandatangan'],
  tipe: ['tipe', 'tipe surat'],
  jumlah_responden: ['jumlah responden'],
  tempat_terbit: ['tempat terbit'],
};

function normalizeImportHeader(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .trim();
}

function buildSuratImportHeaderMap(headerRow) {
  const aliasMap = {};
  Object.entries(SURAT_IMPORT_ALIASES).forEach(([field, aliases]) => {
    aliases.forEach(alias => { aliasMap[normalizeImportHeader(alias)] = field; });
  });
  EXCEL_COLUMNS.forEach(col => {
    if (col.importable) aliasMap[normalizeImportHeader(col.header)] = col.field;
  });

  const colIdxMap = {};
  headerRow.forEach((header, index) => {
    const field = aliasMap[normalizeImportHeader(header)];
    if (field && colIdxMap[field] === undefined) colIdxMap[field] = index;
  });
  return colIdxMap;
}

function findSuratImportHeaderRow(aoa) {
  const maxRows = Math.min(10, aoa.length);
  for (let i = 0; i < maxRows; i++) {
    const map = buildSuratImportHeaderMap(aoa[i] || []);
    if (map.perihal !== undefined || map.nomor_surat !== undefined || map.pegawai_list !== undefined) {
      return i;
    }
  }
  return -1;
}

function normalizeImportPersonName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(s\.?\s*tr\.?\s*stat\.?|a\.?\s*md\.?\s*stat\.?|m\.?\s*ec\.?\s*dev\.?|s\.?\s*e\.?|s\.?\s*s\.?\s*t\.?|sst)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makePegawaiNameMatcher(includeMitra = false) {
  const entries = [];
  const byKey = {};

  const addPerson = (p, nama, nip) => {
    nama = String(nama || '').trim();
    nip = String(nip || '').trim();
    if (!nama || !nip) return;
    const keys = [
      nama.toLowerCase(),
      normalizeImportPersonName(nama),
    ].filter(Boolean);
    keys.forEach(key => { if (!byKey[key]) byKey[key] = p; });
    entries.push({ key: normalizeImportPersonName(nama), pegawai: p });
  };

  pegawaiList.forEach(p => {
    addPerson(p, pegawaiNama(p), pegawaiNip(p));
  });

  if (includeMitra) {
    mitraList.forEach(m => {
      const nip = formatMitraNip(m.tahun, m.id);
      addPerson({ ...m, nama: m.nama, pegawai_nip: nip, _isMitra: true }, m.nama, nip);
    });
  }

  entries.sort((a, b) => b.key.length - a.key.length);
  return { byKey, entries };
}

function matchImportPeople(raw, matcher) {
  const text = String(raw || '').trim();
  if (!text) return { people: [], unmatched: [] };
  const exact = matcher.byKey[text.toLowerCase()] || matcher.byKey[normalizeImportPersonName(text)];
  if (exact) return { people: [exact], unmatched: [] };

  // Split per bagian terlebih dahulu agar nama tak dikenal tidak diam-diam dibuang
  const parts = text.split(/[;\n]+|,(?=\s*[A-Z])/).map(s => s.trim()).filter(Boolean);
  const found = [];
  const seen = new Set();
  const unmatched = [];

  parts.forEach(part => {
    const pExact = matcher.byKey[part.toLowerCase()] || matcher.byKey[normalizeImportPersonName(part)];
    if (pExact) {
      const nip = String(pegawaiNip(pExact) || '');
      if (nip && !seen.has(nip)) { seen.add(nip); found.push(pExact); }
      return;
    }
    // Fallback word-boundary match pada bagian ini (mencegah "Sari" cocok dengan "Sariyanto")
    const normPart = normalizeImportPersonName(part);
    let matchedInPart = false;
    matcher.entries.forEach(entry => {
      if (!entry.key || entry.key.length < 4) return;
      const escapedKey = entry.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?:^|\\s)${escapedKey}(?:\\s|$)`);
      if (re.test(normPart)) {
        const nip = String(pegawaiNip(entry.pegawai) || '');
        if (nip && !seen.has(nip)) { seen.add(nip); found.push(entry.pegawai); }
        matchedInPart = true;
      }
    });
    if (!matchedInPart) unmatched.push(part);
  });

  return { people: found, unmatched };
}

function combineProgramMak(program, mak) {
  const cleanProgram = String(program || '').trim().replace(/\.$/, '');
  const cleanMak = String(mak || '').trim().replace(/^\./, '');
  if (!cleanProgram) return cleanMak || '';
  if (!cleanMak) return cleanProgram || '';
  if (cleanMak.toLowerCase().startsWith(`${cleanProgram.toLowerCase()}.`)) return cleanMak;
  return `${cleanProgram}.${cleanMak}`.replace(/\.+/g, '.');
}

function makeIsoDate(year, month, day) {
  year = Number(year); month = Number(month); day = Number(day);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractDatesFromIndonesianText(raw) {
  const text = String(raw || '').toLowerCase();
  const dates = new Set();
  const addDate = (day, monthName, year) => {
    const month = BULAN_KEYS[String(monthName || '').toLowerCase()];
    const iso = makeIsoDate(year, month, day);
    if (iso) dates.add(iso);
  };

  const rangeRe = /(\d{1,2})(?:\s+([a-z]+))?(?:\s+(\d{4}))?\s*(?:s\.?\s*d\.?|sd|s\/d|sampai|-)\s*(\d{1,2})\s+([a-z]+)\s+(\d{4})/gi;
  let match;
  while ((match = rangeRe.exec(text))) {
    const endMonth = match[5];
    const endYear = match[6];
    addDate(match[1], match[2] || endMonth, match[3] || endYear);
    addDate(match[4], endMonth, endYear);
  }

  const fullDateRe = /(\d{1,2})\s+([a-z]+)\s+(\d{4})/gi;
  while ((match = fullDateRe.exec(text))) {
    addDate(match[1], match[2], match[3]);
  }

  const isoRe = /(\d{4})-(\d{1,2})-(\d{1,2})/g;
  while ((match = isoRe.exec(text))) {
    const iso = makeIsoDate(match[1], match[2], match[3]);
    if (iso) dates.add(iso);
  }

  const single = normalizeImportDate(raw);
  if (single) dates.add(single);
  return Array.from(dates).sort();
}

function parseImportWaktu(raw) {
  const dates = extractDatesFromIndonesianText(raw);
  if (!dates.length) return { mulai: '', selesai: '' };
  return {
    mulai: dates[0],
    selesai: dates[dates.length - 1],
  };
}

function renderSuratImportPreview() {
  const rows = suratImportState.rows || [];
  const payloads = suratImportState.payloads || [];
  const warnings = suratImportState.warnings || [];
  const body = document.getElementById('surat-import-preview-body');
  const submit = document.getElementById('btn-surat-import-submit');
  document.getElementById('surat-import-total').textContent = rows.length;
  document.getElementById('surat-import-ready').textContent = payloads.length;
  document.getElementById('surat-import-warn').textContent = warnings.length;
  document.getElementById('surat-import-file').textContent = suratImportState.fileName || '-';

  body.innerHTML = rows.map(row => {
    const hasWarn = row.warnings.length > 0;
    return `<tr>
      <td><span class="import-status-pill ${hasWarn ? 'warn' : 'ready'}">${hasWarn ? 'Cek' : 'Siap'}</span></td>
      <td>${esc(row.rowNum)}</td>
      <td>${esc(row.payload.nomor_surat || '-')}</td>
      <td>${esc(row.payload.tanggal_surat ? fmtTgl(row.payload.tanggal_surat) : '-')}</td>
      <td>${esc(row.waktuLabel || '-')}</td>
      <td>${esc(row.payload.perihal || '-')}</td>
      <td>${row.payload.pegawai_list.length ? esc(row.payload.pegawai_list.join(', ')) : '<span class="import-muted">Belum match</span>'}</td>
      <td>${esc(row.payload.pembebanan || '-')}</td>
      <td>${esc(row.payload.penandatangan_nama || '-')}</td>
      <td>${row.warnings.length ? `<ul class="import-warning-list">${row.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '<span class="import-muted">-</span>'}</td>
    </tr>`;
  }).join('');

  if (submit) submit.disabled = payloads.length === 0;
}

function closeSuratImportModal() {
  suratImportState = { fileName: '', rows: [], payloads: [], warnings: [] };
  const modal = document.getElementById('modal-import-surat');
  if (modal) modal.style.display = 'none';
}

async function importSuratFromExcel(inputEl) {
  const file = inputEl.files && inputEl.files[0];
  inputEl.value = '';
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showPageAlert('Ukuran file Excel melebihi batas maksimal 5 MB.', 'error');
    return;
  }

  try {
    showPageAlert('Memuat library Excel...', 'info');
    await ensureSheetJSLoaded();

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: false });
    if (!wb.SheetNames.length) throw new Error('File Excel tidak berisi sheet apapun.');

    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    if (aoa.length < 2) throw new Error('File Excel kosong atau hanya berisi header.');

    const headerRowIndex = findSuratImportHeaderRow(aoa);
    if (headerRowIndex < 0) throw new Error('Header import tidak ditemukan. Pastikan ada kolom Nomor Surat, Tujuan / Tugas, atau Nama.');

    const colIdxMap = buildSuratImportHeaderMap(aoa[headerRowIndex] || []);
    if (colIdxMap.perihal === undefined) {
      throw new Error('Kolom Perihal atau Tujuan / Tugas tidak ditemukan.');
    }

    const participantMatcher = makePegawaiNameMatcher(true);
    const signerMatcher = makePegawaiNameMatcher(false);
    const rows = [];
    const payloads = [];
    const warnings = [];
    const importBaseTime = Date.now();

    aoa.slice(headerRowIndex + 1).forEach((row, idx) => {
      const rowNum = headerRowIndex + idx + 2;
      const cell = (field) => {
        const ci = colIdxMap[field];
        if (ci === undefined) return '';
        const value = row[ci];
        return value == null ? '' : String(value).trim();
      };

      const nomor = cell('nomor_surat');
      const perihal = cell('perihal');
      const tujuan = cell('tujuan');
      const pegawaiRaw = cell('pegawai_list');
      if (!nomor && !perihal && !tujuan && !pegawaiRaw) return;

      const rowWarnings = [];
      const peopleMatch = matchImportPeople(pegawaiRaw, participantMatcher);
      if (pegawaiRaw && peopleMatch.unmatched.length) rowWarnings.push(`Pegawai belum match: ${peopleMatch.unmatched.join(', ')}`);

      const ttdRaw = cell('penandatangan_nama');
      const ttdMatch = matchImportPeople(ttdRaw, signerMatcher);
      const ttd = ttdMatch.people[0] || null;
      if (ttdRaw && !ttd) rowWarnings.push(`Penandatangan belum match: ${ttdRaw}`);

      const waktuRaw = cell('waktu_pelaksanaan_text');
      const waktuParsed = parseImportWaktu(waktuRaw);
      const tanggalBerangkat = normalizeImportDate(cell('tanggal_berangkat')) || waktuParsed.mulai || null;
      const tanggalKembali = normalizeImportDate(cell('tanggal_kembali')) || waktuParsed.selesai || tanggalBerangkat || null;
      const tanggalSurat = normalizeImportDate(cell('tanggal_surat')) || null;
      if (!tanggalSurat) rowWarnings.push('Tanggal surat belum terbaca');
      if (waktuRaw && !tanggalBerangkat) rowWarnings.push('Waktu pelaksanaan belum terbaca sebagai tanggal');

      const bertugasRaw = cell('bertugas_sebagai');
      const bertugasArr = bertugasRaw ? bertugasRaw.split(',').map(s => s.trim()) : null;
      const matchedNames = peopleMatch.people.map(p => pegawaiNama(p));
      const matchedNips = peopleMatch.people.map(p => String(pegawaiNip(p)));
      const importIndex = payloads.length;
      const payload = {
        user_id: SESSION.id,
        status: 'menunggu',
        nomor_surat: nomor || null,
        tanggal_surat: tanggalSurat,
        tanggal_berangkat: tanggalBerangkat,
        tanggal_kembali: tanggalKembali,
        waktu_pelaksanaan_text: waktuRaw || null,
        perihal: perihal,
        tujuan: tujuan || null,
        pegawai_nip: matchedNips,
        pegawai_list: matchedNames,
        menimbang_custom: cell('menimbang_custom') || null,
        alat_angkutan: cell('alat_angkutan') || null,
        pembebanan: combineProgramMak(cell('_program'), cell('pembebanan')) || null,
        penandatangan_nip: ttd ? String(pegawaiNip(ttd)) : null,
        penandatangan_nama: ttd ? pegawaiNama(ttd) : null,
        tempat_terbit: cell('tempat_terbit') || 'Waisai',
        tipe: cell('tipe') || null,
        bertugas_sebagai: (bertugasArr && matchedNames.length >= 2 && bertugasArr.some(Boolean)) ? bertugasArr : null,
        created_at: new Date(importBaseTime + importIndex).toISOString(),
      };

      payloads.push(payload);
      warnings.push(...rowWarnings.map(w => `Baris ${rowNum}: ${w}`));
      rows.push({
        rowNum,
        payload,
        warnings: rowWarnings,
        waktuLabel: tanggalBerangkat ? fmtWaktu(tanggalBerangkat, tanggalKembali) : waktuRaw,
      });
    });

    if (!payloads.length) throw new Error('Tidak ada baris data valid yang bisa di-import.');

    suratImportState = { fileName: file.name, rows, payloads, warnings };
    renderSuratImportPreview();
    openModal('modal-import-surat');
    showPageAlert(`Preview import siap: ${payloads.length} baris dibaca.`, 'success');
  } catch (e) {
    console.error('[APA] preview import gagal:', e);
    showPageAlert(`Gagal membaca import: ${e.message}`, 'error');
  }
}

async function submitSuratImport() {
  const payloads = suratImportState.payloads || [];
  if (!payloads.length) {
    showPageAlert('Tidak ada data import yang siap diterapkan.', 'error');
    return;
  }
  const btn = document.getElementById('btn-surat-import-submit');
  const oldText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';
  }
  try {
    // Batching per 50 baris untuk mencegah HTTP 413 pada file Excel besar
    const BATCH_SIZE = 50;
    for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
      const chunk = payloads.slice(i, i + BATCH_SIZE);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/surat_tugas`, {
        method: 'POST',
        headers: { ...H, 'Prefer': 'return=minimal' },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); msg = j.message || msg; } catch(_) {}
        throw new Error(msg);
      }
    }
    const count = payloads.length;
    closeSuratImportModal();
    showPageAlert(`Berhasil import ${count} surat tugas dengan status menunggu.`, 'success');
    await loadSurat({ resetPage: true });
  } catch (e) {
    console.error('[APA] import gagal:', e);
    showPageAlert(`Gagal import: ${e.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = oldText || 'Terapkan Import';
    }
  }
}

/**
 * IMPORT: Read file Excel, parse, match pegawai by NAMA, INSERT ke DB

/* Helper: normalisasi tanggal dari Excel ke ISO format (YYYY-MM-DD).
   Excel sering kirim format yang inkonsisten (date object, string lokal,
   dst). Kita coba beberapa parser & fallback ke parseFlexDate (existing
   helper di file ini yang juga handle "2/1/26", "2 jan 2026", dst). */
function normalizeImportDate(s) {
  if (!s) return '';
  s = String(s).trim();
  if (!s) return '';
  // Sudah ISO format (yyyy-mm-dd)?
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // Excel serial number (kadang sheet_to_json raw:false tetap return number)
  // — di-skip karena raw:false biasanya sudah ke-format. Pakai parseFlexDate.
  if (typeof parseFlexDate === 'function') {
    const iso = parseFlexDate(s);
    if (iso) return iso;
  }
  return '';
}

