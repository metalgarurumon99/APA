// minta-surat-tugas.js — Diekstrak dari minta-surat-tugas.html (cacheable)
// `esc`, `logout`, `apaCheckSession`, `apaRpc`, `BULAN`, dan `SUPABASE_HEADERS`
// di-load dari apa-shared.js — tidak lagi dideklarasi ulang di sini.
const H = SUPABASE_HEADERS; // alias singkat untuk dipakai di file ini
let SESSION=null;let allSurat=[];const suratMap={};let suratOrderMap={};
let suratSortState={col:'no',dir:'desc'};
/* #7: Persist active tab antar refresh.
   Pattern sessionStorage — hanya scope tab browser (hilang saat tutup browser/tab).
   Per-user juga supaya kalau ganti akun di browser yang sama, default
   kembali ke "list" (lebih safe — admin/user pertama kali melihat surat).

   Key disesuaikan dengan user.id supaya tidak bocor antar user.
*/
function getTabStorageKey(){
  let uid = 'anon';
  try {
    const s = (SESSION && SESSION.id) ? SESSION : JSON.parse(localStorage.getItem('apa_user') || 'null');
    if (s && s.id) uid = String(s.id);
  } catch(_) {}
  return `apa_active_tab_st_${uid}`;
}
function switchTab(tab){
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',['list','bulk'][i]===tab));
  document.getElementById('panel-list').classList.toggle('active',tab==='list');
  document.getElementById('panel-bulk').classList.toggle('active',tab==='bulk');
  if(tab==='bulk')requestAnimationFrame(()=>setupBulkTopScrollbar());
  try{sessionStorage.setItem(getTabStorageKey(),tab);}catch(_){}
}
function restoreActiveTab(){
  let tab = 'bulk';
  try {
    const key = getTabStorageKey();
    const saved = sessionStorage.getItem(key);
    if (saved === 'list' || saved === 'bulk') tab = saved;
  } catch(_) {}
  switchTab(tab);
}
// fmtWaktu di-load dari apa-shared.js
async function loadSurat(){
  try{
    let baseUrl=`${SUPABASE_URL}/rest/v1/surat_tugas?order=created_at.asc`;
    if(SESSION&&SESSION.id&&SESSION.role!=='admin'){
      baseUrl=`${SUPABASE_URL}/rest/v1/surat_tugas?user_id=eq.${encodeURIComponent(SESSION.id)}&order=created_at.asc`;
    }
    const PAGE_SIZE=1000;
    const ascList=[];
    let offset=0;
    while(true){
      const res=await fetch(baseUrl,{headers:{...H,'Range-Unit':'items','Range':`${offset}-${offset+PAGE_SIZE-1}`}});
      if(res.status===416)break;
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const chunk=await res.json();
      if(!Array.isArray(chunk)||!chunk.length)break;
      ascList.push(...chunk);
      if(chunk.length<PAGE_SIZE)break;
      offset+=PAGE_SIZE;
    }
    suratOrderMap={};
    ascList.forEach((s,i)=>{suratOrderMap[s.id]=i+1;});
    allSurat=ascList.slice().reverse();
    updateStats();
    renderSubmittedRows();
    filterTable();
    const tcList=document.getElementById('tc-list');
    if(tcList)tcList.textContent=allSurat.length;
  }catch(e){
    showBulkAlert('Gagal memuat riwayat surat tugas.','error');
  }
}
function updateStats(){document.getElementById('st-total').textContent=allSurat.length;document.getElementById('st-menunggu').textContent=allSurat.filter(s=>s.status==='menunggu').length;document.getElementById('st-selesai').textContent=allSurat.filter(s=>s.status==='selesai').length;}
// fmtWaktu & badgeHTML di-load secara global dari apa-shared.js
function renderTable(data){document.getElementById('table-count').textContent=`${data.length} surat`;if(!data.length){document.getElementById('table-area').innerHTML='<div class="table-empty"><div class="table-empty-icon">\ud83d\udced</div><div class="table-empty-text">Belum ada surat tugas.</div></div>';return;}data.forEach(s=>{suratMap[s.id]=s;});const r=data.map(s=>`<tr><td style="max-width:220px;white-space:normal;word-break:break-word;line-height:1.5">${esc(s.perihal)||'\u2014'}</td><td style="white-space:nowrap;font-size:12px">${esc(fmtWaktu(s.tanggal_berangkat,s.tanggal_kembali))}</td><td>${esc(s.tujuan)||'\u2014'}</td><td><span style="font-size:11px;color:var(--muted)">${(s.pegawai_list||[]).length} orang</span></td><td>${badgeHTML(s.status)}</td><td><button class="btn-sm" onclick="showDetail(${escAttr(jsArg(s.id))})">Detail</button></td></tr>`).join('');document.getElementById('table-area').innerHTML=`<table class="list-table"><thead><tr><th>Perihal</th><th>Waktu Pelaksanaan</th><th>Tujuan</th><th>Pegawai</th><th>Status</th><th></th></tr></thead><tbody>${r}</tbody></table>`;}
function sortValueSurat(s,col){
  if(col==='no')return suratOrderMap[s.id]||0;
  if(col==='created_at')return Date.parse(s.created_at||s.tanggal_surat||s.tanggal_berangkat||'')||0;
  if(col==='waktu')return Date.parse(s.tanggal_berangkat||'')||0;
  if(col==='pegawai')return (s.pegawai_list||[]).join(' ').toLowerCase();
  return String(s[col]||'').toLowerCase();
}
function sortedSubmittedRows(){
  const {col,dir}=suratSortState;
  return allSurat.slice().sort((a,b)=>{
    const av=sortValueSurat(a,col),bv=sortValueSurat(b,col);
    const cmp=typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv),'id');
    return dir==='asc'?cmp:-cmp;
  });
}
function refreshSortHeaders(){
  document.querySelectorAll('table.xls-table thead th.sortable').forEach(th=>{
    const attr=(th.getAttribute('onclick')||'').match(/setSuratSort\('([^']+)'\)/);
    const col=attr&&attr[1];
    const active=col===suratSortState.col;
    th.classList.toggle('sorted',active);
    const arrow=th.querySelector('.sort-arrow');
    if(arrow)arrow.textContent=active?(suratSortState.dir==='asc'?'▴':'▾'):'↕';
  });
}
function setSuratSort(col){
  if(suratSortState.col===col)suratSortState.dir=suratSortState.dir==='asc'?'desc':'asc';
  else{suratSortState.col=col;suratSortState.dir=['no','created_at','waktu'].includes(col)?'desc':'asc';}
  renderSubmittedRows();
}
function roCell(field,val){
  const text=val?esc(val):'\u2014';
  return `<div class="readonly-cell ro-text${val?'':' muted'}" tabindex="0" data-col-field="${field}">${text}</div>`;
}
function submittedRowHTML(s){
  suratMap[s.id]=s;
  const names = s.pegawai_list || [];
  const nips = s.pegawai_nip || [];
  let pegawaiHtml = '\u2014';
  if (names.length === 1) {
    pegawaiHtml = esc(names[0]);
  } else if (names.length > 1) {
    pegawaiHtml = `<span class="apa-pg-badge-terlampir" title="Klik untuk melihat petugas terlampir"
      data-nips='${escAttr(JSON.stringify(nips))}'
      data-names='${escAttr(JSON.stringify(names))}'
      onclick="event.stopPropagation(); window.apaPegawai.openPreview(this)">
      <span class="icon">📎</span> Terlampir
      <span class="count-pill">${names.length}</span>
    </span>`;
  }
  const urutNo=suratOrderMap[s.id]||'\u2014';
  return`<tr class="submitted-row" data-surat-id="${escAttr(s.id)}" data-status="${escAttr(s.status||'')}">
    <td class="col-check"></td>
    <td class="col-no" data-fixed-no="1">${urutNo}</td>
    <td class="col-perihal">${roCell('perihal',s.perihal)}</td>
    <td class="col-waktu">${roCell('waktu',fmtWaktu(s.tanggal_berangkat,s.tanggal_kembali))}</td>
    <td class="col-tujuan">${roCell('tujuan',s.tujuan)}</td>
    <td class="col-nama"><div class="readonly-cell ro-text${names.length?'':' muted'}" tabindex="0" data-col-field="pegawai_multi">${pegawaiHtml}</div></td>
    <td class="col-pok">${roCell('pembebanan',s.pembebanan)}</td>
    <td class="col-status"><div class="ro-text" tabindex="0" data-col-field="status">${badgeHTML(s.status)}</div></td>
    <td class="col-aksi"><div class="action-buttons"><button class="btn-sm" onclick="showDetail(${escAttr(jsArg(s.id))})">Detail</button>${s.status==='selesai'?'':`<button class="btn-sm danger" onclick="deleteSubmittedSurat(${escAttr(jsArg(s.id))})">Delete</button>`}</div></td>
  </tr>`;
}
function renderSubmittedRows(){
  const tbody=document.getElementById('bulk-tbody');
  if(!tbody)return;
  tbody.querySelectorAll('tr.submitted-row').forEach(tr=>tr.remove());
  if(allSurat.length){
    tbody.insertAdjacentHTML('beforeend',sortedSubmittedRows().map(submittedRowHTML).join(''));
  }
  refreshSortHeaders();
  reNumberRows();
  setupBulkTopScrollbar();
}
function setupBulkTopScrollbar(){
  const top=document.getElementById('bulk-scroll-top');
  const topInner=document.getElementById('bulk-scroll-top-inner');
  const bottom=document.getElementById('bulk-table-scroll');
  if(!top||!topInner||!bottom)return;
  const table=bottom.querySelector('table');
  const tableWidth=table?table.scrollWidth:bottom.scrollWidth;
  topInner.style.width=tableWidth+'px';
  top.style.display=tableWidth>bottom.clientWidth?'':'none';
  if(top._syncBound)return;
  let syncing=false;
  top.addEventListener('scroll',()=>{
    if(syncing)return;
    syncing=true;
    bottom.scrollLeft=top.scrollLeft;
    requestAnimationFrame(()=>{syncing=false;});
  });
  bottom.addEventListener('scroll',()=>{
    if(syncing)return;
    syncing=true;
    top.scrollLeft=bottom.scrollLeft;
    requestAnimationFrame(()=>{syncing=false;});
  });
  top._syncBound=true;
}
let _bulkResizeTimer=null;
window.addEventListener('resize',()=>{
  if(_bulkResizeTimer)clearTimeout(_bulkResizeTimer);
  _bulkResizeTimer=setTimeout(setupBulkTopScrollbar,150);
});
async function deleteSubmittedSurat(id){
  const s=suratMap[id];
  if(!s)return;
  if(!confirm(`Hapus surat "${s.perihal||'tanpa perihal'}"?`))return;
  try{
    const isAdmin = SESSION && (SESSION.role === 'admin' || (Array.isArray(SESSION.roles) && SESSION.roles.includes('admin')));
    let delUrl = `${SUPABASE_URL}/rest/v1/surat_tugas?id=eq.${encodeURIComponent(id)}`;
    if (!isAdmin && SESSION && SESSION.id) {
      delUrl += `&user_id=eq.${encodeURIComponent(SESSION.id)}`;
    }
    const res=await fetch(delUrl,{method:'DELETE',headers:{...H,'Prefer':'return=minimal'}});
    if(!res.ok){
      const err=await res.json().catch(()=>({}));
      throw new Error(err.message||`HTTP ${res.status}`);
    }
    allSurat=allSurat.filter(x=>String(x.id)!==String(id));
    delete suratMap[id];
    updateStats();
    renderSubmittedRows();
    filterTable();
    const tcList=document.getElementById('tc-list');
    if(tcList)tcList.textContent=allSurat.length;
    showBulkAlert('Surat tugas berhasil dihapus.','success');
  }catch(e){
    showBulkAlert(`Gagal menghapus surat: ${e.message}.`,'error');
  }
}
function filterTable(){const q=document.getElementById('search-input').value.toLowerCase();const st=document.getElementById('filter-status').value;const f=allSurat.filter(s=>(!q||(s.perihal||'').toLowerCase().includes(q)||(s.tujuan||'').toLowerCase().includes(q))&&(!st||s.status===st));renderTable(f);document.getElementById('table-count').textContent=`${f.length} surat`;}
function showDetail(id){const s=suratMap[id];if(!s)return;const field=(label,val)=>`<div><div class="modal-field-label">${label}</div><div class="modal-field-val">${val||'\u2014'}</div></div>`;document.getElementById('modal-body').innerHTML=`${field('Perihal',esc(s.perihal))}${field('Waktu Pelaksanaan',esc(fmtWaktu(s.tanggal_berangkat,s.tanggal_kembali)))}${field('Tujuan',esc(s.tujuan))}${field('Status',badgeHTML(s.status))}${field('Pegawai',(s.pegawai_list||[]).map(esc).join(', ')||'\u2014')}${s.pembebanan?field('POK',esc(s.pembebanan)):''}${s.nomor_surat?field('Nomor Surat',esc(s.nomor_surat)):''} ${s.tanggal_surat?field('Tanggal Surat',esc(s.tanggal_surat)):''}`;document.getElementById('detail-modal').style.display='flex';}
function closeDetailModal(){document.getElementById('detail-modal').style.display='none';}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeDetailModal();});
/* ═══════════════════════════════════════════════════════════════════
   BULK TAB — EXCEL-LIKE (xls-cell + arrow-nav + popup cal/ac)
   Di-port dari admin-surat-tugas.js, disesuaikan untuk input draft.
═══════════════════════════════════════════════════════════════════ */

