const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'Referensi Code', 'admin-surat-tugas.js');
const destPath = path.join(__dirname, '..', 'admin-surat-tugas.js');

let code = fs.readFileSync(srcPath, 'utf8');

// Replace template URLs to point to local Assets/templates/
code = code.replace(
  /const TEMPLATE_URL_T2\s*=\s*'[^']+';/,
  "const TEMPLATE_URL_T2  = 'Assets/templates/template-surat-tugas-lampiran.docx';"
);
code = code.replace(
  /const TEMPLATE_URL_T1V\s*=\s*'[^']+';/,
  "const TEMPLATE_URL_T1V = 'Assets/templates/template-surat-tugas-spd-visum-kendaraan-menginap.docx';"
);
code = code.replace(
  /const TEMPLATE_URL_T3V\s*=\s*'[^']+';/,
  "const TEMPLATE_URL_T3V = 'Assets/templates/template-surat-tugas-lampiran-spd-visum-kendaraan-menginap.docx';"
);

// Enhance loadTemplateBuffer with fallback to Supabase storage if needed
const oldLoadBuffer = `  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      \`Gagal memuat template untuk tipe "\${tipe}" (HTTP \${res.status}). \` +
      \`Pastikan file \${url} ada di Supabase Storage dan bisa diakses publik.\`
    );
  }`;

const newLoadBuffer = `  let res = await fetch(url).catch(() => null);
  if (!res || !res.ok) {
    const filename = url.split('/').pop();
    const fallbackUrl = \`\${SUPABASE_URL}/storage/v1/object/public/template/\${filename}\`;
    console.log('[9201] Mencoba fallback template ke Supabase Storage:', fallbackUrl);
    res = await fetch(fallbackUrl).catch(() => null);
  }
  if (!res || !res.ok) {
    throw new Error(
      \`Gagal memuat template untuk tipe "\${tipe}" (HTTP \${res ? res.status : 'ERR'}). \` +
      \`Pastikan file template ada di Assets/templates/ atau bucket template Supabase Storage.\`
    );
  }`;

if (code.includes('const res = await fetch(url);')) {
  code = code.replace(oldLoadBuffer, newLoadBuffer);
}

fs.writeFileSync(destPath, code, 'utf8');
console.log('Successfully written admin-surat-tugas.js, length:', code.length);
