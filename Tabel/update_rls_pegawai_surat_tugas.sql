-- ============================================================================
-- APA (BPS Kabupaten Raja Ampat) — Update RLS Surat Tugas Pegawai & Preview
-- ============================================================================
-- 1. Mengizinkan pegawai mengedit surat tugas miliknya sendiri HANYA selama
--    status = 'menunggu' (tidak bisa mengubah status menjadi 'selesai' atau
--    memindahkan user_id ke user lain).
-- 2. Mengizinkan user authenticated membuka preview .docx pada bucket
--    surat-tugas-preview (tetap memblokir akses anon).
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "Admin update surat_tugas" ON public.surat_tugas;
DROP POLICY IF EXISTS "Auth update own menunggu or admin surat_tugas" ON public.surat_tugas;

CREATE POLICY "Auth update own menunggu or admin surat_tugas" ON public.surat_tugas
    FOR UPDATE TO authenticated
    USING (
        private.is_admin()
        OR (user_id = private.current_app_user_id_text() AND status = 'menunggu')
    )
    WITH CHECK (
        private.is_admin()
        OR (user_id = private.current_app_user_id_text() AND status = 'menunggu')
    );

DROP POLICY IF EXISTS "Auth access preview bucket" ON storage.objects;

CREATE POLICY "Auth access preview bucket" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'surat-tugas-preview')
    WITH CHECK (bucket_id = 'surat-tugas-preview');

COMMIT;
