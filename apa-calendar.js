/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * APA GLOBAL CALENDAR COMPONENT (Single & Multi-Range Date Picker)
 * Sistem Automasi Pekerjaan Administrasi (APA) - BPS Kabupaten Raja Ampat
 * ═══════════════════════════════════════════════════════════════════════════════
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.apaCalendar = factory();
    // Expose backward-compatible global functions
    root.openCal = root.apaCalendar.open;
    root.closeCal = root.apaCalendar.close;
    root.fmtWaktu = root.apaCalendar.formatWaktu;
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  const BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const HARI_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  // ── Helper Date Functions ────────────────────────────────────
  function pad2(n) { return String(n).padStart(2, '0'); }

  function toISODate(d) {
    if (!d || !(d instanceof Date) || isNaN(d)) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function todayISO() { return toISODate(new Date()); }

  function parseISODate(s) {
    if (!s || typeof s !== 'string') return null;
    const m = s.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    return isNaN(d) ? null : d;
  }

  function fmtTglIndo(iso, withYear = true) {
    const d = parseISODate(iso);
    if (!d) return iso || '';
    const day = d.getDate();
    const bln = BULAN[d.getMonth()];
    const yr = d.getFullYear();
    return withYear ? `${day} ${bln} ${yr}` : `${day} ${bln}`;
  }

  /**
   * Format satu rentang tanggal (mulai & selesai).
   * withYear: boolean (apakah mencantumkan tahun di akhir rentang).
   */
  function formatSingleRange(mulai, selesai, withYear = true) {
    if (!mulai) return '';
    if (!selesai || selesai === mulai) {
      return fmtTglIndo(mulai, withYear);
    }
    const a = parseISODate(mulai);
    const b = parseISODate(selesai);
    if (!a || !b) return fmtTglIndo(mulai, withYear);

    const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    const sameYear = a.getFullYear() === b.getFullYear();

    if (sameMonth) {
      const bln = BULAN[b.getMonth()];
      const yr = b.getFullYear();
      return withYear ? `${a.getDate()} s.d. ${b.getDate()} ${bln} ${yr}` : `${a.getDate()} s.d. ${b.getDate()} ${bln}`;
    }
    if (sameYear) {
      const blnA = BULAN[a.getMonth()];
      const blnB = BULAN[b.getMonth()];
      const yr = b.getFullYear();
      return withYear ? `${a.getDate()} ${blnA} s.d. ${b.getDate()} ${blnB} ${yr}` : `${a.getDate()} ${blnA} s.d. ${b.getDate()} ${blnB}`;
    }
    return `${fmtTglIndo(mulai, true)} s.d. ${fmtTglIndo(selesai, withYear)}`;
  }

  /**
   * Format rentang (single maupun multi-range 2 periode).
   * Contoh:
   *  - "1 Januari 2026"
   *  - "22 s.d. 24 Januari 2026"
   *  - "1 Januari & 2 s.d. 4 Februari 2026"
   *  - "22 s.d. 24 Januari & 29 Januari s.d. 2 Februari 2026"
   */
  function formatWaktuCombined(r1, r2, isMulti) {
    const hasR1 = r1 && r1.start;
    const hasR2 = isMulti && r2 && r2.start;

    if (!hasR1 && !hasR2) return '';
    if (!hasR2) {
      return formatSingleRange(r1.start, r1.end || r1.start, true);
    }
    if (!hasR1) {
      return formatSingleRange(r2.start, r2.end || r2.start, true);
    }

    const a1 = parseISODate(r1.start);
    const a2 = parseISODate(r2.end || r2.start);
    const sameYear = a1 && a2 && a1.getFullYear() === a2.getFullYear();

    // Jika tahunnya sama, teks range 1 tidak perlu mencantumkan tahun (tahun ditulis di range 2)
    const txt1 = formatSingleRange(r1.start, r1.end || r1.start, !sameYear);
    const txt2 = formatSingleRange(r2.start, r2.end || r2.start, true);

    return `${txt1} & ${txt2}`;
  }

  // ── State Modul Kalender ─────────────────────────────────────
  const state = {
    targetEl: null,
    isRange: true,
    isMulti: false,
    activeRange: 1, // 1 atau 2
    r1: { start: '', end: '', locked: false },
    r2: { start: '', end: '', locked: false },
    lastClickedDate: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    yearMode: false,
    focusedDay: '',
    onSelectCallback: null,
  };

  let popupEl = null;

  // ── Auto-Inject CSS & HTML ───────────────────────────────────
  function ensureCSS() {
    if (document.getElementById('apa-calendar-css')) return;
    const link = document.createElement('link');
    link.id = 'apa-calendar-css';
    link.rel = 'stylesheet';
    link.href = 'apa-calendar.css';
    document.head.appendChild(link);
  }

  function ensurePopupHTML() {
    popupEl = document.getElementById('cal-popup');
    if (popupEl && popupEl.querySelector('.cal-btn-multi')) {
      return popupEl;
    }

    if (popupEl) {
      popupEl.remove();
    }

    popupEl = document.createElement('div');
    popupEl.className = 'cal-popup';
    popupEl.id = 'cal-popup';
    popupEl.setAttribute('role', 'dialog');
    popupEl.setAttribute('aria-modal', 'true');
    popupEl.innerHTML = `
      <div class="cal-header">
        <button class="cal-nav" id="cal-prev" type="button" aria-label="Bulan Sebelumnya">&#8249;</button>
        <span class="cal-title" id="cal-title" title="Klik untuk pilih tahun"></span>
        <button class="cal-nav" id="cal-next" type="button" aria-label="Bulan Berikutnya">&#8250;</button>
      </div>
      <div class="cal-divider"></div>
      <div class="cal-day-names" id="cal-day-names"></div>
      <div class="cal-days" id="cal-days"></div>
      <div class="cal-year-grid" id="cal-year-grid"></div>
      <div class="cal-footer">
        <span class="cal-footer-text" id="cal-footer-text">Pilih tanggal</span>
        <div class="cal-footer-actions">
          <button class="cal-btn-multi" id="cal-btn-multi" type="button" title="Pilih 2 rentang tanggal">Multi</button>
          <button class="cal-btn-icon cal-btn-reset" id="cal-btn-reset" type="button" title="Reset pilihan tanggal">
            <img src="Assets/undo.png" alt="Reset">
          </button>
          <button class="cal-btn-icon cal-btn-save" id="cal-btn-save" type="button" title="Simpan tanggal">
            <img src="Assets/checked.png" alt="Simpan">
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(popupEl);
    wireEventListeners();
    return popupEl;
  }

  // ── Positioning ──────────────────────────────────────────────
  function positionPopup(popup, targetEl) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const popW = 310;
    const popH = 360;
    const pad = 8;

    // Horisontal
    let left = rect.left;
    if (left + popW > window.innerWidth - pad) {
      left = window.innerWidth - popW - pad;
    }
    if (left < pad) left = pad;

    // Vertikal
    let top = rect.bottom + 6;
    if (top + popH > window.innerHeight - pad) {
      // Flip ke atas jika tidak cukup tempat di bawah
      const topAbove = rect.top - popH - 6;
      if (topAbove >= pad) top = topAbove;
      else top = Math.max(pad, window.innerHeight - popH - pad);
    }

    popup.style.left = `${Math.round(left)}px`;
    popup.style.top = `${Math.round(top)}px`;
  }

  // ── Render Kalender ──────────────────────────────────────────
  function render() {
    if (!popupEl) return;

    popupEl.classList.toggle('year-mode', state.yearMode);
    const titleEl = popupEl.querySelector('#cal-title');
    if (titleEl) {
      titleEl.textContent = `${BULAN[state.month]} ${state.year}`;
    }

    const dayNamesEl = popupEl.querySelector('#cal-day-names');
    if (dayNamesEl) {
      dayNamesEl.innerHTML = HARI_NAMES.map(d => `<div class="cal-day-name">${d}</div>`).join('');
    }

    if (state.yearMode) {
      renderYearGrid();
      return;
    }

    // Hitung slot hari
    // Week starts on SEN (Senin = 0, ..., Minggu = 6)
    const firstDay = new Date(state.year, state.month, 1).getDay();
    const emptyOffset = (firstDay + 6) % 7;
    const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
    const today = todayISO();

    let html = '';
    for (let i = 0; i < emptyOffset; i++) {
      html += `<div class="cal-day cal-empty"></div>`;
    }

    const r1 = state.r1;
    const r2 = state.r2;
    const hasR1 = !!r1.start;
    const hasR2 = state.isMulti && !!r2.start;

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${state.year}-${pad2(state.month + 1)}-${pad2(d)}`;
      let cls = 'cal-day';

      if (ds === today) cls += ' cal-today';
      if (ds === state.focusedDay) cls += ' cal-focused';

      // Status Range 1
      if (hasR1) {
        const s1 = r1.start;
        const e1 = r1.end || r1.start;
        if (s1 === e1 && ds === s1) {
          cls += ' cal-r1-single';
        } else if (s1 !== e1) {
          if (ds === s1) cls += ' cal-r1-start';
          else if (ds === e1) cls += ' cal-r1-end';
          else if (ds > s1 && ds < e1) cls += ' cal-r1-in-range';
        }
      }

      // Status Range 2 (Multi)
      if (hasR2) {
        const s2 = r2.start;
        const e2 = r2.end || r2.start;
        if (s2 === e2 && ds === s2) {
          cls += ' cal-r2-single';
        } else if (s2 !== e2) {
          if (ds === s2) cls += ' cal-r2-start';
          else if (ds === e2) cls += ' cal-r2-end';
          else if (ds > s2 && ds < e2) cls += ' cal-r2-in-range';
        }
      }

      html += `<div class="${cls}" data-date="${ds}">${d}</div>`;
    }

    const daysEl = popupEl.querySelector('#cal-days');
    if (daysEl) daysEl.innerHTML = html;

    // Update Footer Text & Multi button state
    updateFooterUI();
  }

  function renderYearGrid() {
    if (!popupEl) return;
    const baseYear = Math.floor(state.year / 12) * 12;
    let html = '';
    for (let i = 0; i < 12; i++) {
      const y = baseYear + i;
      const cur = y === state.year ? ' current' : '';
      html += `<div class="cal-year-cell${cur}" data-year="${y}">${y}</div>`;
    }
    const yearGridEl = popupEl.querySelector('#cal-year-grid');
    if (yearGridEl) yearGridEl.innerHTML = html;
  }

  function updateFooterUI() {
    if (!popupEl) return;
    const footerTextEl = popupEl.querySelector('#cal-footer-text');
    const multiBtn = popupEl.querySelector('#cal-btn-multi');

    if (multiBtn) {
      multiBtn.classList.toggle('active', state.isMulti);
      // Sembunyikan tombol Multi jika input hanya mode single-date murni (isRange === false)
      multiBtn.style.display = state.isRange ? 'inline-block' : 'none';
    }

    if (!footerTextEl) return;

    if (!state.isRange) {
      // Single date
      footerTextEl.textContent = state.r1.start ? fmtTglIndo(state.r1.start, true) : 'Pilih tanggal';
      return;
    }

    if (!state.isMulti) {
      // Single range
      if (state.r1.start && state.r1.end && state.r1.start !== state.r1.end) {
        footerTextEl.textContent = formatSingleRange(state.r1.start, state.r1.end, true);
      } else if (state.r1.start) {
        footerTextEl.textContent = `${fmtTglIndo(state.r1.start, true)} (klik tgl akhir)`;
      } else {
        footerTextEl.textContent = 'Pilih rentang tanggal';
      }
      return;
    }

    // Multi-Range
    const txt = formatWaktuCombined(state.r1, state.r2, true);
    if (state.activeRange === 1) {
      if (state.r1.start) {
        footerTextEl.textContent = `Range 1: ${formatSingleRange(state.r1.start, state.r1.end || state.r1.start, true)}`;
      } else {
        footerTextEl.textContent = 'Pilih Range 1...';
      }
    } else {
      if (state.r2.start) {
        footerTextEl.textContent = txt;
      } else {
        footerTextEl.textContent = `Range 1 terkunci. Pilih Range 2...`;
      }
    }
  }

  // ── Penanganan Klik Tanggal (Auto-Close Rule) ─────────────────
  function handleDateClick(ds) {
    state.focusedDay = ds;

    // ── KASUS A: Single Date (Bukan rentang) ──
    if (!state.isRange) {
      if (state.r1.start === ds && state.lastClickedDate === ds) {
        // Klik 2x pada tanggal yang sama -> Kunci & Tutup
        state.r1.start = ds;
        state.r1.end = ds;
        state.r1.locked = true;
        saveAndClose();
        return;
      }
      state.r1.start = ds;
      state.r1.end = ds;
      state.r1.locked = false;
      state.lastClickedDate = ds;
      render();
      return;
    }

    // ── KASUS B: Single Range Mode (Default) ──
    if (!state.isMulti) {
      if (!state.r1.start || state.r1.locked) {
        // Klik pertama tanggal awal
        state.r1 = { start: ds, end: '', locked: false };
        state.lastClickedDate = ds;
        render();
        return;
      }

      // Sudah ada start, user memilih tanggal lagi
      if (ds === state.r1.start) {
        if (state.lastClickedDate === ds) {
          // Klik tanggal yang sama 2x berturut-turut!
          // Rentang 1 hari (contoh 2 Feb s.d. 2 Feb) -> Kunci & Tutup!
          state.r1.end = ds;
          state.r1.locked = true;
          saveAndClose();
          return;
        }
        // Klik kembali ke tanggal start
        state.r1.end = ds;
        state.lastClickedDate = ds;
        render();
        return;
      }

      // ds berbeda dengan start
      if (state.lastClickedDate === ds) {
        // Tanggal endpoint ini diklik untuk KEDUA kalinya!
        // Kunci rentang dan otomatis tutup pop-up!
        let s = state.r1.start;
        let e = ds;
        if (e < s) { const tmp = s; s = e; e = tmp; }
        state.r1.start = s;
        state.r1.end = e;
        state.r1.locked = true;
        saveAndClose();
        return;
      }

      // Klik PERTAMA pada tanggal endpoint (preview terbentuk, pop-up BELUM tertutup)
      let s = state.r1.start;
      let e = ds;
      if (e < s) { const tmp = s; s = e; e = tmp; }
      state.r1.start = s;
      state.r1.end = e;
      state.lastClickedDate = ds;
      render();
      return;
    }

    // ── KASUS C: Multi-Range Mode ──
    if (state.activeRange === 1) {
      if (!state.r1.start || state.r1.locked) {
        state.r1 = { start: ds, end: '', locked: false };
        state.lastClickedDate = ds;
        render();
        return;
      }

      if (ds === state.r1.start) {
        if (state.lastClickedDate === ds) {
          // Klik 2x pada tanggal yang sama -> Range 1 terkunci (1 hari)
          // POP-UP TIDAK BOLEH TERTUTUP! Bersiap untuk Range 2!
          state.r1.end = ds;
          state.r1.locked = true;
          state.activeRange = 2;
          state.lastClickedDate = '';
          render();
          return;
        }
        state.r1.end = ds;
        state.lastClickedDate = ds;
        render();
        return;
      }

      // ds berbeda dengan start (rentang range 1)
      if (state.lastClickedDate === ds) {
        // Tanggal akhir Range 1 diklik ke-2 kalinya -> Range 1 terkunci!
        // POP-UP TIDAK BOLEH TERTUTUP! Lanjut ke Range 2!
        let s = state.r1.start;
        let e = ds;
        if (e < s) { const tmp = s; s = e; e = tmp; }
        state.r1.start = s;
        state.r1.end = e;
        state.r1.locked = true;
        state.activeRange = 2;
        state.lastClickedDate = '';
        render();
        return;
      }

      // Klik ke-1 pada tgl akhir Range 1
      let s = state.r1.start;
      let e = ds;
      if (e < s) { const tmp = s; s = e; e = tmp; }
      state.r1.start = s;
      state.r1.end = e;
      state.lastClickedDate = ds;
      render();
      return;
    }

    // Active Range == 2
    if (state.activeRange === 2) {
      if (!state.r2.start || state.r2.locked) {
        state.r2 = { start: ds, end: '', locked: false };
        state.lastClickedDate = ds;
        render();
        return;
      }

      if (ds === state.r2.start) {
        if (state.lastClickedDate === ds) {
          // Klik 2x pada tanggal yang sama di Range 2 -> Range 2 terkunci (1 hari)!
          // POP-UP OTOMATIS TERTUTUP!
          state.r2.end = ds;
          state.r2.locked = true;
          saveAndClose();
          return;
        }
        state.r2.end = ds;
        state.lastClickedDate = ds;
        render();
        return;
      }

      // ds berbeda dengan start di Range 2
      if (state.lastClickedDate === ds) {
        // Tanggal akhir Range 2 diklik ke-2 kalinya -> Range 2 terkunci!
        // POP-UP OTOMATIS TERTUTUP!
        let s = state.r2.start;
        let e = ds;
        if (e < s) { const tmp = s; s = e; e = tmp; }
        state.r2.start = s;
        state.r2.end = e;
        state.r2.locked = true;
        saveAndClose();
        return;
      }

      // Klik ke-1 pada tgl akhir Range 2 (preview terbentuk)
      let s = state.r2.start;
      let e = ds;
      if (e < s) { const tmp = s; s = e; e = tmp; }
      state.r2.start = s;
      state.r2.end = e;
      state.lastClickedDate = ds;
      render();
    }
  }

  // ── Simpan & Tutup ───────────────────────────────────────────
  function saveAndClose() {
    if (!state.targetEl) {
      closePopup();
      return;
    }

    const r1 = state.r1;
    const r2 = state.r2;
    const isMulti = state.isMulti;

    // Normalisasi jika start ada tapi end belum ada
    if (r1.start && !r1.end) r1.end = r1.start;
    if (r2.start && !r2.end) r2.end = r2.start;

    const formattedText = formatWaktuCombined(r1, r2, isMulti);
    const el = state.targetEl;

    if (!r1.start && !r2.start) {
      // Tidak ada tanggal
      if ('value' in el) el.value = '';
      else el.textContent = '';
      el.dataset.isoMulai = '';
      el.dataset.isoSelesai = '';
      el.dataset.iso = '';
      delete el.dataset.multiRanges;
      delete el.dataset.waktuTextCustom;
    } else {
      if ('value' in el) el.value = formattedText;
      else el.textContent = formattedText;

      // Dataset terstruktur untuk database & form (kompatibel penuh dengan Supabase / Docx)
      el.dataset.isoMulai = r1.start || r2.start || '';
      el.dataset.isoSelesai = (isMulti && r2.end) ? r2.end : (r1.end || r1.start || '');
      el.dataset.iso = r1.start || '';

      if (isMulti && r1.start && r2.start) {
        el.dataset.multiRanges = JSON.stringify([
          { mulai: r1.start, selesai: r1.end },
          { mulai: r2.start, selesai: r2.end }
        ]);
        el.dataset.waktuTextCustom = formattedText;
      } else {
        delete el.dataset.multiRanges;
        delete el.dataset.waktuTextCustom;
      }
    }

    // Trigger event agar listener otomatis menyimpan data (di admin-surat-tugas atau minta-surat)
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    if (typeof state.onSelectCallback === 'function') {
      state.onSelectCallback({
        formattedText,
        r1,
        r2,
        isMulti,
        isoMulai: el.dataset.isoMulai,
        isoSelesai: el.dataset.isoSelesai
      });
    }

    closePopup();
  }

  function closePopup() {
    if (!popupEl) return;
    popupEl.classList.remove('open');
    state.targetEl = null;
    state.lastClickedDate = '';
  }

  // ── Buka Kalender ────────────────────────────────────────────
  function openPopup(targetEl, isRange = true, onSelect = null) {
    if (!targetEl) return;
    ensureCSS();
    ensurePopupHTML();

    state.targetEl = targetEl;
    state.isRange = Boolean(isRange);
    state.onSelectCallback = onSelect;
    state.yearMode = false;
    state.lastClickedDate = '';

    // Ambil data yang sudah ada di elemen
    let initMulti = null;
    if (targetEl.dataset.multiRanges) {
      try {
        initMulti = JSON.parse(targetEl.dataset.multiRanges);
      } catch (e) {
        initMulti = null;
      }
    }

    if (initMulti && Array.isArray(initMulti) && initMulti.length >= 2) {
      state.isMulti = true;
      state.activeRange = 1;
      state.r1 = { start: initMulti[0].mulai || '', end: initMulti[0].selesai || initMulti[0].mulai || '', locked: true };
      state.r2 = { start: initMulti[1].mulai || '', end: initMulti[1].selesai || initMulti[1].mulai || '', locked: true };
    } else {
      state.isMulti = false;
      state.activeRange = 1;
      const s = isRange ? (targetEl.dataset.isoMulai || targetEl.dataset.iso || '') : (targetEl.dataset.iso || '');
      const e = isRange ? (targetEl.dataset.isoSelesai || s) : s;
      state.r1 = { start: s, end: e, locked: !!s };
      state.r2 = { start: '', end: '', locked: false };
    }

    // Tentukan bulan & tahun yang dibuka pertama kali
    const refIso = state.r1.start || targetEl.dataset.isoMulai || targetEl.dataset.iso || todayISO();
    const d = parseISODate(refIso);
    if (d) {
      state.year = d.getFullYear();
      state.month = d.getMonth();
      state.focusedDay = refIso;
    } else {
      state.year = new Date().getFullYear();
      state.month = new Date().getMonth();
      state.focusedDay = todayISO();
    }

    popupEl.classList.remove('year-mode');
    popupEl.classList.add('open');
    positionPopup(popupEl, targetEl);
    render();
  }

  // ── Event Wiring ─────────────────────────────────────────────
  function wireEventListeners() {
    if (!popupEl) return;

    // Navigasi Prev/Next
    const prevBtn = popupEl.querySelector('#cal-prev');
    if (prevBtn) {
      prevBtn.onclick = function (e) {
        e.stopPropagation();
        if (state.yearMode) {
          state.year -= 12;
        } else {
          state.month--;
          if (state.month < 0) { state.month = 11; state.year--; }
        }
        render();
      };
    }

    const nextBtn = popupEl.querySelector('#cal-next');
    if (nextBtn) {
      nextBtn.onclick = function (e) {
        e.stopPropagation();
        if (state.yearMode) {
          state.year += 12;
        } else {
          state.month++;
          if (state.month > 11) { state.month = 0; state.year++; }
        }
        render();
      };
    }

    // Judul Bulan/Tahun (Toggle Year Grid)
    const titleBtn = popupEl.querySelector('#cal-title');
    if (titleBtn) {
      titleBtn.onclick = function (e) {
        e.stopPropagation();
        state.yearMode = !state.yearMode;
        render();
      };
    }

    // Klik Tanggal
    const daysContainer = popupEl.querySelector('#cal-days');
    if (daysContainer) {
      daysContainer.onclick = function (e) {
        e.stopPropagation();
        const cell = e.target.closest('.cal-day:not(.cal-empty)');
        if (!cell || !cell.dataset.date) return;
        handleDateClick(cell.dataset.date);
      };
    }

    // Klik Tahun pada Year Grid
    const yearGrid = popupEl.querySelector('#cal-year-grid');
    if (yearGrid) {
      yearGrid.onclick = function (e) {
        e.stopPropagation();
        const cell = e.target.closest('.cal-year-cell');
        if (!cell || !cell.dataset.year) return;
        state.year = parseInt(cell.dataset.year, 10);
        state.yearMode = false;
        render();
      };
    }

    // Tombol "Multi"
    const multiBtn = popupEl.querySelector('#cal-btn-multi');
    if (multiBtn) {
      multiBtn.onclick = function (e) {
        e.stopPropagation();
        if (!state.isRange) return;
        state.isMulti = !state.isMulti;

        if (!state.isMulti) {
          // Kembali ke Single Range: hapus Range 2
          state.r2 = { start: '', end: '', locked: false };
          state.activeRange = 1;
          state.lastClickedDate = '';
        } else {
          // Masuk ke Multi Range
          if (state.r1.start) {
            state.r1.locked = true;
            state.activeRange = 2;
          } else {
            state.activeRange = 1;
          }
          state.lastClickedDate = '';
        }
        render();
      };
    }

    // Tombol Reset (Assets/undo.png)
    const resetBtn = popupEl.querySelector('#cal-btn-reset');
    if (resetBtn) {
      resetBtn.onclick = function (e) {
        e.stopPropagation();
        if (state.isMulti) {
          if (state.activeRange === 2 && state.r2.start) {
            // Reset Range 2 yang sedang dipilih
            state.r2 = { start: '', end: '', locked: false };
            state.lastClickedDate = '';
          } else {
            // Reset Range 1 (dan Range 2) sehingga user bisa memilih ulang Range 1
            state.r1 = { start: '', end: '', locked: false };
            state.r2 = { start: '', end: '', locked: false };
            state.activeRange = 1;
            state.lastClickedDate = '';
          }
        } else {
          state.r1 = { start: '', end: '', locked: false };
          state.lastClickedDate = '';
        }
        render();
      };
    }

    // Tombol Simpan (Assets/checked.png)
    const saveBtn = popupEl.querySelector('#cal-btn-save');
    if (saveBtn) {
      saveBtn.onclick = function (e) {
        e.stopPropagation();
        saveAndClose();
      };
    }

    // Cegah klik di dalam popup menutup popup
    popupEl.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  // ── Global Outside Click & Auto-Trigger Listeners ────────────
  function initGlobalListeners() {
    // 1. Klik di luar kalender: Simpan & Tutup
    document.addEventListener('click', function (e) {
      if (!popupEl || !popupEl.classList.contains('open')) return;
      if (popupEl.contains(e.target)) return;
      if (state.targetEl && state.targetEl.contains(e.target)) return;
      // Klik di mana saja di luar kalender
      saveAndClose();
    });

    // 2. Klik 1 kali pada kolom/elemen tanggal -> Buka Pop-up Kalender
    document.addEventListener('click', function (e) {
      const el = e.target.closest('[data-iso-mulai], [data-iso], input.xls-cell[data-col-field="waktu"], input.xls-cell[data-field="waktu"], input.xls-cell[data-field="tanggal_surat"], input.xls-cell[data-field="tanggal_berangkat"]');
      if (el && !el.disabled && !el.readOnly) {
        const isRange = el.dataset.isoMulai !== undefined ||
                        el.dataset.colField === 'waktu' ||
                        el.dataset.field === 'waktu' ||
                        el.dataset.field === 'tanggal_berangkat';
        openPopup(el, isRange);
      }
    });

    // 3. Tab (Keyboard Focus) pada kolom tanggal -> Buka Pop-up Kalender
    document.addEventListener('focusin', function (e) {
      const el = e.target.closest('[data-iso-mulai], [data-iso], input.xls-cell[data-col-field="waktu"], input.xls-cell[data-field="waktu"], input.xls-cell[data-field="tanggal_surat"], input.xls-cell[data-field="tanggal_berangkat"]');
      if (el && !el.disabled && !el.readOnly) {
        const isRange = el.dataset.isoMulai !== undefined ||
                        el.dataset.colField === 'waktu' ||
                        el.dataset.field === 'waktu' ||
                        el.dataset.field === 'tanggal_berangkat';
        openPopup(el, isRange);
      }
    });

    // 4. Keyboard Navigation di dalam Pop-up (Arrow keys, Enter, Esc)
    document.addEventListener('keydown', function (e) {
      if (!popupEl || !popupEl.classList.contains('open')) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        saveAndClose();
        return;
      }

      if (state.yearMode) return;

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) {
        e.preventDefault();
        const curIso = state.focusedDay || todayISO();
        const d = parseISODate(curIso) || new Date();

        if (e.key === 'ArrowLeft')  d.setDate(d.getDate() - 1);
        if (e.key === 'ArrowRight') d.setDate(d.getDate() + 1);
        if (e.key === 'ArrowUp')    d.setDate(d.getDate() - 7);
        if (e.key === 'ArrowDown')  d.setDate(d.getDate() + 7);

        const newIso = toISODate(d);

        if (e.key === 'Enter') {
          handleDateClick(state.focusedDay || newIso);
          return;
        }

        state.focusedDay = newIso;
        if (d.getMonth() !== state.month || d.getFullYear() !== state.year) {
          state.month = d.getMonth();
          state.year = d.getFullYear();
        }
        render();
      }
    });

    // Re-position saat window di-resize atau scroll
    window.addEventListener('resize', function () {
      if (popupEl && popupEl.classList.contains('open') && state.targetEl) {
        positionPopup(popupEl, state.targetEl);
      }
    }, { passive: true });
  }

  // Inisialisasi saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      ensureCSS();
      ensurePopupHTML();
      initGlobalListeners();
    });
  } else {
    ensureCSS();
    ensurePopupHTML();
    initGlobalListeners();
  }

  return {
    open: openPopup,
    close: closePopup,
    formatWaktu: function (mulai, selesai) {
      return formatSingleRange(mulai, selesai, true);
    },
    formatCombined: formatWaktuCombined,
    getState: function () { return state; }
  };
});