// parseISODate, toISODate, todayISO, fmtTgl, BULAN_ABBR di-load global dari apa-shared.js
function normYear(y){
  y=parseInt(y,10); if(isNaN(y))return null;
  if(y<100){ y += (y<=30?2000:1900); }
  return y;
}
function parseFlexDate(input){
  if(!input)return null;
  input=String(input).trim().toLowerCase();
  // Numeric: d/m/y, d-m-y, d.m.y
  let m=input.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if(m){
    const d=+m[1],mo=+m[2],y=normYear(m[3]);
    if(y&&d>=1&&d<=31&&mo>=1&&mo<=12){
      const dt=new Date(y,mo-1,d);
      if(dt.getDate()===d)return toISODate(dt);
    }
  }
  // d mmm y (e.g. "2 jan 2026")
  m=input.match(/^(\d{1,2})\s+([a-zA-Z]{3,12})\.?\s+(\d{2,4})$/);
  if(m){
    const d=+m[1]; const mname=m[2].slice(0,3);
    const mo=BULAN_ABBR.indexOf(mname)+1;
    const y=normYear(m[3]);
    if(y&&mo>=1&&d>=1&&d<=31){
      const dt=new Date(y,mo-1,d);
      if(dt.getDate()===d)return toISODate(dt);
    }
  }
  return null;
}
function parseFlexRange(input){
  if(!input)return{mulai:null,selesai:null};
  const sep=input.match(/\s+(s\.d\.|sd|-{1,2}|sampai|to|\/\/)\s+/i);
  if(sep){
    const parts=input.split(sep[0]);
    return{mulai:parseFlexDate(parts[0]),selesai:parseFlexDate(parts[1])};
  }
  const single=parseFlexDate(input);
  return{mulai:single,selesai:null};
}

