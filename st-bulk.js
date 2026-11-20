// ═══════════════════════════════════════════════════════════════════════════════
// st-bulk.js — Bulk Download, Bulk Approve & Open in Microsoft Word
// Modul hasil refactor P3 dari admin-surat-tugas.js (APA - BPS Kab. Raja Ampat)
// ═══════════════════════════════════════════════════════════════════════════════

/* ════════════════════════════════════════════════════════════════════
   BULK DOWNLOAD (Tugas #7) — admin pilih banyak surat selesai
                              dan download semua sekaligus
   ─────────────────────────────────────────────────────────────────────
   Approach: sequential download dengan jeda kecil antar file. Browser
   bisa memunculkan dialog "Site is requesting to download multiple
   files" — admin tinggal Allow.

   Flow:
     1. Master checkbox di header → toggle semua .bulk-dl-check
        (yang TIDAK disabled — yaitu hanya status='selesai').
     2. Setiap perubahan checkbox → updateBulkDownloadCounter()
        update label tombol dengan count selected.
     3. Klik "Download Terpilih" → bulkDownloadSelected() loop
        sequentially: generate doc + saveAs + jeda 400ms.
═══════════════════════════════════════════════════════════════════════ */

/**
 * Update label & disabled state tombol bulk download berdasarkan
 * jumlah checkbox yang dicentang. Juga sinkron master checkbox state.
 */
function updateBulkDownloadCounter() {
  const all      = document.querySelectorAll('.bulk-dl-check');
  const checked  = document.querySelectorAll('.bulk-dl-check:checked');
  const btn      = document.getElementById('btn-bulk-download');
  const master   = document.getElementById('bulk-dl-master');
  const badge    = document.getElementById('bulk-dl-badge');

  if (btn) {
    if (checked.length === 0) {
      btn.disabled    = true;
      btn.title       = 'Pilih dulu surat selesai yang ingin di-download (.docx)';
      if (badge) { badge.style.display = 'none'; badge.textContent = '0'; }
    } else {
      btn.disabled    = false;
      btn.title       = `Download ${checked.length} dokumen terpilih (.docx)`;
      if (badge) { badge.style.display = 'inline-flex'; badge.textContent = checked.length; }
    }
  }

  // Master checkbox state: checked kalau semua di-check, indeterminate
  // kalau sebagian, unchecked kalau tidak ada.
  if (master) {
    if (all.length === 0 || checked.length === 0) {
      master.checked       = false;
      master.indeterminate = false;
    } else if (checked.length === all.length) {
      master.checked       = true;
      master.indeterminate = false;
    } else {
      master.checked       = false;
      master.indeterminate = true;
    }
  }
}

/** Toggle semua checkbox baris selesai mengikuti state master checkbox. */
function toggleBulkDownloadAll(checked) {
  document.querySelectorAll('.bulk-dl-check').forEach(c => { c.checked = !!checked; });
  updateBulkDownloadCounter();
}

/* ════════════════════════════════════════════════════════════════════
   DRAFT SAVED TOAST
   Toast ringan yang muncul sebentar (1.5 detik) saat draft otomatis
   tersimpan ke localStorage. Memberi konfirmasi visual ke admin.
════════════════════════════════════════════════════════════════════ */
let _draftToastTimer = null;
function showDraftSavedToast() {
  // Sesuai permintaan UI: toast draft tersimpan disembunyikan
  return;
}

/* ════════════════════════════════════════════════════════════════════
   BULK APPROVE — setujui banyak surat menunggu sekaligus
   ─────────────────────────────────────────────────────────────────────
   Flow:
     1. Admin centang checkbox di baris 'menunggu' (class bulk-approve-check)
     2. Tombol "Setujui Terpilih (N)" aktif
     3. openBulkApprove() — validasi semua, tampilkan modal konfirmasi
     4. Admin klik "Setujui Semua" → submitBulkApprove() proses sequential
     5. Setiap surat diapprove dengan nilai dari baris tabel (tanpa bertugas_sebagai
        dan jumlah_responden — bisa diedit setelah via Edit Role / approve individual)
════════════════════════════════════════════════════════════════════ */

