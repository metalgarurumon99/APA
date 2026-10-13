/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * APA GLOBAL SPREADSHEET GRID NAVIGATION MODULE (apa-grid-nav.js)
 * Sistem Automasi Pekerjaan Administrasi (APA) — BPS Kabupaten Raja Ampat
 * ═══════════════════════════════════════════════════════════════════════════════
 * Memberikan interaksi keyboard sekelas Microsoft Excel / Google Sheets
 * untuk semua tabel data APA:
 *  - Arrow Keys (↑, ↓, ←, →) untuk perpindahan sel pintar
 *  - Enter untuk loncat ke sel berikutnya, Alt+Enter untuk baris baru (newline)
 *  - Tab / Shift+Tab untuk navigasi linear maju/mundur
 *  - Space / Enter pada sel custom picker (Pegawai/Alat/dsb.) untuk membuka opsi
 *  - Delete / Backspace pada sel custom picker untuk membatalkan/reset pilihan
 *  - Escape untuk menutup modal/popup sekaligus mempertahankan fokus sel aktif
 *  - Highlight baris aktif (.row-focused) dan auto-select teks saat sel difokuskan
 * ═══════════════════════════════════════════════════════════════════════════════
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.apaGridNav = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // Injeksi CSS default untuk highlight baris fokus jika belum ada
  if (!document.getElementById('apa-grid-nav-css')) {
    const style = document.createElement('style');
    style.id = 'apa-grid-nav-css';
    style.textContent = `
      tr.row-focused {
        outline: 2px solid #3b82f6 !important;
        outline-offset: -2px !important;
      }
      tr.row-focused td {
        background: rgba(59, 130, 246, 0.04) !important;
      }
    `;
    if (document.head) document.head.appendChild(style);
  }

  // Konfigurasi default modul
  let config = {
    rowSelector: 'tr[data-surat-id], #bulk-tbody tr',
    fields: [],
    cellSelector: '.xls-cell, .pg-cell, .alat-cell, .tp-cell, .ro-text, .ro-ttd',
    onClearCell: null,
    onOpenCell: null,
    onClosePopups: null,
    closeModals: null,
    getActivePopupCell: null
  };

  let lastActiveGridCell = null;
  let isInitialized = false;

  /**
   * Cari target sel valid dari elemen yang difokuskan.
   */
  function getCellTarget(target) {
    if (!target) return null;
    if (target.matches && target.matches(config.cellSelector)) return target;
    return target.closest ? target.closest(config.cellSelector) : null;
  }

  /**
   * Bangun grid 2D dari tabel DOM saat ini.
   * grid[rowIdx][colIdx] = focusable HTMLElement | null
   */
  function buildNavGrid() {
    const rows = Array.from(document.querySelectorAll(config.rowSelector));
    const fields = config.fields || [];

    return rows.map(row => {
      if (!fields.length) {
        // Fallback jika tidak ditentukan fields: ambil semua sel di dalam baris
        return Array.from(row.querySelectorAll(config.cellSelector));
      }

      return fields.map(field => {
        // 1) Editable input / textarea
        let el = row.querySelector(
          `input.xls-cell[data-col-field="${field}"],
           textarea.xls-cell[data-col-field="${field}"],
           input[data-col-field="${field}"],
           textarea[data-col-field="${field}"]`
        );
        if (el) return el;

        // 2) Editable pg-cell
        const pgCell = row.querySelector(`.pg-cell[data-col-field="${field}"]`);
        if (pgCell) return pgCell;

        // 3) Editable alat-cell
        const alatCell = row.querySelector(`.alat-cell[data-col-field="${field}"]`);
        if (alatCell) return alatCell;

        // 4) Editable tp-cell (tipe)
        const tpCell = row.querySelector(`.tp-cell[data-col-field="${field}"]`);
        if (tpCell) return tpCell.querySelector('.tp-input') || tpCell;

        // 5) Readonly cell (ro-text, ro-ttd)
        el = row.querySelector(`[data-col-field="${field}"]`);
        return el || null;
      });
    });
  }

  /**
   * Cari koordinat baris dan kolom sel di dalam grid.
   */
  function findInGrid(grid, target) {
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const el = grid[r][c];
        if (!el) continue;
        if (el === target || (el.contains && el.contains(target))) {
          return { r, c };
        }
        if (target.classList && target.classList.contains('pg-input')) {
          const parentPg = target.closest('.pg-cell');
          if (parentPg && el === parentPg) return { r, c };
        }
        if (target.classList && target.classList.contains('tp-input')) {
          const parentTp = target.closest('.tp-cell');
          if (parentTp && el === parentTp) return { r, c };
        }
      }
    }
    return null;
  }

  /**
   * Fokus ke sel koordinat [r][c] dengan scroll smooth dan auto-select teks.
   */
  function navFocusCell(grid, r, c) {
    if (!grid.length) return;
    const maxCols = config.fields && config.fields.length ? config.fields.length : (grid[0] ? grid[0].length : 1);
    r = Math.max(0, Math.min(r, grid.length - 1));
    c = Math.max(0, Math.min(c, maxCols - 1));

    let el = grid[r] ? grid[r][c] : null;

    // Fallback geser kanan jika sel kosong
    if (!el && grid[r]) {
      for (let cc = c + 1; cc < grid[r].length; cc++) {
        if (grid[r][cc]) { el = grid[r][cc]; break; }
      }
    }
    // Fallback geser kiri jika masih kosong
    if (!el && grid[r]) {
      for (let cc = c - 1; cc >= 0; cc--) {
        if (grid[r][cc]) { el = grid[r][cc]; break; }
      }
    }
    if (!el) return;

    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });

    // Auto-select isi teks jika elemen adalah input/textarea
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      try { el.select(); } catch (_) {}
    }

    // Highlight baris aktif
    highlightRow(el.closest('tr'));
    lastActiveGridCell = el;
  }

  /**
   * Pindah fokus secara linear (maju/mundur) untuk tombol Tab / Enter.
   */
  function moveCellFocus(currentEl, direction) {
    const targetCell = getCellTarget(currentEl) || currentEl;
    const allCells = Array.from(document.querySelectorAll(
      'tr:is([data-status="menunggu"], [data-editing="1"], [data-row-id]) .xls-cell, ' +
      'tr:is([data-status="menunggu"], [data-editing="1"], [data-row-id]) .pg-cell, ' +
      'tr:is([data-status="menunggu"], [data-editing="1"], [data-row-id]) .alat-cell, ' +
      'tr:is([data-status="menunggu"], [data-editing="1"], [data-row-id]) .tp-cell, ' +
      '#bulk-tbody tr[data-row-id] .xls-cell, ' +
      '#bulk-tbody tr[data-row-id] .pg-cell'
    ));

    let idx = allCells.indexOf(targetCell);
    if (idx < 0) {
      idx = allCells.findIndex(c => c.contains(targetCell));
    }
    if (idx < 0) return;

    const next = allCells[idx + direction];
    if (next) {
      next.focus();
      if (next.tagName === 'INPUT' || next.tagName === 'TEXTAREA') {
        try { next.select(); } catch (_) {}
      }
      highlightRow(next.closest('tr'));
      lastActiveGridCell = next;
    }
  }

  /**
   * Pasang tanda highlight baris aktif dan bersihkan dari baris lain.
   */
  function highlightRow(row) {
    document.querySelectorAll('tr.row-focused').forEach(tr => tr.classList.remove('row-focused'));
    if (row) row.classList.add('row-focused');
  }

  /**
   * Handler event Keydown global
   */
  function onKeyDown(e) {
    // 1) Biarkan popup kalender & pegawai memproses tombol panah internal mereka sendiri
    if (window.apaCalendar && window.apaCalendar.isOpen && window.apaCalendar.isOpen() && e.key !== 'Escape') return;
    if (window.apaPegawai && window.apaPegawai.isOpen && window.apaPegawai.isOpen() && e.key !== 'Escape') return;

    /* ── Escape: Tutup popup/modal & pulihkan fokus ke sel aktif ── */
    if (e.key === 'Escape') {
      e.preventDefault();
      let cellToFocus = null;

      // Cari elemen pemantik popup yang sedang aktif
      if (window.apaCalendar && window.apaCalendar.isOpen && window.apaCalendar.isOpen()) {
        cellToFocus = (window.apaCalendar.getTarget && window.apaCalendar.getTarget()) || null;
      } else if (window.apaPegawai && window.apaPegawai.isOpen && window.apaPegawai.isOpen()) {
        cellToFocus = (window.apaPegawai.getCell && window.apaPegawai.getCell()) || null;
      } else if (config.getActivePopupCell && typeof config.getActivePopupCell === 'function') {
        cellToFocus = config.getActivePopupCell();
      }

      if (!cellToFocus) {
        cellToFocus = getCellTarget(e.target);
      }
      if (!cellToFocus && lastActiveGridCell && document.body.contains(lastActiveGridCell)) {
        cellToFocus = lastActiveGridCell;
      }

      // Tutup popup & modal
      if (typeof config.onClosePopups === 'function') config.onClosePopups();
      if (typeof config.closeModals === 'function') config.closeModals();

      // Kembalikan fokus dan highlight baris
      if (cellToFocus) {
        cellToFocus.focus();
        highlightRow(cellToFocus.closest('tr'));
        lastActiveGridCell = cellToFocus;
      } else {
        const row = document.querySelector('tr.row-focused') || document.querySelector(config.rowSelector);
        if (row) {
          const firstCell = row.querySelector(config.cellSelector);
          if (firstCell) {
            firstCell.focus();
            highlightRow(row);
            lastActiveGridCell = firstCell;
          }
        }
      }
      return;
    }

    const cellTarget = getCellTarget(e.target);
    if (!cellTarget) return;

    const isXlsCell  = cellTarget.classList.contains('xls-cell');
    const isPgCell   = cellTarget.classList.contains('pg-cell');
    const isAlatCell = cellTarget.classList.contains('alat-cell');
    const isTpInput  = cellTarget.classList.contains('tp-input');
    const isRoText   = cellTarget.classList.contains('ro-text') || cellTarget.classList.contains('ro-ttd');

    const isTextarea = cellTarget.tagName === 'TEXTAREA';
    const isReadonly = isRoText;
    const fieldName  = cellTarget.dataset.colField || cellTarget.dataset.field || '';

    /* ── Delete / Backspace: Membatalkan pilihan pada sel custom picker ── */
    if (!isReadonly && (e.key === 'Delete' || e.key === 'Backspace')) {
      if ((isPgCell || isAlatCell) && typeof config.onClearCell === 'function') {
        e.preventDefault();
        config.onClearCell(cellTarget, fieldName, cellTarget.closest('tr'));
        return;
      }
    }

    /* ── Enter / Space pada sel custom picker: Buka panel pilihan ── */
    if (!isReadonly && (e.key === 'Enter' || e.key === ' ')) {
      if ((isPgCell || isAlatCell) && typeof config.onOpenCell === 'function') {
        e.preventDefault();
        config.onOpenCell(cellTarget, fieldName, cellTarget.closest('tr'));
        return;
      }
    }

    /* ── Arrow Keys: Navigasi Grid 2 Dimensi ── */
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      // Alt+ArrowDown pada date cell = buka kalender, jangan diintercept
      if (e.altKey && e.key === 'ArrowDown') return;

      // Typeahead MAK yang sedang terbuka = biarkan handler internal memilih item
      if (cellTarget.classList.contains('mak-input') &&
          document.getElementById('mak-ac-popup') &&
          document.getElementById('mak-ac-popup').classList.contains('open')) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') return;
      }

      // Autocomplete Tipe yang sedang terbuka = biarkan handler internal
      if (isTpInput &&
          document.getElementById('tp-ac-popup') &&
          document.getElementById('tp-ac-popup').classList.contains('open')) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') return;
      }

      const grid = buildNavGrid();
      const pos  = findInGrid(grid, cellTarget);
      if (!pos) return;

      const { r, c } = pos;
      const numCols = config.fields && config.fields.length ? config.fields.length : (grid[0] ? grid[0].length : 1);

      if (e.key === 'ArrowUp') {
        if (r > 0) {
          e.preventDefault();
          if (typeof config.onClosePopups === 'function') config.onClosePopups();
          navFocusCell(grid, r - 1, c);
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        if (r < grid.length - 1) {
          e.preventDefault();
          if (typeof config.onClosePopups === 'function') config.onClosePopups();
          navFocusCell(grid, r + 1, c);
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        const cursorAtStart = isReadonly || isPgCell || isAlatCell || (
          cellTarget.selectionStart === 0 && cellTarget.selectionEnd === 0
        );
        if (cursorAtStart) {
          if (c > 0) {
            e.preventDefault();
            if (typeof config.onClosePopups === 'function') config.onClosePopups();
            navFocusCell(grid, r, c - 1);
          } else if (r > 0) {
            // Loncat wrap ke kolom terakhir baris atas
            e.preventDefault();
            if (typeof config.onClosePopups === 'function') config.onClosePopups();
            navFocusCell(grid, r - 1, numCols - 1);
          }
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        const valLen = (cellTarget.value || '').length;
        const cursorAtEnd = isReadonly || isPgCell || isAlatCell || (
          cellTarget.selectionStart === valLen && cellTarget.selectionEnd === valLen
        );
        if (cursorAtEnd) {
          if (c < numCols - 1) {
            e.preventDefault();
            if (typeof config.onClosePopups === 'function') config.onClosePopups();
            navFocusCell(grid, r, c + 1);
          } else if (r < grid.length - 1) {
            // Loncat wrap ke kolom pertama baris bawah
            e.preventDefault();
            if (typeof config.onClosePopups === 'function') config.onClosePopups();
            navFocusCell(grid, r + 1, 0);
          }
        }
        return;
      }
    }

    if (isReadonly) return;

    /* ── Enter pada Textarea: Pindah ke sel berikutnya (Alt+Enter = newline) ── */
    if (e.key === 'Enter' && isTextarea && isXlsCell) {
      if (e.altKey) return; // Alt+Enter diizinkan membuat baris baru
      e.preventDefault();
      if (typeof config.onClosePopups === 'function') config.onClosePopups();
      moveCellFocus(cellTarget, 1);
      return;
    }

    /* ── Tab: Navigasi linear antar sel input ── */
    if (e.key === 'Tab') {
      e.preventDefault();
      moveCellFocus(cellTarget, e.shiftKey ? -1 : 1);
    }
  }

  /**
   * Handler event FocusIn global untuk melacak sel dan baris aktif
   */
  function onFocusIn(e) {
    const cell = getCellTarget(e.target);
    if (cell) {
      lastActiveGridCell = cell;
      highlightRow(cell.closest('tr'));
    }
  }

  /**
   * Inisialisasi modul dengan konfigurasi spesifik halaman/tabel.
   */
  function init(options) {
    config = Object.assign({}, config, options || {});

    if (!isInitialized) {
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('focusin', onFocusIn);
      isInitialized = true;
    }

    return publicAPI;
  }

  const publicAPI = {
    init,
    buildNavGrid,
    findInGrid,
    navFocusCell,
    moveCellFocus,
    highlightRow,
    getLastActiveCell: () => lastActiveGridCell,
    setLastActiveCell: (el) => {
      lastActiveGridCell = el;
      if (el) highlightRow(el.closest('tr'));
    }
  };

  return publicAPI;
});