function autoGrow(el){
  if(!el||!el.style)return;
  el.style.height='auto';
  const h=el.scrollHeight;
  if(h>0)el.style.height=h+'px';
}

/* ══ CELL BUILDERS ══ */
function cellTextareaHTML(field,val,placeholder){
  return`<td class="col-${field==='perihal'?'perihal':field==='tujuan'?'tujuan':''}">
    <textarea class="xls-cell" rows="1" data-field="${field}" data-col-field="${field}"
      placeholder="${escAttr(placeholder)}">${esc(val||'')}</textarea>
  </td>`;
}

/* Single-line text input cell — dipakai untuk POK (pembebanan) yang
   biasanya kode pendek satu baris. */
function cellTextHTML(field,val,placeholder,colClass){
  return`<td class="col-${colClass||field}">
    <input type="text" class="xls-cell" data-field="${field}" data-col-field="${field}"
      value="${escAttr(val||'')}"
      placeholder="${escAttr(placeholder)}">
  </td>`;
}

function cellDateRangeHTML(field,isoMulai,isoSelesai,waktuTextCustom){
  const display=waktuTextCustom||(isoMulai?fmtWaktu(isoMulai,isoSelesai):'');
  return`<td class="col-waktu">
    <input type="text" class="xls-cell" data-field="${field}" data-col-field="${field}"
      data-iso-mulai="${escAttr(isoMulai||'')}"
      data-iso-selesai="${escAttr(isoSelesai||'')}"
      value="${escAttr(display)}"
      placeholder="tgl atau rentang"
      onblur="onRangeBlur(this)"
      onfocus="onDateFocus(this)"
      onclick="openCal(this, true)"
      ondblclick="openCal(this, true)"
      onkeydown="if(event.altKey&&event.key==='ArrowDown'){event.preventDefault();openCal(this,true);}">
  </td>`;
}