/** Update label & state tombol bulk approve berdasarkan checkbox yang dipilih. */
function updateBulkApproveCounter() {
  const all     = document.querySelectorAll('.bulk-approve-check');
  const checked = document.querySelectorAll('.bulk-approve-check:checked');
  const btn     = document.getElementById('btn-bulk-approve');
  const master  = document.getElementById('bulk-ap-master');
  const badge   = document.getElementById('bulk-ap-badge');

  if (btn) {
    if (checked.length === 0) {
      btn.disabled    = true;
      btn.title       = 'Pilih dulu surat menunggu yang ingin diselesaikan';
      if (badge) { badge.style.display = 'none'; badge.textContent = '0'; }
    } else {
      btn.disabled    = false;
      btn.title       = `Selesai ${checked.length} surat terpilih`;
      if (badge) { badge.style.display = 'inline-flex'; badge.textContent = checked.length; }
    }
  }

  if (master) {
    if (all.length === 0 || checked.length === 0) {
      master.checked = false; master.indeterminate = false;
    } else if (checked.length === all.length) {
      master.checked = true;  master.indeterminate = false;
    } else {
      master.checked = false; master.indeterminate = true;
    }
  }
}

/** Toggle semua checkbox baris menunggu. */
function toggleBulkApproveAll(checked) {
  document.querySelectorAll('.bulk-approve-check').forEach(c => { c.checked = !!checked; });
  updateBulkApproveCounter();
}

/** Buka modal konfirmasi bulk approve — validasi semua surat terpilih terlebih dahulu. */
function openBulkApprove() {
  const checkeds = Array.from(document.querySelectorAll('.bulk-approve-check:checked'));
  const ids = checkeds.map(c => parseInt(c.dataset.suratId, 10)).filter(Number.isFinite);
  if (!ids.length) {
    showPageAlert('Pilih minimal 1 surat menunggu untuk diselesaikan.', 'error');
    return;
  }

  // Validasi semua — kumpulkan yang valid dan yang tidak
  const valid    = [];
  const invalid  = [];
  ids.forEach(id => {
    const values = collectRowFields(id);
    if (!values) { invalid.push({ id, reason: 'Data tidak ditemukan' }); return; }
    const { errors } = validateApproveFields(values);
    if (errors.length) {
      invalid.push({ id, reason: errors.join(', '), values });
    } else {
      valid.push({ id, values });
    }
  });

  // Render list di modal
  const listEl = document.getElementById('bulk-approve-list');
  if (listEl) {
    listEl.innerHTML = valid.map(({ id, values }) => {
      const s = suratMap[id];
      const nomorFull = buildNomorSuratFull(values.nomor_surat, values.tanggal_surat);
      const tipeLbl   = tipeLabel(values.tipe);
      const hasVisum  = tipeHasVisum(values.tipe);
      const hasLamp   = tipeHasLampiran(values.tipe) && values.pegawai_list.length >= 2;
      const warnings  = [];
      if (hasVisum) warnings.push('visum — isi Jumlah Responden setelah approve via individual');
      if (hasLamp)  warnings.push('lampiran — isi Bertugas Sebagai via Edit Role setelah approve');
      return `
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 14px;display:flex;align-items:flex-start;gap:10px">
          <span style="font-size:14px;margin-top:1px">✅</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:600;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(nomorFull)}</div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:2px">${esc(values.perihal || '—')} · ${esc(tipeLbl)}</div>
            ${warnings.length ? `<div style="font-size:10.5px;color:#92400e;margin-top:3px;background:#fef3c7;padding:2px 7px;border-radius:5px;display:inline-block">⚠ ${esc(warnings.join(' · '))}</div>` : ''}
          </div>
        </div>`;
    }).join('') + (invalid.length ? `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;margin-top:6px">
        <div style="font-size:12px;font-weight:600;color:#991b1b;margin-bottom:6px">⚠ ${invalid.length} surat dilewati (tidak valid):</div>
        ${invalid.map(({ id, reason, values }) => {
          const v = values || {};
          return `<div style="font-size:11.5px;color:#991b1b;margin-bottom:3px">• ${esc(v.perihal || 'ID #' + id)}: ${esc(reason)}</div>`;
        }).join('')}
      </div>` : '');
  }

  document.getElementById('bulk-approve-count').textContent = valid.length;
  document.getElementById('bulk-approve-progress').style.display = 'none';

  const submitBtn = document.getElementById('btn-bulk-approve-submit');
  if (submitBtn) submitBtn.disabled = valid.length === 0;

  // Simpan IDs valid ke attribute modal supaya bisa diakses submitBulkApprove
  document.getElementById('modal-bulk-approve').dataset.validIds = JSON.stringify(valid.map(v => v.id));

  openModal('modal-bulk-approve');
}

