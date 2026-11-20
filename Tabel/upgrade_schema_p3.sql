-- ==============================================================================
-- PENINGKATAN SKEMA & INDEKS DATABASE (BAGIAN 3) — APA (BPS Kab. Raja Ampat)
-- ==============================================================================
-- Idempoten & aman dijalankan di Supabase SQL Editor tanpa merusak data existing:
--   1. Trigger otomatis `updated_at` untuk seluruh tabel operasional.
--   2. Hapus 3 indeks duplikat UNIQUE & tambah 6 indeks performa/fungsional.
--   3. Tambah CHECK constraints (NOT VALID agar tidak gagal pada data legacy,
--      namun langsung memvalidasi setiap INSERT/UPDATE baru).
-- ==============================================================================

-- 1. FUNGSI & TRIGGER OTOMATIS updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'data_pegawai',
        'riwayat_jabatan',
        'riwayat_pangkat_golongan',
        'riwayat_angka_kredit',
        'riwayat_gelar',
        'surat_tugas',
        'mitra'
    ]
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'updated_at'
        ) THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', tbl, tbl);
            EXECUTE format(
                'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
                tbl, tbl
            );
        END IF;
    END LOOP;
END $$;

-- 2. HAPUS INDEKS REDUNDAN (SUDAH TERCANGKUP OLEH UNIQUE CONSTRAINT)
DROP INDEX IF EXISTS public.idx_users_username;
DROP INDEX IF EXISTS public.idx_data_pegawai_nip;
DROP INDEX IF EXISTS public.idx_data_pegawai_username;

-- 3. TAMBAH INDEKS PERFORMA & FUNGSIONAL
CREATE INDEX IF NOT EXISTS idx_users_lower_username
    ON public.users (lower(username));

CREATE INDEX IF NOT EXISTS idx_data_pegawai_lower_username
    ON public.data_pegawai (lower(username));

CREATE INDEX IF NOT EXISTS idx_riwayat_ak_nip_periode
    ON public.riwayat_angka_kredit (pegawai_nip, periode_tahun DESC, periode_bulan_akhir DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_mitra_tahun_nama
    ON public.mitra (tahun DESC, nama ASC);

CREATE INDEX IF NOT EXISTS idx_surat_tugas_user_created
    ON public.surat_tugas (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_surat_tugas_tipe
    ON public.surat_tugas (tipe);

CREATE INDEX IF NOT EXISTS idx_surat_tugas_nomor_surat
    ON public.surat_tugas (nomor_surat);

-- 4. TAMBAH CHECK CONSTRAINTS (NOT VALID — aman untuk data lama, ketat untuk data baru)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_surat_tugas_status'
    ) THEN
        ALTER TABLE public.surat_tugas
            ADD CONSTRAINT chk_surat_tugas_status
            CHECK (status IN ('menunggu', 'selesai', 'draft')) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_data_pegawai_status'
    ) THEN
        ALTER TABLE public.data_pegawai
            ADD CONSTRAINT chk_data_pegawai_status
            CHECK (lower(COALESCE(status_kepegawaian, 'aktif')) IN ('aktif', 'pensiun', 'nonaktif', 'mutasi')) NOT VALID;
    END IF;
END $$;

SELECT 'upgrade_schema_p3 OK' AS status;
