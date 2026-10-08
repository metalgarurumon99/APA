const fs = require('fs');

const b64 = JSON.parse(fs.readFileSync('Assets/templates/templates_base64.json', 'utf8'));

let template = fs.readFileSync('scripts/surat-tugas-helper.raw.js', 'utf8');
template = template.replace('/*__TEMPLATES_BASE64__*/', JSON.stringify(b64));

fs.writeFileSync('surat-tugas-helper.js', template);
console.log('surat-tugas-helper.js successfully built! Size:', fs.statSync('surat-tugas-helper.js').size);