/** Proses bulk approve — sequential, update progress bar. */
async function submitBulkApprove() {
  const modal = document.getElementById('modal-bulk-approve');
  let ids;
  try {
    ids = JSON.parse(modal.dataset.validIds || '[]');
  } catch(_) { ids = []; }
  if (!ids.length) return;

  const submitBtn = document.getElementById('btn-bulk-approve-submit');
  const cancelBtn = document.getElementById('btn-bulk-approve-cancel');
  const progressEl = document.getElementById('bulk-approve-progress');
  const progressText = document.getElementById('bulk-approve-progress-text');
  const progressBar  = document.getElementById('bulk-approve-bar');

  if (submitBtn) { submitBtn.disabled = true; }
  if (cancelBtn) { cancelBtn.disabled = true; }
  if (progressEl) progressEl.style.display = '';

  let success = 0;
  let completed = 0;
  let defaultsSaved = false;
  const failures = [];
  const CONCURRENCY = 4;

  // Siapkan pekerjaan dari DOM sebelum worker berjalan paralel
  const tasks = ids.map(id => ({ id, values: collectRowFields(id) }));
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const { id, values } = tasks[cursor++];
      if (!values) {
        failures.push(`#${id}: data tidak ditemukan`);
        completed++;
        continue;
      }

      const jabatan = lookupJabatan(values.penandatangan_nip, values.tanggal_surat);
      const waktuText = values.waktu_pelaksanaan_text && values.waktu_pelaksanaan_text.trim()
        ? values.waktu_pelaksanaan_text : null;

      const payload = {
        status:                'selesai',
        nomor_surat:           values.nomor_surat,
        tanggal_surat:         values.tanggal_surat,
        tanggal_berangkat:     values.tanggal_berangkat,
        tanggal_kembali:       values.tanggal_kembali || null,
        waktu_pelaksanaan_text: waktuText,
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
        bertugas_sebagai:      values.bertugas_sebagai || null,
      };

      try {
        await patchSuratTugas(id, payload);
        clearAdminDraft(id);
        replaceRowInPlace(id, payload);
        if (!defaultsSaved) {
          defaultsSaved = true;
          const nd = {};
          if (values.alat_angkutan)     nd.alat_angkutan = values.alat_angkutan;
          if (values.pembebanan)        nd.pembebanan    = values.pembebanan;
          if (values.penandatangan_nip) nd.ttd_nip       = values.penandatangan_nip;
          if (values.penandatangan_nama)nd.ttd_nama      = values.penandatangan_nama;
          saveApproveDefaults({ ...loadApproveDefaults(), ...nd });
        }
        success++;
      } catch(e) {
        const s = suratMap[id];
        failures.push(`${(s && s.perihal) || '#' + id}: ${e.message}`);
      } finally {
        completed++;
        const pct = Math.round((completed / ids.length) * 100);
        if (progressBar)  progressBar.style.width  = pct + '%';
        if (progressText) progressText.textContent = `Memproses ${completed} / ${ids.length}…`;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker()));

  // Selesai — pastikan tombol Batal & Submit kembali aktif
  if (cancelBtn) cancelBtn.disabled = false;
  if (submitBtn) submitBtn.disabled = false;
  if (progressBar)  progressBar.style.width  = '100%';
  if (progressText) progressText.textContent = `Selesai: ${success} berhasil${failures.length ? `, ${failures.length} gagal` : ''}.`;

  closeModal('modal-bulk-approve');
  if (failures.length === 0) {
    showPageAlert(`✅ ${success} surat berhasil diselesaikan.`, 'success');
  } else {
    showPageAlert(`⚠️ ${success} berhasil, ${failures.length} gagal: ${failures.slice(0,2).join('; ')}${failures.length > 2 ? '…' : ''}`, 'error');
    console.warn('[APA Bulk Approve] failures:', failures);
  }

  // Unceklis semua approve checkbox & refresh saran MAK (tanpa full refetch!)
  document.querySelectorAll('.bulk-approve-check').forEach(c => { c.checked = false; });
  loadMAKSuggestions();
  updateBulkApproveCounter();
}