function cellPegawaiMultiHTML(field, nips, names) {
  nips = Array.isArray(nips) ? nips : [];
  names = Array.isArray(names) ? names : [];

  let contentHtml = '';
  if (!nips.length) {
    contentHtml = `<span class="apa-pg-placeholder">Pilih pegawai / mitra...</span>`;
  } else if (nips.length === 1) {
    const nama = names[0] || nips[0];
    contentHtml = `<span class="apa-pg-single-name" title="${esc(nama)}">${esc(nama)}</span>`;
  } else {
    contentHtml = `<span class="apa-pg-badge-terlampir" title="${esc(names.join(', '))}">
      <span class="icon">📎</span> Terlampir
      <span class="count-pill">${nips.length}</span>
    </span>`;
  }

  return `<td class="col-nama">
    <div class="pg-cell" data-field="${field}" data-col-field="${field}"
      data-nips='${escAttr(JSON.stringify(nips))}'
      data-names='${escAttr(JSON.stringify(names))}'
      onclick="openAc(this, false)">
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

/* ══ DATE INPUT BEHAVIOR ══ */
function onDateFocus(el){
  const mulai=el.dataset.isoMulai||'';
  if(mulai){
    const d=parseISODate(mulai);
    if(d)el.value=`${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
  }
  setTimeout(()=>el.select(),0);
}
function onRangeBlur(el){
  const cal=document.getElementById('cal-popup');
  if(cal&&cal.classList.contains('open'))return;
  const txt=el.value.trim();
  if(!txt){
    el.dataset.isoMulai='';
    el.dataset.isoSelesai='';
    el.value='';
    el.classList.remove('err');
    return;
  }
  // Jika teks sama persis dengan format terformat dari dataset saat ini, pertahankan
  if(el.dataset.isoMulai && txt===fmtWaktu(el.dataset.isoMulai,el.dataset.isoSelesai||'')){
    el.classList.remove('err');
    return;
  }
  const r=parseFlexRange(txt);
  if(r.mulai){
    el.dataset.isoMulai=r.mulai;
    el.dataset.isoSelesai=r.selesai||'';
    el.value=fmtWaktu(r.mulai,r.selesai);
    el.classList.remove('err');
  } else if(el.dataset.isoMulai){
    el.value=fmtWaktu(el.dataset.isoMulai,el.dataset.isoSelesai||'');
    el.classList.remove('err');
  } else {
    el.classList.add('err');
  }
}

/* ══ CALENDAR POPUP (Global apaCalendar bridge) ══ */
function openCal(el, isRange) {
  closeAc();
  if (window.apaCalendar) { window.apaCalendar.open(el, isRange); }
}
function closeCal() {
  if (window.apaCalendar) { window.apaCalendar.close(); }
}

/* ══ AUTOCOMPLETE PEGAWAI & MITRA (Global apaPegawai bridge) ══ */
var acState = { cellEl: null, isSingle: false };

function openAc(cellEl, isSingle) {
  closeCal();
  if (window.apaPegawai) {
    window.apaPegawai.open(cellEl, isSingle, () => {
      cellEl.classList.remove('err');
      snapshotDraft();
    });
  }
}
function closeAc() {
  if (window.apaPegawai) {
    window.apaPegawai.close();
  }
}

function closeAllPopups(){
  if (window.apaCalendar) window.apaCalendar.close();
  if (window.apaPegawai) window.apaPegawai.close();
}

/* ══ ARROW NAVIGATION GRID (Diinisialisasi via apa-grid-nav.js) ══ */
const NAV_FIELDS = ['perihal', 'waktu', 'tujuan', 'pegawai_multi', 'pembebanan', 'status'];

if (window.apaGridNav) {
  window.apaGridNav.init({
    rowSelector: '#bulk-tbody tr',
    fields: NAV_FIELDS,
    onClearCell: function(cellTarget, field, tr) {
      if (cellTarget.classList.contains('pg-cell')) {
        cellTarget.dataset.nips = '[]';
        cellTarget.dataset.names = '[]';
        delete cellTarget.dataset.nip;
        delete cellTarget.dataset.nama;
        if (window.apaPegawai) {
          window.apaPegawai.renderCell(cellTarget, [], []);
        }
        snapshotDraft();
      }
    },
    onOpenCell: function(cellTarget, field, tr) {
      if (cellTarget.classList.contains('pg-cell')) {
        openAc(cellTarget, false);
      }
    },
    onClosePopups: function() {
      closeAllPopups();
    },
    closeModals: function() {
      closeDetailModal();
    }
  });
}

