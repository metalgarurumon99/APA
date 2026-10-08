const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function escapeXml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:color w:val="000000"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="276" w:lineRule="auto" w:after="120"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`;

function makeDocXmlTunggal() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <!-- KOP SURAT -->
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>BADAN PUSAT STATISTIK KABUPATEN RAJA AMPAT</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="160"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="555555"/></w:rPr><w:t>Jalan Poros Waisai-Warsambin, Distrik Kota Waisai, Raja Ampat - Papua Barat Daya</w:t></w:r>
    </w:p>

    <!-- JUDUL SURAT -->
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="26"/></w:rPr><w:t>SURAT TUGAS</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>Nomor: {nomor_surat}</w:t></w:r>
    </w:p>

    <!-- MENIMBANG -->
    <w:p>
      <w:pPr><w:spacing w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Menimbang : </w:t></w:r>
      <w:r><w:t>{menimbang}</w:t></w:r>
    </w:p>

    <!-- MEMBERI TUGAS -->
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>MEMBERI TUGAS :</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="360"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Kepada :</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="40"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>Nama      : </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>{nama}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="40"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>NIP       : {nip}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="40"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>Pangkat   : {pangkat}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="160"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>Jabatan   : {jabatan}</w:t></w:r>
    </w:p>

    <!-- UNTUK -->
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="360"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Untuk :</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>1. Melaksanakan {perihal} di {tempat_tujuan}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>2. Waktu pelaksanaan kegiatan: {waktu_pelaksanaan} (selama {hari} hari).</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>3. Pembebanan anggaran dibebankan pada DIPA BPS Kabupaten Raja Ampat Tahun Anggaran {tahun} dengan MAK {mak_pembebanan}.</w:t></w:r>
    </w:p>

    <!-- SECTION KENDARAAN -->
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>{#kendaraan}4. Sarana alat transportasi/angkutan: {angkutan}.{/kendaraan}</w:t></w:r>
    </w:p>

    <!-- SECTION MENGINAP -->
    <w:p>
      <w:pPr><w:spacing w:after="160"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>{#menginap}5. Selama pelaksanaan tugas diberikan fasilitas penginapan/akomodasi sesuai dengan ketentuan yang berlaku.{/menginap}</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:spacing w:before="120" w:after="240"/></w:pPr>
      <w:r><w:t>Demikian Surat Tugas ini dibuat untuk dilaksanakan dengan sebaik-baiknya dan penuh rasa tanggung jawab.</w:t></w:r>
    </w:p>

    <!-- TANDA TANGAN -->
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:t>Waisai, {tgl_surat}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:after="720"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{jabatan_penandatangan},</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>{penandatangan}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:after="120"/></w:pPr>
      <w:r><w:t>NIP. {nip_penandatangan}</w:t></w:r>
    </w:p>

    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function makeDocXmlLampiran() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <!-- KOP SURAT -->
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>BADAN PUSAT STATISTIK KABUPATEN RAJA AMPAT</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="160"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="555555"/></w:rPr><w:t>Jalan Poros Waisai-Warsambin, Distrik Kota Waisai, Raja Ampat - Papua Barat Daya</w:t></w:r>
    </w:p>

    <!-- JUDUL SURAT -->
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="26"/></w:rPr><w:t>SURAT TUGAS</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>Nomor: {nomor_surat}</w:t></w:r>
    </w:p>

    <!-- MENIMBANG -->
    <w:p>
      <w:pPr><w:spacing w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Menimbang : </w:t></w:r>
      <w:r><w:t>{menimbang}</w:t></w:r>
    </w:p>

    <!-- MEMBERI TUGAS -->
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>MEMBERI TUGAS :</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="360"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Kepada :</w:t></w:r>
      <w:r><w:t> Pegawai / Petugas yang namanya tercantum dalam Lampiran Surat Tugas ini.</w:t></w:r>
    </w:p>

    <!-- UNTUK -->
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="360"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Untuk :</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>1. Melaksanakan {perihal} di {tempat_tujuan}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>2. Waktu pelaksanaan kegiatan: {waktu_pelaksanaan} (selama {hari} hari kerja).</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>3. Pembebanan anggaran dibebankan pada DIPA BPS Kabupaten Raja Ampat Tahun {tahun} MAK {mak_pembebanan}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>{#kendaraan}4. Alat Angkutan / Kendaraan: {angkutan}.{/kendaraan}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="160"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>{#menginap}5. Petugas diberikan akomodasi penginapan selama bertugas.{/menginap}</w:t></w:r>
    </w:p>

    <!-- TANDA TANGAN -->
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:before="160" w:after="40"/></w:pPr>
      <w:r><w:t>Waisai, {tgl_surat}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:after="720"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{jabatan_penandatangan},</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>{penandatangan}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:after="240"/></w:pPr>
      <w:r><w:t>NIP. {nip_penandatangan}</w:t></w:r>
    </w:p>

    <!-- PAGE BREAK UNTUK LAMPIRAN -->
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>

    <!-- JUDUL LAMPIRAN -->
    <w:p>
      <w:pPr><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>LAMPIRAN SURAT TUGAS</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="40"/></w:pPr>
      <w:r><w:t>Nomor : {nomor_surat}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="240"/></w:pPr>
      <w:r><w:t>Tanggal : {tgl_surat}</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>DAFTAR PEGAWAI / PETUGAS YANG DITUGASKAN</w:t></w:r>
    </w:p>

    <!-- LIST PEGAWAI UL -->
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="360"/></w:pPr>
      <w:r><w:t>{#ul}{no}. {nama} (NIP: {nip}) - {jabatan} | Bertugas Sebagai: {bertugas_sebagai}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>   Pangkat/Golongan: {pangkat}{/ul}</w:t></w:r>
    </w:p>

    <!-- TANDA TANGAN LAMPIRAN -->
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:before="360" w:after="40"/></w:pPr>
      <w:r><w:t>Waisai, {tgl_surat}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:after="720"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{jabatan_penandatangan},</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>{penandatangan}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:after="120"/></w:pPr>
      <w:r><w:t>NIP. {nip_penandatangan}</w:t></w:r>
    </w:p>

    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function makeDocXmlSpd() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <!-- HALAMAN 1: SURAT TUGAS -->
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>BADAN PUSAT STATISTIK KABUPATEN RAJA AMPAT</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="160"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="555555"/></w:rPr><w:t>Jalan Poros Waisai-Warsambin, Distrik Kota Waisai, Raja Ampat - Papua Barat Daya</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="26"/></w:rPr><w:t>SURAT TUGAS</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>Nomor: {nomor_surat}</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:spacing w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Menimbang : </w:t></w:r>
      <w:r><w:t>{menimbang}</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>MEMBERI TUGAS :</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="360"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Kepada : </w:t></w:r><w:r><w:t>{nama} (NIP: {nip}) - {jabatan}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="360"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Untuk :</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>1. {perihal} di {tempat_tujuan}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>2. Waktu pelaksanaan: {waktu_pelaksanaan} ({hari} hari).</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>3. Pembebanan Anggaran: MAK {mak_pembebanan}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>{#kendaraan}4. Alat Transportasi: {angkutan}.{/kendaraan}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="160"/><w:ind w:left="720"/></w:pPr>
      <w:r><w:t>{#menginap}5. Dilengkapi penginapan/akomodasi resmi.{/menginap}</w:t></w:r>
    </w:p>

    <!-- TTD ST -->
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:before="160" w:after="40"/></w:pPr>
      <w:r><w:t>Waisai, {tgl_surat}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:after="720"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{jabatan_penandatangan},</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>{penandatangan}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:after="240"/></w:pPr>
      <w:r><w:t>NIP. {nip_penandatangan}</w:t></w:r>
    </w:p>

    <!-- HALAMAN 2: SURAT PERJALANAN DINAS (SPD) -->
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>BADAN PUSAT STATISTIK KABUPATEN RAJA AMPAT</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="24"/></w:rPr><w:t>SURAT PERJALANAN DINAS (SPD)</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>
      <w:r><w:t>Nomor: {nomor_spd}</w:t></w:r>
    </w:p>

    <w:p><w:r><w:t>1. Pejabat Pembuat Komitmen: {nama_ppk} (NIP. {nip_ppk})</w:t></w:r></w:p>
    <w:p><w:r><w:t>2. Pegawai yang diperintahkan: {nama} (NIP. {nip})</w:t></w:r></w:p>
    <w:p><w:r><w:t>3. a. Pangkat dan Golongan: {pangkat}</w:t></w:r></w:p>
    <w:p><w:r><w:t>   b. Jabatan / Instansi: {jabatan}</w:t></w:r></w:p>
    <w:p><w:r><w:t>4. Maksud Perjalanan Dinas: {perihal}</w:t></w:r></w:p>
    <w:p><w:r><w:t>5. Alat angkut yang dipergunakan: {angkutan}</w:t></w:r></w:p>
    <w:p><w:r><w:t>6. a. Tempat Berangkat: Waisai, Kab. Raja Ampat</w:t></w:r></w:p>
    <w:p><w:r><w:t>   b. Tempat Tujuan: {tempat_tujuan}</w:t></w:r></w:p>
    <w:p><w:r><w:t>7. Lamanya Perjalanan Dinas: {hari} hari ({waktu_pelaksanaan})</w:t></w:r></w:p>
    <w:p><w:r><w:t>8. Pembebanan Anggaran: MAK {mak_pembebanan}</w:t></w:r></w:p>

    <!-- TTD SPD -->
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:before="240" w:after="40"/></w:pPr>
      <w:r><w:t>Dikeluarkan di: Waisai, {tgl_surat}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:after="720"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Pejabat Pembuat Komitmen,</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>{nama_ppk}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:after="160"/></w:pPr>
      <w:r><w:t>NIP. {nip_ppk}</w:t></w:r>
    </w:p>

    <!-- SECTION VISUM -->
    <w:p><w:r><w:t>{#visum}</w:t></w:r></w:p>
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="22"/><w:u w:val="single"/></w:rPr><w:t>LEMBAR VISUM / KONFIRMASI KUNJUNGAN PERJALANAN DINAS</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="160"/></w:pPr>
      <w:r><w:t>Lampiran SPD Nomor: {nomor_spd}</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:left="360"/></w:pPr>
      <w:r><w:t>{#r}{no}. Tanggal: {tgl} | Lokasi/Responden: {nama_responden} | TTD/Stempel: ( ................................... ){/r}</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{/visum}</w:t></w:r></w:p>

    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function buildDocx(filename, docXmlContent) {
    const tempDir = path.join(__dirname, 'temp_' + path.basename(filename, '.docx'));
    const wordDir = path.join(tempDir, 'word');
    const relsDir = path.join(tempDir, '_rels');
    const wordRelsDir = path.join(wordDir, '_rels');

    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });

    fs.mkdirSync(wordRelsDir, { recursive: true });
    fs.mkdirSync(relsDir, { recursive: true });

    fs.writeFileSync(path.join(tempDir, '[Content_Types].xml'), contentTypesXml);
    fs.writeFileSync(path.join(relsDir, '.rels'), relsXml);
    fs.writeFileSync(path.join(wordRelsDir, 'document.xml.rels'), docRelsXml);
    fs.writeFileSync(path.join(wordDir, 'styles.xml'), stylesXml);
    fs.writeFileSync(path.join(wordDir, 'document.xml'), docXmlContent);

    const outPath = path.resolve(filename);
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

    const zipPath = outPath.replace(/\.docx$/i, '.zip');
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    // Use PowerShell Compress-Archive to .zip and then rename to .docx
    const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipPath}' -Force"`;
    execSync(psCmd);
    fs.renameSync(zipPath, outPath);
    console.log(`Generated: ${outPath}`);

    // Cleanup temp
    fs.rmSync(tempDir, { recursive: true, force: true });
}

fs.mkdirSync('Assets/templates', { recursive: true });
buildDocx('Assets/templates/template_st_tunggal.docx', makeDocXmlTunggal());
buildDocx('Assets/templates/template_st_lampiran.docx', makeDocXmlLampiran());
buildDocx('Assets/templates/template_st_spd.docx', makeDocXmlSpd());

console.log('All 3 .docx templates successfully generated in Assets/templates/');