/**
 * Loop checked surat dan trigger download .docx satu per satu.
 * Dipanggil dari onclick tombol "Download Terpilih".
 */
async function bulkDownloadSelected() {
  const checked = Array.from(document.querySelectorAll('.bulk-dl-check:checked'));
  const ids = checked.map(c => parseInt(c.dataset.suratId, 10)).filter(Number.isFinite);
  if (!ids.length) {
    showPageAlert('Pilih minimal 1 surat untuk di-download.', 'error');
    return;
  }

  const btn = document.getElementById('btn-bulk-download');
  const badge = document.getElementById('bulk-dl-badge');
  if (btn) { btn.disabled = true; }

  let success = 0;
  const failures = [];

  // Pre-warm library sekali saja — hentikan jika library belum siap
  try {
    ensureLibrariesLoaded();
  } catch (e) {
    showPageAlert(e.message || 'Library dokumen belum siap.', 'error');
    if (btn) btn.disabled = false;
    return;
  }

  for (let i = 0; i < ids.length; i++) {
    const id    = ids[i];
    const surat = suratMap[id];

    // Update progress di badge & title tombol
    if (badge) { badge.style.display = 'inline-flex'; badge.textContent = `${i + 1}/${ids.length}`; }
    if (btn) { btn.title = `Mendownload ${i + 1} dari ${ids.length}…`; }

    if (!surat || surat.status !== 'selesai') {
      failures.push(`#${id}: status bukan 'selesai'`);
      continue;
    }

    try {
      const blob = await buildSuratTugasDoc(surat);
      saveAs(blob, buildFileName(surat));
      success++;
      // Jeda antar download supaya browser tidak block multi-trigger.
      if (i < ids.length - 1) {
        await new Promise(r => setTimeout(r, 400));
      }
    } catch(e) {
      console.error(`[APA] bulk download gagal id=${id}:`, e);
      failures.push(`${surat.perihal || 'surat #' + id}: ${e.message}`);
    }
  }

  // Restore tombol & uncheck semua checkbox setelah selesai
  document.querySelectorAll('.bulk-dl-check:checked').forEach(c => { c.checked = false; });
  updateBulkDownloadCounter();

  // Tampilkan hasil
  if (failures.length === 0) {
    showPageAlert(`✅ ${success} surat berhasil di-download.`, 'success');
  } else if (success === 0) {
    showPageAlert(`Gagal download semua: ${failures.slice(0, 3).join('; ')}${failures.length > 3 ? '…' : ''}`, 'error');
  } else {
    showPageAlert(`⚠️ ${success} berhasil, ${failures.length} gagal. Cek console untuk detail.`, 'error');
  }
}

