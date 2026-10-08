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
- **Manajemen Hak Akses (Role-Based Access Control)**:
  - **Admin**: Akses penuh untuk melihat, menambah, mengedit, dan menghapus seluruh tabel, serta dropdown *employee switcher* untuk mengelola 25 pegawai.
  - **User**: Dapat melihat profilnya sendiri, serta menambah dan memperbarui biodata dan riwayat. Tombol hapus disembunyikan.
- **Integrasi Supabase Terpusat (`supabase-config.js`)**:
  - Konfigurasi global client Supabase (`window.supabaseClient` & `window.APA_AUTH`).
  - Stored procedures / RPC (`login_user`, `change_user_password`, `get_pegawai_profile`).
- **Skema Database & Seeding Lengkap (`Tabel/setup_supabase.sql`)**:
  - Relasi berjenjang menggunakan NIP (`users.username` -> `data_pegawai.pegawai_nip` -> tabel riwayat).
  - Data bawaan lengkap dari ke-6 file CSV.

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
3. Salin seluruh isi file [`Tabel/setup_supabase.sql`](Tabel/setup_supabase.sql) dan jalankan (**Run**).

---

## 📁 Struktur Berkas

```
APA/
├── index.html                   # Entry point redirect untuk GitHub Pages
├── login.html                   # Halaman Login & Ganti Password
├── profile.html                 # Halaman Profil Pegawai Lengkap & CRUD
├── raja-ampat-background.html   # Komponen visual latar belakang Raja Ampat
├── supabase-config.js           # Konfigurasi Supabase Client & Auth Helper
├── Tabel/                       # Skrip SQL & CSV data awal
│   ├── setup_supabase.sql
│   ├── users.csv
│   ├── data_pegawai.csv
│   ├── riwayat_jabatan.csv
│   ├── riwayat_pangkat_golongan.csv
│   ├── riwayat_angka_kredit.csv
│   └── riwayat_gelar.csv
└── Referensi Desain/            # Aset dan referensi desain antarmuka
```
