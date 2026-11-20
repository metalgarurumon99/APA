# APA — Sistem Automasi Pekerjaan Administrasi

Aplikasi web internal **BPS Kabupaten Raja Ampat** untuk manajemen kepegawaian, pengajuan & persetujuan Surat Tugas / SPD, serta pembuatan dokumen `.docx` otomatis berbasis Supabase.

## Struktur Modul Utama

| Modul / File | Fungsi |
|---|---|
| `login.html` + `login.css` + `login.js` | Halaman masuk & wajib ganti password (terintegrasi **Supabase Auth** + JWT) |
| `profile.html` + `profile.css` + `profile.js` | Profil biodata pegawai & CRUD riwayat (Jabatan, Pangkat, Angka Kredit, Gelar) |
| `users.html` + `users.css` + `users.js` | Manajemen pengguna & hak akses khusus Administrator |
| `minta-surat-tugas.html` + `.css` + `.js` | Pengajuan Surat Tugas oleh pegawai (input grid & paste Excel) |
| `surat-tugas.html` + `surat-tugas.css` | Halaman Admin Surat Tugas |
| `admin-surat-tugas.js` | Core state, tabel inline-edit, draft lokal, popup, approve & inisialisasi |
| `st-lookups.js` | Pre-indexed HR lookups (TMT-aware), format nomor surat & lifecycle preview Storage |
| `st-excel.js` | Export & Import Excel Surat Tugas (SheetJS) |
| `st-bulk.js` | Bulk Approve, Bulk Download `.docx` & Open in Microsoft Word |
| `st-docx.js` | Generator DOCX (`docxtemplater` + `PizZip`), Kamus POK & OOXML post-processing |
| `apa-base.css`, `apa-shared.js`, `supabase-config.js`, `config.js` | Token CSS bersama, utilitas global, autentikasi & sinkronisasi JWT |
| `apa-calendar.js/.css`, `apa-pegawai.js/.css`, `apa-grid-nav.js` | Komponen kalender multi-rentang, picker pegawai/mitra & navigasi grid keyboard |
| `sidebar.js/.css`, `topbar.js/.css` | Shell navigasi global (desktop & mobile) |

## Menjalankan Secara Lokal

```bash
node scripts/server.js
```

Buka `http://127.0.0.1:3456/login.html` di browser.

## Urutan Setup / Migrasi SQL Supabase (`Tabel/`)

1. `Tabel/setup_supabase.sql` — Skema awal `users`, `data_pegawai`, `riwayat_*`, dan seed dasar.
2. `Tabel/setup_surat_tugas.sql` — Skema `surat_tugas`, `mitra`, `kamus_pok`, dan bucket Storage.
3. `Tabel/migrate_to_supabase_auth.sql` — Migrasi akun ke `auth.users`, penguncian seluruh RPC `admin_*` & `get_pegawai_profile`, pencabutan akses `anon`, dan penerapan RLS berbasis `auth.uid()`.
4. `Tabel/upgrade_schema_p3.sql` — Trigger otomatis `updated_at`, indeks performa/fungsional, dan `CHECK` constraints.
*(File seed PII lokal seperti `Tabel/*.csv` dan `Tabel/mitra_rows.sql` sengaja di-ignore dari Git demi privasi data.)*