/* ══ CLOSE POPUP saat klik di luar ══ */
document.addEventListener('click',(e)=>{
  const ac=document.getElementById('apa-pegawai-popup');
  if(ac&&ac.classList.contains('open')&&!ac.contains(e.target)){
    if(!e.target.closest('.pg-cell'))closeAc();
  }
  if(!e.target.closest('#bulk-tbody tr')){
    document.querySelectorAll('tr.row-focused').forEach(tr=>tr.classList.remove('row-focused'));
  }
});

/* ══ BULK ROW MANAGEMENT (DOM-first) ══ */
let rowIdCounter=0;

function renderRowHTML(id){
  return`<tr data-row-id="${id}">
    <td class="col-check"><input type="checkbox" class="bulk-check" onchange="onRowCheck(this)"></td>
    <td class="col-no">1</td>
    ${cellTextareaHTML('perihal','','Perihal surat tugas\u2026')}
    ${cellDateRangeHTML('waktu','','')}
    ${cellTextareaHTML('tujuan','','Kota / instansi')}
    ${cellPegawaiMultiHTML('pegawai_multi',[],[])}
    ${cellTextHTML('pembebanan','','cth: 054.01.GG\u2026','pok')}
    <td class="col-status"><div class="ro-text" tabindex="0" data-col-field="status">${badgeHTML('draft')}</div></td>
    <td class="col-aksi"><div class="action-buttons"><button class="btn-sm btn-send-row" type="button" onclick="submitSingleRow(this)">Kirim</button><button class="btn-sm danger delete-draft-row" type="button">Delete</button></div></td>
  </tr>`;
}
/* ════════════════════════════════════════════════════════════════════
   #8: DRAFT PERSIST — auto-save isi tabel "Minta Surat Tugas" ke
   localStorage tiap blur, restore saat halaman load.
   ─────────────────────────────────────────────────────────────────────
   Pattern: snapshot semua baris → JSON → localStorage.
   Key per-user supaya tidak bocor antar akun di browser yang sama.
   Cleanup: setelah submit sukses, draft di-clear.
   ════════════════════════════════════════════════════════════════════ */
function getDraftStorageKey(){
  let uid = 'anon';
  try {
    const s = (SESSION && SESSION.id) ? SESSION : JSON.parse(localStorage.getItem('apa_user') || 'null');
    if (s && s.id) uid = String(s.id);
  } catch(_) {}
  return `apa_st_draft_${uid}`;
}
function snapshotDraft(){
  // Snapshot setiap baris di #bulk-tbody.
  // Hanya ambil field user-input — abaikan rendering state (err class, dst).
  const rows=Array.from(document.querySelectorAll('#bulk-tbody tr[data-row-id]')).map(tr=>{
    const peg=tr.querySelector('.pg-cell[data-field="pegawai_multi"]');
    let nips=[],names=[];
    try{nips=JSON.parse(peg?.dataset.nips||'[]');}catch(_){}
    try{names=JSON.parse(peg?.dataset.names||'[]');}catch(_){}
    const waktu=tr.querySelector('input.xls-cell[data-field="waktu"]');
    const waktuCustom=waktu?.dataset.waktuTextCustom||(waktu?.value&&waktu.value.includes('&')?waktu.value:'');
    return{
      perihal:(tr.querySelector('textarea.xls-cell[data-field="perihal"]')?.value||''),
      tujuan:(tr.querySelector('textarea.xls-cell[data-field="tujuan"]')?.value||''),
      pembebanan:(tr.querySelector('input.xls-cell[data-field="pembebanan"]')?.value||''),
      waktuMulai:waktu?.dataset.isoMulai||'',
      waktuSelesai:waktu?.dataset.isoSelesai||'',
      waktuCustom,
      nips,names,
    };
  });
  // Filter row kosong total — tidak perlu disimpan.
  const filled=rows.filter(r=>r.perihal||r.tujuan||r.pembebanan||r.waktuMulai||r.waktuCustom||r.nips.length);
  try{
    if(filled.length){
      localStorage.setItem(getDraftStorageKey(),JSON.stringify({
        version:1,
        savedAt:Date.now(),
        rows:filled,
      }));
    } else {
      localStorage.removeItem(getDraftStorageKey());
    }
  }catch(e){
    // Quota exceeded atau localStorage di-disable — fail silently.
    console.warn('[Draft] gagal save:',e);
  }
}
function loadDraft(){
  try{
    const key = getDraftStorageKey();
    const raw = localStorage.getItem(key);
    if(!raw)return null;
    const obj=JSON.parse(raw);
    if(!obj||!Array.isArray(obj.rows)||!obj.rows.length)return null;
    return obj;
  }catch(_){return null;}
}
function clearDraft(){
  try{ const key = getDraftStorageKey(); localStorage.removeItem(key); }catch(_){}
}
/* Restore draft ke #bulk-tbody. Dipanggil di init() — setelah addRows(1)
   default (yang akan langsung di-replace kalau ada draft). */