async function downloadFromPreview() {
  if (!currentPreviewSurat) return;
  try {
    ensureLibrariesLoaded();
    const blob = _previewBlob || await buildSuratTugasDoc(currentPreviewSurat);
    _previewBlob = blob;
    saveAs(blob, buildFileName(currentPreviewSurat));
    showPageAlert(`📥 Berhasil di-download: ${buildFileName(currentPreviewSurat)}`, 'success');
    closeModal('modal-preview');
  } catch(e) {
    console.error(e);
    showPageAlert(`Gagal download: ${e.message}`, 'error');
  }
}

/* ════════════════════════════════════════════════════════════════════
   OPEN IN MICROSOFT WORD (untuk print yang reliable)

   Pendekatan: pakai protocol handler "ms-word:" yang di-handle Microsoft
   Word desktop. Word akan download file dari signed URL Supabase, buka
   di mode Protected View. Admin tinggal Ctrl+P.

   Kenapa pakai ini, bukan window.print() biasa?
   - Office Online iframe = cross-origin, window.print() tidak bisa.
   - Office Online native print sering diblokir Edge tracking prevention
     atau ad-blockers (ERR_BLOCKED_BY_CLIENT).
   - Protocol handler ms-word: = pure native handoff, tidak terkena
     security policy browser.

   Syarat: admin harus punya Microsoft Word desktop terinstall (umumnya
   ya di kantor BPS). Browser akan tampilkan dialog "Open Microsoft Word?"
   sekali — admin klik Allow (atau centang "Always allow" supaya tidak
   muncul lagi).
═══════════════════════════════════════════════════════════════════════ */
async function openInWordForPrint() {
  if (!currentPreviewSurat) {
    showPageAlert('Belum ada surat yang sedang di-preview.', 'error');
    return;
  }

  const btn = document.getElementById('btn-open-in-word');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Menyiapkan…'; }

  try {
    let signedUrl;

    // Re-use file yang sudah di-upload untuk preview kalau masih ada.
    // Kalau tidak ada (mis. user direct call atau preview gagal), upload ulang
    // pakai opts visum yg SAMA dengan yg dipakai di preview saat ini.
    if (_previewUploadedPath) {
      signedUrl = await getPreviewSignedUrl(_previewUploadedPath);
    } else {
      ensureLibrariesLoaded();
      const blob = await buildSuratTugasDoc(currentPreviewSurat);
      const filename = await uploadPreviewDocx(blob, currentPreviewSurat.id);
      _previewUploadedPath = filename;
      signedUrl = await getPreviewSignedUrl(filename);
    }

    // Format protocol handler Word:
    //   ms-word:ofe|u|<URL>      → Open For Editing
    //   ms-word:ofv|u|<URL>      → Open For Viewing (read-only, lebih cocok untuk print)
    // Kami pakai 'ofe' supaya admin bisa langsung edit kecil kalau ada typo
    // sebelum print, tanpa harus klik "Enable Editing".
    const wordProtocolUrl = `ms-word:ofe|u|${signedUrl}`;

    // Trigger protocol handler. Browser akan tampilkan dialog konfirmasi
    // "Open Microsoft Word?" — admin klik Allow.
    window.location.href = wordProtocolUrl;

    // Fallback notice: kalau Word tidak terinstall, dialog tidak akan muncul
    // dan tidak terjadi apa-apa. Kasih hint setelah 2 detik.
    setTimeout(() => {
      showPageAlert(
        'Jika Microsoft Word tidak terbuka, pastikan Word terinstall di komputer Anda. ' +
        'Sebagai alternatif, klik tombol "📥 Download .docx" lalu buka manual.',
        'success'
      );
    }, 2000);

    // Tutup modal preview otomatis setelah 1 detik supaya admin fokus ke Word
    setTimeout(() => closeModal('modal-preview'), 1000);

  } catch (e) {
    console.error('[APA] openInWordForPrint error:', e);
    showPageAlert(`Gagal menyiapkan dokumen untuk Word: ${e.message}`, 'error');
  } finally {
    if (btn) {
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = '📄 Buka di Word & Print';
      }, 1500);
    }
  }
}

