# Sistem Automasi Pekerjaan Administrasi (APA) - BPS Kabupaten Raja Ampat

Aplikasi web modern untuk manajemen administrasi dan profil kepegawaian Badan Pusat Statistik (BPS) Kabupaten Raja Ampat. Terintegrasi langsung dengan database Supabase, sistem autentikasi aman dengan *salt & hash*, dan antarmuka responsif elegan.

---

## 🌟 Fitur Utama

- **Halaman Login & Autentikasi Modern (`login.html`)**:
  - Background animasi pemandangan pulau Raja Ampat.
  - Kartu login glassmorphism putih menyatu dengan background.
  - Validasi field real-time dan motion checkmark elegan saat berhasil login.
  - Alur wajib ganti password pada login pertama kali (kombinasi minimal 6 karakter huruf & angka).
- **Halaman Profil Pegawai (`profile.html`)**:
  - Hero card pegawai (avatar inisial, nama bergelar otomatis, NIP, status kepegawaian).
  - 4 Quick Stat Cards (Jabatan Utama, Pangkat/Golongan, Angka Kredit PAK, Unit Kerja).
  - 5 Tab navigasi terpadu: **Biodata Pegawai**, **Riwayat Jabatan**, **Riwayat Kepangkatan**, **Riwayat Angka Kredit**, dan **Riwayat Gelar**.
  - Modal CRUD responsif untuk penambahan dan pembaharuan data.
- **Halaman Minta Surat Tugas (`minta-surat-tugas.html`)**:
  - Stat cards: Total, Menunggu, Selesai.
  - Form input multi-baris bergaya spreadsheet dengan tombol `+ 1 Baris`, `+ 5 Baris`, `Pilih Semua`, `Kirim yang Dipilih (n)`.
  - Multi-tag autocomplete pegawai & mitra statistik (`MITRA-{tahun}-{id 3 digit}`).
  - Penyimpanan draf otomatis di LocalStorage dan pengajuan batch status 'menunggu'.
  - Riwayat pengajuan dengan filter status, pencarian, modal detail lengkap, dan proteksi hapus hanya untuk status menunggu.
- **Halaman Surat Tugas Admin (`surat-tugas.html`)**:
  - Stat cards: Total, Menunggu, Selesai ("Daftar Pengajuan Surat Tugas").
  - Toolbar komprehensif: Search, Filter Status, Tambah, Export (xlsx), Import (xlsx + preview modal), Download Bulk (zip docx), Setujui Terpilih, dan Muat Ulang.
  - Tabel grid gaya Excel inline editable dengan header & kolom kiri sticky, double synchronized horizontal scrollbar, navigasi keyboard (panah/Enter/Tab), textarea auto-grow, dan pagination 100 baris.
  - 10 Tipe Surat Tugas lengkap dengan flags `{has_spd, has_kendaraan, has_menginap, has_lampiran, has_visum}` dan mapping ke 3 template docx.
  - Modal "Setujui Surat Tugas" dengan validasi error, cek bentrok jadwal & pensiun, pengaturan per-personel "Bertugas Sebagai", dan penomoran otomatis berurutan tahunan:
    - Surat Tugas: `B-{nomor}/668870-92800/KP-650/{mm}/{yyyy}`
    - SPD: `B-{nomor}/668870-92800/SPPD-{kode_mak}/{mm}/{yyyy}`
  - Modal "Preview Surat Tugas" via `docx-preview` dengan opsi "Buka di Word & Print" serta "Download .docx".
- **Manajemen Hak Akses (Role-Based Access Control)**:
  - **Admin**: Akses penuh ke seluruh menu, termasuk Surat Tugas dan Manajemen Pengguna.
  - **User**: Akses profil dan Minta Surat Tugas.
- **Integrasi Supabase Terpusat (`supabase-config.js` & `surat-tugas-helper.js`)**:
  - Single Source of Truth untuk data kepegawaian, riwayat, POK, dan pengajuan surat tugas.
  - Otomatis fallback ke penyimpanan lokal browser jika tabel cloud belum disetup.
- **Skema Database & Seeding Lengkap (`Tabel/setup_supabase.sql` & `Tabel/setup_surat_tugas.sql`)**:
  - Tabel `kamus_pok`, `mitra`, dan `surat_tugas`.
  - Storage buckets `template` (public) dan `surat-tugas-preview` (private).

---

## 🚀 Panduan Menjalankan & Deployment

### 1. GitHub Pages
Aplikasi ini bersifat statis (HTML, CSS Vanilla, JavaScript Client SDK) sehingga dapat langsung di-deploy melalui GitHub Pages:
1. Buka repositori di GitHub: `https://github.com/metalgarurumon99/APA`
2. Buka **Settings** -> **Pages**.
3. Pada bagian **Build and deployment**, pilih **Source**: `Deploy from a branch`.
4. Pilih Branch `main` (atau `master`) dan folder `/ (root)`.
5. Klik **Save**. Halaman akan aktif di `https://metalgarurumon99.github.io/APA/`.

### 2. Setup Supabase
1. Buka proyek Supabase di dashboard Anda.
2. Masuk ke menu **SQL Editor**.
3. Jalankan file dasar: [`Tabel/setup_supabase.sql`](Tabel/setup_supabase.sql).
4. Jalankan file modul surat tugas: [`Tabel/setup_surat_tugas.sql`](Tabel/setup_surat_tugas.sql).

---

## 📁 Struktur Berkas

```
APA/
├── index.html                   # Entry point redirect untuk GitHub Pages
├── login.html                   # Halaman Login & Ganti Password
├── profile.html                 # Halaman Profil Pegawai Lengkap & CRUD
├── minta-surat-tugas.html       # Halaman Minta Surat Tugas (User)
├── surat-tugas.html             # Halaman Surat Tugas Excel-like (Admin)
├── surat-tugas-helper.js        # Helper logika bisnis & generator docx/xlsx
├── sidebar.js & sidebar.css     # Komponen navigasi global
├── topbar.js & topbar.css       # Komponen topbar global
├── supabase-config.js           # Konfigurasi Supabase Client & Auth Helper
├── Buckets/                     # Berkas template Word .docx resmi
├── Tabel/                       # Skrip SQL & CSV data awal
│   ├── setup_supabase.sql
│   ├── setup_surat_tugas.sql
│   └── *.csv
```
