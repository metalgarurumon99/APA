const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'Referensi Code', 'admin-surat-tugas.html');
const destPath = path.join(__dirname, '..', 'surat-tugas.html');

let html = fs.readFileSync(srcPath, 'utf8');

// Update Title & Favicon
html = html.replace(/<title>.*?<\/title>/, '<title>Surat Tugas - Sistem Automasi Pekerjaan Administrasi (APA)</title>');
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

// Fix CSS for APA layout:
// In admin-surat-tugas.html, .layout & .sidebar were used for the local 9201 sidebar.
// In APA, topbar is fixed/mounted by topbar.js and sidebar by sidebar.js.
// We make sure .main-content has all styles of .main, and body has appropriate font and background.
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

// Replace body layout markup:
// Replace <div id="topbar-mount"></div>\n<div class="layout">\n  <aside class="sidebar"[^>]*><\/aside>\n  <main class="main">
// with <div class="app-shell">\n  <main class="main-content">
html = html.replace(
  /<div id="topbar-mount"><\/div>\s*<div class="layout">\s*<aside class="sidebar"[^>]*><\/aside>\s*<main class="main">/s,
  '<div class="app-shell">\n  <main class="main-content">'
);

// Replace closing </main>\n</div> before popups
html = html.replace(
  /<\/main>\s*<\/div>\s*<!-- ══+ POPUPS/s,
  '</main>\n</div>\n\n<!-- ═══════════════════════════════════════════════════════════\n     POPUPS'
);

// Remove duplicate script tags that are handled by APA (9201-topbar, 9201-sidebar, 9201-avatar, etc.)
// but retain config.js and 9201-shared.js
html = html.replace(/<script src="9201-avatar\.js"><\/script>/g, '');
html = html.replace(/<script src="9201-topbar\.js"><\/script>/g, '');
html = html.replace(/<script src="9201-sidebar\.js"><\/script>/g, '');
html = html.replace(/<script src="9201-role-switcher\.js"><\/script>/g, '');
html = html.replace(/<script src="9201-notifikasi\.js"><\/script>/g, '');

fs.writeFileSync(destPath, html, 'utf8');
console.log('Successfully written surat-tugas.html, length:', html.length);