function restoreDraft(){
  const draft=loadDraft();
  if(!draft)return;
  // Clear default row dari addRows(1) — kita rebuild dari draft.
  const tbody=document.getElementById('bulk-tbody');
  tbody.querySelectorAll('tr[data-row-id]').forEach(tr=>tr.remove());
  // Tambah row sesuai jumlah draft.
  addRows(draft.rows.length);
  // Isi setiap row dari snapshot.
  const trs=Array.from(document.querySelectorAll('#bulk-tbody tr[data-row-id]'));
  draft.rows.forEach((r,i)=>{
    const tr=trs[i];if(!tr)return;
    const perihalEl=tr.querySelector('textarea.xls-cell[data-field="perihal"]');
    const tujuanEl=tr.querySelector('textarea.xls-cell[data-field="tujuan"]');
    const waktuEl=tr.querySelector('input.xls-cell[data-field="waktu"]');
    const pokEl=tr.querySelector('input.xls-cell[data-field="pembebanan"]');
    const pegCell=tr.querySelector('.pg-cell[data-field="pegawai_multi"]');
    
    if(perihalEl){perihalEl.value=r.perihal||'';autoGrow(perihalEl);}
    if(tujuanEl){tujuanEl.value=r.tujuan||'';autoGrow(tujuanEl);}
    if(pokEl)pokEl.value=r.pembebanan||'';
    if(waktuEl){
      waktuEl.dataset.isoMulai=r.waktuMulai||'';
      waktuEl.dataset.isoSelesai=r.waktuSelesai||'';
      if(r.waktuCustom)waktuEl.dataset.waktuTextCustom=r.waktuCustom;
      waktuEl.value=r.waktuCustom||(r.waktuMulai?fmtWaktu(r.waktuMulai,r.waktuSelesai):'');
    }
    if(pegCell&&Array.isArray(r.nips)&&r.nips.length){
      if(window.apaPegawai){
        window.apaPegawai.renderCell(pegCell, r.nips, r.names||[]);
      } else {
        pegCell.dataset.nips=JSON.stringify(r.nips);
        pegCell.dataset.names=JSON.stringify(r.names||[]);
      }
    }
  });
  reNumberRows();
  updateBulkCounters();
  // Tampilkan info ke user supaya tahu draft di-restore
  showBulkAlert(`📝 Draft ${draft.rows.length} baris dimuat dari sesi terakhir. Klik kosongkan jika tidak diperlukan.`,'info');
}
/* Wire blur listener untuk auto-save draft di setiap field input.
   Dipanggil di addRows() untuk row baru. */
function wireDraftListeners(tr){
  const fields=tr.querySelectorAll('textarea.xls-cell, input.xls-cell');
  fields.forEach(el=>{
    el.addEventListener('blur',snapshotDraft);
  });
  // Pegawai multi-tag: snapshot saat tag berubah (lewat MutationObserver
  // sederhana karena tag di-add/remove via JS, bukan input event).
  const pegCell=tr.querySelector('.pg-cell[data-field="pegawai_multi"]');
  if(pegCell){
    const obs=new MutationObserver(()=>snapshotDraft());
    obs.observe(pegCell,{attributes:true,attributeFilter:['data-nips']});
    tr._pgObserver=obs;
  }
}

function addRows(n){
  const tbody=document.getElementById('bulk-tbody');
  for(let i=0;i<n;i++){
    rowIdCounter++;
    tbody.insertAdjacentHTML('afterbegin',renderRowHTML(rowIdCounter));
  }
  // Wire up listeners untuk baris baru
  tbody.querySelectorAll('tr[data-row-id]:not([data-wired])').forEach(tr=>{
    tr.dataset.wired='1';
    const delBtn=tr.querySelector('.delete-draft-row');
    if(delBtn)delBtn.addEventListener('click',()=>{deleteRow(tr);snapshotDraft();});
    tr.querySelectorAll('textarea.xls-cell').forEach(ta=>{
      autoGrow(ta);
      ta.addEventListener('input',()=>{autoGrow(ta);ta.classList.remove('err');});
      ta.addEventListener('paste',handlePaste);
    });
    tr.querySelectorAll('input.xls-cell').forEach(inp=>{
      inp.addEventListener('input',()=>inp.classList.remove('err'));
    });
    // #8: wire draft listeners — auto-save tiap blur
    wireDraftListeners(tr);
  });
  reNumberRows();
  updateBulkCounters();
  setupBulkTopScrollbar();
}
function deleteRow(tr){
  if(!tr)return;
  if(tr._pgObserver){tr._pgObserver.disconnect();tr._pgObserver=null;}
  closeAllPopups();
  tr.remove();
  reNumberRows();
  syncCheckAll();
  updateBulkCounters();
  setupBulkTopScrollbar();
}
function deleteChecked(){
  const checked=Array.from(document.querySelectorAll('#bulk-tbody tr[data-row-id] .bulk-check:checked'));
  if(!checked.length)return;
  if(!confirm(`Hapus ${checked.length} baris yang dipilih?`))return;
  checked.forEach(chk=>{const tr=chk.closest('tr');if(tr)tr.remove();});
  reNumberRows();
  syncCheckAll();
  updateBulkCounters();
}
function onRowCheck(chk){
  const tr=chk.closest('tr');
  if(tr)tr.classList.toggle('checked',chk.checked);
  syncCheckAll();
  updateBulkCounters();
}
function toggleCheckAll(checked){
  document.querySelectorAll('#bulk-tbody tr[data-row-id]').forEach(tr=>{
    const chk=tr.querySelector('.bulk-check');
    if(chk)chk.checked=checked;
    tr.classList.toggle('checked',checked);
  });
  updateBulkCounters();
}
function syncCheckAll(){
  const trs=document.querySelectorAll('#bulk-tbody tr[data-row-id]');
  const checkedCount=document.querySelectorAll('#bulk-tbody tr[data-row-id] .bulk-check:checked').length;
  const ca=document.getElementById('check-all');
  if(!ca)return;
  ca.checked=trs.length>0&&checkedCount===trs.length;
  ca.indeterminate=checkedCount>0&&checkedCount<trs.length;
}
function updateBulkCounters(){
  const total=document.querySelectorAll('#bulk-tbody tr[data-row-id]').length;
  const checked=document.querySelectorAll('#bulk-tbody tr[data-row-id] .bulk-check:checked').length;
  const pill=document.getElementById('selected-pill');
  pill.textContent=`${checked} dipilih`;
  pill.className='selected-pill'+(checked===0?' zero':'');
  document.getElementById('ab-checked').textContent=checked;
  document.getElementById('ab-total').textContent=total;
  const btn=document.getElementById('btn-send');
  btn.disabled=checked===0;
  document.getElementById('btn-send-text').textContent=`Kirim yang Dipilih (${checked})`;
  const delChecked=document.getElementById('btn-del-checked');
  if(delChecked)delChecked.style.display=checked>0?'':'none';
  document.getElementById('row-count-label').textContent=`${total} baris draft`;
  document.getElementById('tc-bulk').textContent=total;
}
function reNumberRows(){
  const rows=document.querySelectorAll('#bulk-tbody tr[data-row-id]');
  const total=rows.length;
  const base=allSurat.length;
  rows.forEach((tr,i)=>{
    const td=tr.querySelector('td.col-no');
    if(td)td.textContent=base+total-i;
  });
}
function clearAll(){
  const total=document.querySelectorAll('#bulk-tbody tr[data-row-id]').length;
  if(!total)return;
  if(!confirm('Kosongkan semua baris?'))return;
  closeAllPopups();
  document.querySelectorAll('#bulk-tbody tr[data-row-id]').forEach(tr=>tr.remove());
  const ca=document.getElementById('check-all');
  if(ca){ca.checked=false;ca.indeterminate=false;}
  updateBulkCounters();
  // #8: clear draft localStorage juga supaya tidak restore lagi saat refresh.
  clearDraft();
}

