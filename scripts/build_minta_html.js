const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'Referensi Code', 'surat-tugas.html');
const destPath = path.join(__dirname, '..', 'minta-surat-tugas.html');

let html = fs.readFileSync(srcPath, 'utf8');

// Update Title & Favicon
html = html.replace(/<title>.*?<\/title>/, '<title>Minta Surat Tugas - Sistem Automasi Pekerjaan Administrasi (APA)</title>');
html = html.replace(/<link rel="icon"[^>]+>/, '<link rel="icon" type="image/svg+xml" href="Assets/ART logo.svg">');

// Inject APA topbar and sidebar stylesheets and scripts
const apaHeadScripts = `
  <!-- Supabase JS Client & Global Config -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="supabase-config.js"></script>

  <!-- APA Global Components: Topbar & Sidebar -->
  <link rel="stylesheet" href="topbar.css">
  <script src="topbar.js"></script>
  <link rel="stylesheet" href="sidebar.css">
  <script src="sidebar.js"></script>
`;

html = html.replace('</head>', `${apaHeadScripts}\n</head>`);

// Fix CSS for APA layout
const layoutCssFix = `
  /* Integrasi layout APA Shell */
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .app-shell {
    display: flex;
    min-height: 100vh;
  }
  .main-content {
    margin-left: 264px;
    flex: 1;
    min-height: 100vh;
    padding: 32px 36px 80px;
    max-width: calc(100vw - 264px);
    overflow-x: hidden;
    transition: margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  body.sidebar-hidden .main-content {
    margin-left: 0 !important;
    max-width: 100vw !important;
    padding-left: max(5%, 72px) !important;
  }
`;

html = html.replace('</style>', `${layoutCssFix}\n</style>`);

// Replace body layout markup
html = html.replace(
  /<div id="topbar-mount"><\/div>\s*<div class="layout">\s*<aside class="sidebar"[^>]*><\/aside>\s*<main class="main">/s,
  '<div class="app-shell">\n  <main class="main-content">'
);

// Replace closing </main>\n</div> before popups
html = html.replace(
  /<\/main>\s*<\/div>\s*<!-- Calendar popup/s,
  '</main>\n</div>\n\n<!-- Calendar popup'
);

// Move the stats-row to be right under page-header, above tabs, so it's always visible in both tabs!
const statsRowHtml = `
    <div class="stats-row fade-in" style="animation-delay:.08s;margin-bottom:20px">
      <div class="stat-pill"><div class="stat-pill-icon" style="background:#e8f0fe">📋</div><div><div class="stat-pill-num" id="st-total">—</div><div class="stat-pill-label">Total</div></div></div>
      <div class="stat-pill"><div class="stat-pill-icon" style="background:#fef3c7">⏳</div><div><div class="stat-pill-num" id="st-menunggu">—</div><div class="stat-pill-label">Menunggu</div></div></div>
      <div class="stat-pill"><div class="stat-pill-icon" style="background:#ecfdf5">✅</div><div><div class="stat-pill-num" id="st-selesai">—</div><div class="stat-pill-label">Selesai</div></div></div>
    </div>
`;

// Remove stats-row inside panel-list
html = html.replace(
  /<div class="stats-row fade-in" style="animation-delay:\.1s">.*?<\/div>\s*<\/div>\s*<div class="filter-bar">/s,
  '<div class="filter-bar">'
);

// Insert stats-row above tabs and make tabs visible
html = html.replace(
  /<div class="tabs fade-in" style="display:none;animation-delay:\.05s">/,
  `${statsRowHtml}\n    <div class="tabs fade-in" style="display:flex;margin-bottom:24px;animation-delay:.05s">`
);

// Replace loadPegawai with robust select=*
html = html.replace(
  /async function loadPegawai\(\)\{[^}]+\}/,
  `async function loadPegawai(){try{const res=await fetch(\`\${SUPABASE_URL}/rest/v1/data_pegawai?select=*&order=nama.asc\`,{headers:H});if(!res.ok)throw new Error();allPegawai=await res.json();}catch(e){console.error('Gagal load pegawai',e);}}`
);

// Replace loadSurat with robust session filter & filterTable call
html = html.replace(
  /async function loadSurat\(\)\{[^}]+\}/,
  `async function loadSurat(){try{let url=\`\${SUPABASE_URL}/rest/v1/surat_tugas?order=created_at.asc\`;if(SESSION&&SESSION.id&&SESSION.role!=='admin'){url=\`\${SUPABASE_URL}/rest/v1/surat_tugas?user_id=eq.\${encodeURIComponent(SESSION.id)}&order=created_at.asc\`;}let res=await fetch(url,{headers:H});if(!res.ok){res=await fetch(\`\${SUPABASE_URL}/rest/v1/surat_tugas?order=created_at.asc\`,{headers:H});}if(!res.ok)throw new Error();const ascList=await res.json();suratOrderMap={};ascList.forEach((s,i)=>{suratOrderMap[s.id]=i+1;});allSurat=ascList.slice().reverse();updateStats();renderSubmittedRows();filterTable();const tcList=document.getElementById('tc-list');if(tcList)tcList.textContent=allSurat.length;}catch(e){showBulkAlert('Gagal memuat riwayat surat tugas.','error');}}`
);

// Remove duplicate portal 9201 scripts
html = html.replace(/<script src="9201-avatar\.js"><\/script>/g, '');
html = html.replace(/<script src="9201-topbar\.js"><\/script>/g, '');
html = html.replace(/<script src="9201-sidebar\.js"><\/script>/g, '');
html = html.replace(/<script src="9201-role-switcher\.js"><\/script>/g, '');

fs.writeFileSync(destPath, html, 'utf8');
console.log('Successfully written updated minta-surat-tugas.html, length:', html.length);