/* ══ PASTE dari Excel (tab-separated) ══ */
function handlePaste(e){
  const text=e.clipboardData?.getData('text')||'';
  if(!text.includes('\t')&&!text.includes('\n'))return;
  e.preventDefault();
  const lines=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(l=>l.trim());
  const startTa=e.target;
  const startTr=startTa.closest('tr');
  if(!startTr)return;
  const allTrs=Array.from(document.querySelectorAll('#bulk-tbody tr[data-row-id]'));
  const startIdx=allTrs.indexOf(startTr);

  lines.forEach((line,li)=>{
    const cells=line.split('\t');
    let tr=allTrs[startIdx+li];
    if(!tr){
      addRows(1);
      // addRows(1) menyisipkan baris baru di bagian atas (#bulk-tbody afterbegin)
      const refreshed=Array.from(document.querySelectorAll('#bulk-tbody tr[data-row-id]'));
      tr=refreshed[0];
      if(tr)allTrs.push(tr);
    }
    // Mapping kolom: [perihal, waktu-text, tujuan, POK]
    // (pegawai sengaja di-skip karena multi-tag UI tidak bisa di-paste plain text)
    const perihalEl=tr.querySelector('textarea.xls-cell[data-field="perihal"]');
    const waktuEl=tr.querySelector('input.xls-cell[data-field="waktu"]');
    const tujuanEl=tr.querySelector('textarea.xls-cell[data-field="tujuan"]');
    const pokEl=tr.querySelector('input.xls-cell[data-field="pembebanan"]');
    if(perihalEl&&cells[0]!==undefined){
      perihalEl.value=cells[0].trim();
      autoGrow(perihalEl);
    }
    if(waktuEl&&cells[1]!==undefined){
      const t=cells[1].trim();
      const r=parseFlexRange(t);
      if(r.mulai){
        waktuEl.dataset.isoMulai=r.mulai;
        waktuEl.dataset.isoSelesai=r.selesai||'';
        waktuEl.value=fmtWaktu(r.mulai,r.selesai);
        waktuEl.classList.remove('err');
      } else if(t){
        waktuEl.value=t;
        waktuEl.classList.add('err');
      }
    }
    if(tujuanEl&&cells[2]!==undefined){
      tujuanEl.value=cells[2].trim();
      autoGrow(tujuanEl);
    }
    if(pokEl&&cells[3]!==undefined){
      pokEl.value=cells[3].trim();
    }
  });
  reNumberRows();
  updateBulkCounters();
}

/* ══ COLLECT / VALIDATE / SUBMIT ══ */
function collectRow(tr){
  const perihalEl=tr.querySelector('textarea.xls-cell[data-field="perihal"]');
  const tujuanEl=tr.querySelector('textarea.xls-cell[data-field="tujuan"]');
  const waktuEl=tr.querySelector('input.xls-cell[data-field="waktu"]');
  const pokEl=tr.querySelector('input.xls-cell[data-field="pembebanan"]');
  const pegCell=tr.querySelector('.pg-cell[data-field="pegawai_multi"]');
  const waktuTextCustom=waktuEl?(waktuEl.dataset.waktuTextCustom||(waktuEl.value&&waktuEl.value.includes('&')?waktuEl.value.trim():'')):'';
  let nips=[],names=[];
  try{nips=JSON.parse(pegCell?.dataset.nips||'[]');}catch(_){}
  try{names=JSON.parse(pegCell?.dataset.names||'[]');}catch(_){}
  return{
    tr,
    perihal:(perihalEl?.value||'').trim(),
    tujuan:(tujuanEl?.value||'').trim(),
    pembebanan:(pokEl?.value||'').trim(),
    waktuMulai:waktuEl?.dataset.isoMulai||'',
    waktuSelesai:waktuEl?.dataset.isoSelesai||'',
    waktuTextCustom,
    waktuEl,perihalEl,tujuanEl,pokEl,pegCell,
    nips,names
  };
}
function validateRow(data){
  const errs=[];
  // Reset error visual
  [data.perihalEl,data.tujuanEl,data.waktuEl].forEach(el=>el?.classList.remove('err'));
  data.pegCell?.classList.remove('err');
  if(!data.perihal){errs.push('Perihal wajib diisi');data.perihalEl?.classList.add('err');}
  if(!data.waktuMulai){errs.push('Tanggal wajib diisi');data.waktuEl?.classList.add('err');}
  if(data.waktuSelesai&&data.waktuMulai&&data.waktuSelesai<data.waktuMulai){
    errs.push('Tgl. selesai lebih awal dari mulai');data.waktuEl?.classList.add('err');
  }
  // tujuan OPSIONAL — kalau kosong, di template fallback ke
  // "{perihal} pada tanggal {waktu_pelaksanaan}" via {untuk_text}.
  if(!data.nips.length){errs.push('Pilih minimal satu pegawai');data.pegCell?.classList.add('err');}
  data.tr.classList.toggle('has-error',errs.length>0);
  return errs;
}
function submitSingleRow(btn){
  const tr=btn?.closest('tr[data-row-id]');
  if(!tr)return;
  document.querySelectorAll('#bulk-tbody tr[data-row-id] .bulk-check').forEach(chk=>{
    chk.checked=false;
    chk.closest('tr')?.classList.remove('checked');
  });
  const chk=tr.querySelector('.bulk-check');
  if(chk){chk.checked=true;onRowCheck(chk);}
  submitChecked();
}
async function submitChecked(){
  const checkedTrs=Array.from(document.querySelectorAll('#bulk-tbody tr[data-row-id]'))
    .filter(tr=>tr.querySelector('.bulk-check')?.checked);
  if(!checkedTrs.length)return;

  document.getElementById('bulk-alert').className='alert';
  const datas=checkedTrs.map(collectRow);
  let allErrs=[];
  datas.forEach(d=>{const e=validateRow(d);if(e.length)allErrs.push(...e);});
  if(allErrs.length){
    const uniq=[...new Set(allErrs)];
    showBulkAlert('Periksa kembali: '+uniq.join('; '),'error');
    return;
  }

  const payloads=datas.map(d=>({
    user_id:SESSION.id,
    perihal:d.perihal,
    tanggal_berangkat:d.waktuMulai,
    tanggal_kembali:(d.waktuSelesai&&d.waktuSelesai!==d.waktuMulai)?d.waktuSelesai:null,
    tujuan:d.tujuan,
    pegawai_nip:d.nips,
    pegawai_list:d.names,
    pembebanan:d.pembebanan||null,
    waktu_pelaksanaan_text:d.waktuTextCustom||null,
    status:'menunggu',
    created_at:new Date().toISOString()
  }));

  const btn=document.getElementById('btn-send');
  btn.disabled=true; btn.classList.add('loading');
  try{
    const res=await fetch(`${SUPABASE_URL}/rest/v1/surat_tugas`,{
      method:'POST',
      headers:{...H,'Prefer':'return=minimal'},
      body:JSON.stringify(payloads)
    });
    if(!res.ok){
      const err=await res.json().catch(()=>({}));
      throw new Error(err.message||`HTTP ${res.status}`);
    }
    datas.forEach(d=>d.tr.remove());
    reNumberRows(); syncCheckAll(); updateBulkCounters();
    showBulkAlert(`\u2705 ${datas.length} surat tugas berhasil dikirim.`,'success');
    // #8: snapshot ulang setelah row submitted di-remove. Kalau masih ada
    // row tersisa (yang tidak di-checked), draft tetap tersimpan.
    snapshotDraft();
    await loadSurat();
  } catch(e){
    showBulkAlert(`Gagal mengirim: ${e.message}.`,'error');
  } finally {
    btn.disabled=false; btn.classList.remove('loading'); updateBulkCounters();
  }
}
function showBulkAlert(msg,type='error'){
  // Map 'info' type ke icon ℹ️ — selain dari sukses & error.
  const iconMap={success:'\u2705',error:'\u26a0\ufe0f',info:'\u2139\ufe0f'};
  document.getElementById('bulk-alert-icon').textContent=iconMap[type]||iconMap.error;
  document.getElementById('bulk-alert-text').textContent=msg;
  document.getElementById('bulk-alert').className=`alert ${type} show`;
  document.getElementById('bulk-alert').scrollIntoView({behavior:'smooth',block:'nearest'});
}

async function init(){
  if (window.APA_AUTH && window.APA_AUTH.ready) {
    const authSession = await window.APA_AUTH.ready;
    if (!authSession) { window.location.replace('login.html'); return; }
  }
  SESSION = apaCheckSession({ requireAdmin: false });
  if(!SESSION)return;
  if (window.APATopbar && typeof window.APATopbar.renderUser === 'function') window.APATopbar.renderUser(SESSION);
  if (window.APASidebar && typeof window.APASidebar.renderUser === 'function') window.APASidebar.renderUser(SESSION);
  
  // #7: Restore tab terakhir yang user buka sebelum refresh.
  // Dipanggil sebelum loadSurat() supaya UI panel langsung tampil benar.
  restoreActiveTab();
  await loadSurat();
  addRows(1);
  // #8: Restore draft (kalau ada) — di-call SETELAH addRows(1) default
  // supaya struktur tabel sudah ada. restoreDraft() akan replace baris
  // default kalau ada draft tersimpan.
  restoreDraft();
}
init();
