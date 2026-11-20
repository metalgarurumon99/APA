-- ============================================================================
-- APA (BPS Kabupaten Raja Ampat) — Supabase Security & Performance Hardening
-- ============================================================================
-- Hasil audit langsung Supabase (P0, P1, P2):
--   1. Hapus 11 policy RLS lama (USING true) yang meng-override RLS baru
--      di schema public & storage.objects (P0)
--   2. Tutup celah Privilege Escalation pada public.users: batasi UPDATE hanya
--      kolom (full_name, notifikasi_last_read_at) dan cabut TRUNCATE/TRIGGER/REFERENCES (P0/P1)
--   3. Pindahkan 4 helper RLS (is_admin, current_app_*) ke schema private agar
--      tidak terpapar sebagai endpoint /rest/v1/rpc/* (P1)
--   4. Kosongkan password_hash legacy di public.users & hapus RPC legacy
--      (login_user, change_user_password) (P1)
--   5. Set search_path = public pada public.set_updated_at() (P1)
--   6. Batasi file_size_limit (10 MB) & allowed_mime_types pada bucket Storage (P1)
--   7. Fix auth_rls_initplan dengan (SELECT auth.uid()), pecah policy FOR ALL
--      agar 0 multiple_permissive_policies, dan VALIDATE CHECK constraints (P2)
-- ============================================================================

BEGIN;

-- 1. Schema privat untuk helper RLS (tidak diekspos ke PostgREST /rest/v1/rpc/*)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE auth_user_id = (SELECT auth.uid())
          AND (
              lower(COALESCE(role, '')) = 'admin'
              OR (roles IS NOT NULL AND roles ? 'admin')
          )
    );
$$;

CREATE OR REPLACE FUNCTION private.current_app_username()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT lower(username)
    FROM public.users
    WHERE auth_user_id = (SELECT auth.uid())
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.current_app_user_id_text()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id::text
    FROM public.users
    WHERE auth_user_id = (SELECT auth.uid())
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.current_app_pegawai_nip()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT dp.pegawai_nip
    FROM public.data_pegawai dp
    JOIN public.users u ON lower(dp.username) = lower(u.username)
    WHERE u.auth_user_id = (SELECT auth.uid())
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.current_app_username() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.current_app_user_id_text() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.current_app_pegawai_nip() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_app_username() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_app_user_id_text() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_app_pegawai_nip() TO authenticated;

-- 2. Hapus 11 policy RLS lama yang masih tertinggal (P0) + policy yang akan dipecah
DROP POLICY IF EXISTS "All select data_pegawai" ON public.data_pegawai;
DROP POLICY IF EXISTS "Admin write data_pegawai" ON public.data_pegawai;
DROP POLICY IF EXISTS "Auth update own data_pegawai or admin" ON public.data_pegawai;

DROP POLICY IF EXISTS "Public access kamus_pok" ON public.kamus_pok;
DROP POLICY IF EXISTS "Admin write kamus_pok" ON public.kamus_pok;

DROP POLICY IF EXISTS "Public access mitra" ON public.mitra;
DROP POLICY IF EXISTS "Admin write mitra" ON public.mitra;

DROP POLICY IF EXISTS "All select riwayat_ak" ON public.riwayat_angka_kredit;
DROP POLICY IF EXISTS "Admin delete riwayat_ak" ON public.riwayat_angka_kredit;
DROP POLICY IF EXISTS "Auth update own riwayat_ak" ON public.riwayat_angka_kredit;
DROP POLICY IF EXISTS "Auth write own riwayat_ak" ON public.riwayat_angka_kredit;

DROP POLICY IF EXISTS "All select riwayat_gelar" ON public.riwayat_gelar;
DROP POLICY IF EXISTS "Admin delete riwayat_gelar" ON public.riwayat_gelar;
DROP POLICY IF EXISTS "Auth update own riwayat_gelar" ON public.riwayat_gelar;
DROP POLICY IF EXISTS "Auth write own riwayat_gelar" ON public.riwayat_gelar;

DROP POLICY IF EXISTS "All select riwayat_jabatan" ON public.riwayat_jabatan;
DROP POLICY IF EXISTS "Admin delete riwayat_jabatan" ON public.riwayat_jabatan;
DROP POLICY IF EXISTS "Auth update own riwayat_jabatan" ON public.riwayat_jabatan;
DROP POLICY IF EXISTS "Auth write own riwayat_jabatan" ON public.riwayat_jabatan;

DROP POLICY IF EXISTS "All select riwayat_pangkat" ON public.riwayat_pangkat_golongan;
DROP POLICY IF EXISTS "Admin delete riwayat_pangkat" ON public.riwayat_pangkat_golongan;
DROP POLICY IF EXISTS "Auth update own riwayat_pangkat" ON public.riwayat_pangkat_golongan;
DROP POLICY IF EXISTS "Auth write own riwayat_pangkat" ON public.riwayat_pangkat_golongan;

DROP POLICY IF EXISTS "Public access surat_tugas" ON public.surat_tugas;
DROP POLICY IF EXISTS "Admin update surat_tugas" ON public.surat_tugas;
DROP POLICY IF EXISTS "Auth delete own menunggu or admin surat_tugas" ON public.surat_tugas;
DROP POLICY IF EXISTS "Auth insert own or admin surat_tugas" ON public.surat_tugas;
DROP POLICY IF EXISTS "Auth select own or admin surat_tugas" ON public.surat_tugas;

DROP POLICY IF EXISTS "Public profile read" ON public.users;
DROP POLICY IF EXISTS "Auth update own full_name or admin" ON public.users;

DROP POLICY IF EXISTS "Storage access surat-tugas-preview" ON storage.objects;
DROP POLICY IF EXISTS "Storage access template" ON storage.objects;
DROP POLICY IF EXISTS "Admin write template bucket" ON storage.objects;
DROP POLICY IF EXISTS "Auth access preview bucket" ON storage.objects;

-- 3. Bangun ulang policy RLS yang bersih (0 overlap, pakai private.* & (SELECT auth.uid()))
-- users
CREATE POLICY "Auth update own full_name or admin" ON public.users
    FOR UPDATE TO authenticated
    USING ((auth_user_id = (SELECT auth.uid())) OR private.is_admin())
    WITH CHECK ((auth_user_id = (SELECT auth.uid())) OR private.is_admin());

-- data_pegawai
CREATE POLICY "Admin insert data_pegawai" ON public.data_pegawai
    FOR INSERT TO authenticated WITH CHECK (private.is_admin());
CREATE POLICY "Auth update own data_pegawai or admin" ON public.data_pegawai
    FOR UPDATE TO authenticated
    USING ((lower(username) = private.current_app_username()) OR private.is_admin())
    WITH CHECK ((lower(username) = private.current_app_username()) OR private.is_admin());
CREATE POLICY "Admin delete data_pegawai" ON public.data_pegawai
    FOR DELETE TO authenticated USING (private.is_admin());

-- kamus_pok
CREATE POLICY "Admin insert kamus_pok" ON public.kamus_pok
    FOR INSERT TO authenticated WITH CHECK (private.is_admin());
CREATE POLICY "Admin update kamus_pok" ON public.kamus_pok
    FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "Admin delete kamus_pok" ON public.kamus_pok
    FOR DELETE TO authenticated USING (private.is_admin());

-- mitra
CREATE POLICY "Admin insert mitra" ON public.mitra
    FOR INSERT TO authenticated WITH CHECK (private.is_admin());
CREATE POLICY "Admin update mitra" ON public.mitra
    FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "Admin delete mitra" ON public.mitra
    FOR DELETE TO authenticated USING (private.is_admin());

-- riwayat_angka_kredit
CREATE POLICY "Auth write own riwayat_ak" ON public.riwayat_angka_kredit
    FOR INSERT TO authenticated
    WITH CHECK ((pegawai_nip = private.current_app_pegawai_nip()) OR private.is_admin());
CREATE POLICY "Auth update own riwayat_ak" ON public.riwayat_angka_kredit
    FOR UPDATE TO authenticated
    USING ((pegawai_nip = private.current_app_pegawai_nip()) OR private.is_admin())
    WITH CHECK ((pegawai_nip = private.current_app_pegawai_nip()) OR private.is_admin());
CREATE POLICY "Admin delete riwayat_ak" ON public.riwayat_angka_kredit
    FOR DELETE TO authenticated USING (private.is_admin());

-- riwayat_gelar
CREATE POLICY "Auth write own riwayat_gelar" ON public.riwayat_gelar
    FOR INSERT TO authenticated
    WITH CHECK ((pegawai_nip = private.current_app_pegawai_nip()) OR private.is_admin());
CREATE POLICY "Auth update own riwayat_gelar" ON public.riwayat_gelar
    FOR UPDATE TO authenticated
    USING ((pegawai_nip = private.current_app_pegawai_nip()) OR private.is_admin())
    WITH CHECK ((pegawai_nip = private.current_app_pegawai_nip()) OR private.is_admin());
CREATE POLICY "Admin delete riwayat_gelar" ON public.riwayat_gelar
    FOR DELETE TO authenticated USING (private.is_admin());

-- riwayat_jabatan
CREATE POLICY "Auth write own riwayat_jabatan" ON public.riwayat_jabatan
    FOR INSERT TO authenticated
    WITH CHECK ((pegawai_nip = private.current_app_pegawai_nip()) OR private.is_admin());
CREATE POLICY "Auth update own riwayat_jabatan" ON public.riwayat_jabatan
    FOR UPDATE TO authenticated
    USING ((pegawai_nip = private.current_app_pegawai_nip()) OR private.is_admin())
    WITH CHECK ((pegawai_nip = private.current_app_pegawai_nip()) OR private.is_admin());
CREATE POLICY "Admin delete riwayat_jabatan" ON public.riwayat_jabatan
    FOR DELETE TO authenticated USING (private.is_admin());

-- riwayat_pangkat_golongan
CREATE POLICY "Auth write own riwayat_pangkat" ON public.riwayat_pangkat_golongan
    FOR INSERT TO authenticated
    WITH CHECK ((pegawai_nip = private.current_app_pegawai_nip()) OR private.is_admin());
CREATE POLICY "Auth update own riwayat_pangkat" ON public.riwayat_pangkat_golongan
    FOR UPDATE TO authenticated
    USING ((pegawai_nip = private.current_app_pegawai_nip()) OR private.is_admin())
    WITH CHECK ((pegawai_nip = private.current_app_pegawai_nip()) OR private.is_admin());
CREATE POLICY "Admin delete riwayat_pangkat" ON public.riwayat_pangkat_golongan
    FOR DELETE TO authenticated USING (private.is_admin());

-- surat_tugas
CREATE POLICY "Auth select own or admin surat_tugas" ON public.surat_tugas
    FOR SELECT TO authenticated
    USING ((user_id = private.current_app_user_id_text()) OR private.is_admin());
CREATE POLICY "Auth insert own or admin surat_tugas" ON public.surat_tugas
    FOR INSERT TO authenticated
    WITH CHECK ((user_id = private.current_app_user_id_text()) OR private.is_admin());
CREATE POLICY "Admin update surat_tugas" ON public.surat_tugas
    FOR UPDATE TO authenticated
    USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "Auth delete own menunggu or admin surat_tugas" ON public.surat_tugas
    FOR DELETE TO authenticated
    USING (((user_id = private.current_app_user_id_text()) AND (status <> 'selesai')) OR private.is_admin());

-- storage.objects
CREATE POLICY "Admin insert template bucket" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK ((bucket_id = 'template') AND private.is_admin());
CREATE POLICY "Admin update template bucket" ON storage.objects
    FOR UPDATE TO authenticated
    USING ((bucket_id = 'template') AND private.is_admin())
    WITH CHECK ((bucket_id = 'template') AND private.is_admin());
CREATE POLICY "Admin delete template bucket" ON storage.objects
    FOR DELETE TO authenticated
    USING ((bucket_id = 'template') AND private.is_admin());
CREATE POLICY "Auth access preview bucket" ON storage.objects
    FOR ALL TO authenticated
    USING ((bucket_id = 'surat-tugas-preview') AND private.is_admin())
    WITH CHECK ((bucket_id = 'surat-tugas-preview') AND private.is_admin());

-- 4. Tutup celah Privilege Escalation pada public.users & cabut privilege berlebih (P0 + P1)
REVOKE ALL ON TABLE public.users FROM authenticated;
GRANT SELECT (id, auth_user_id, username, full_name, role, roles, must_change_password, last_login, created_at, notifikasi_last_read_at) ON public.users TO authenticated;
GRANT UPDATE (full_name, notifikasi_last_read_at) ON public.users TO authenticated;

REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE
    public.data_pegawai,
    public.kamus_pok,
    public.mitra,
    public.riwayat_angka_kredit,
    public.riwayat_gelar,
    public.riwayat_jabatan,
    public.riwayat_pangkat_golongan,
    public.surat_tugas
FROM authenticated;

-- 5. Kosongkan password_hash legacy di public.users & perbarui RPC agar pakai private.*
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;
UPDATE public.users SET password_hash = NULL WHERE password_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_create_user(
    p_username TEXT,
    p_full_name TEXT,
    p_password TEXT,
    p_roles JSONB,
    p_nip TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_primary_role TEXT := 'user';
    v_new_user_id BIGINT;
    v_auth_uid UUID := gen_random_uuid();
    v_email TEXT;
    v_hash TEXT;
BEGIN
    IF NOT private.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Akses ditolak: hanya Administrator');
    END IF;

    p_username := lower(trim(p_username));
    p_full_name := trim(p_full_name);

    IF p_username IS NULL OR length(p_username) < 3 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Username minimal 3 karakter');
    END IF;

    IF p_password IS NULL OR length(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Password awal minimal 6 karakter');
    END IF;

    IF EXISTS (SELECT 1 FROM public.users WHERE lower(username) = p_username) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Username sudah digunakan oleh pengguna lain');
    END IF;

    IF p_roles IS NULL OR jsonb_array_length(p_roles) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Minimal harus memilih 1 role');
    END IF;

    IF p_roles ? 'admin' THEN
        v_primary_role := 'admin';
    END IF;

    v_email := p_username || '@apa.bps9108.local';
    v_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));

    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, confirmation_sent_at,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_auth_uid, 'authenticated', 'authenticated', v_email, v_hash,
        now(), now(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('username', p_username, 'full_name', p_full_name),
        now(), now(),
        '', '', '', ''
    );

    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_auth_uid, v_auth_uid::text,
        jsonb_build_object('sub', v_auth_uid::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
        'email', now(), now(), now()
    );

    INSERT INTO public.users (auth_user_id, username, password_hash, must_change_password, full_name, role, roles)
    VALUES (v_auth_uid, p_username, NULL, TRUE, p_full_name, v_primary_role, p_roles)
    RETURNING id INTO v_new_user_id;

    IF p_nip IS NOT NULL AND trim(p_nip) != '' THEN
        INSERT INTO public.data_pegawai (username, pegawai_nip, unit_kerja, status_kepegawaian)
        VALUES (p_username, trim(p_nip), 'BPS Kabupaten Raja Ampat', 'aktif')
        ON CONFLICT (username) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Pengguna berhasil ditambahkan',
        'user_id', v_new_user_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    p_username TEXT,
    p_new_password TEXT,
    p_must_change_password BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_auth_uid UUID;
    v_hash TEXT;
BEGIN
    IF NOT private.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Akses ditolak: hanya Administrator');
    END IF;
    p_username := lower(trim(p_username));
    IF p_username = 'rizal.akbar' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Password Admin Tetap rizal.akbar tidak dapat direset melalui endpoint ini!');
    END IF;
    IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Password minimal 6 karakter');
    END IF;
    v_hash := extensions.crypt(p_new_password, extensions.gen_salt('bf', 10));
    UPDATE public.users
    SET password_hash = NULL,
        must_change_password = COALESCE(p_must_change_password, TRUE)
    WHERE lower(username) = p_username
    RETURNING auth_user_id INTO v_auth_uid;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak ditemukan');
    END IF;
    IF v_auth_uid IS NOT NULL THEN
        UPDATE auth.users SET encrypted_password = v_hash, updated_at = now() WHERE id = v_auth_uid;
    END IF;
    RETURN jsonb_build_object('success', true, 'message', 'Password berhasil direset.');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_roles(p_username TEXT, p_roles JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_primary_role TEXT := 'user';
BEGIN
    IF NOT private.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Akses ditolak: hanya Administrator');
    END IF;

    p_username := lower(trim(p_username));

    IF p_roles IS NULL OR jsonb_array_length(p_roles) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna wajib memiliki minimal 1 role aktif');
    END IF;

    IF p_username = 'rizal.akbar' AND NOT (p_roles ? 'admin') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role Admin untuk rizal.akbar tidak dapat dicabut!');
    END IF;

    IF p_roles ? 'admin' THEN
        v_primary_role := 'admin';
    END IF;

    UPDATE public.users
    SET role = v_primary_role,
        roles = p_roles
    WHERE lower(username) = p_username;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak ditemukan');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Role pengguna berhasil diperbarui');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auth_uid UUID;
BEGIN
    IF NOT private.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Akses ditolak: hanya Administrator');
    END IF;

    p_username := lower(trim(p_username));

    IF p_username = 'rizal.akbar' THEN
        RETURN jsonb_build_object('success', false, 'message', 'User rizal.akbar adalah Admin Tetap dan tidak dapat dihapus!');
    END IF;

    DELETE FROM public.users
    WHERE lower(username) = p_username
    RETURNING auth_user_id INTO v_auth_uid;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak ditemukan');
    END IF;

    IF v_auth_uid IS NOT NULL THEN
        DELETE FROM auth.users WHERE id = v_auth_uid;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Pengguna berhasil dihapus');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(id BIGINT, username TEXT, full_name TEXT, role TEXT, roles JSONB, must_change_password BOOLEAN, last_login TIMESTAMPTZ, created_at TIMESTAMPTZ, pegawai_nip TEXT, status_kepegawaian TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Akses ditolak: hanya Administrator';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.username,
        u.full_name,
        u.role,
        COALESCE(u.roles, CASE WHEN u.role = 'admin' THEN '["admin", "user"]'::jsonb ELSE '["user"]'::jsonb END) AS roles,
        u.must_change_password,
        u.last_login,
        u.created_at,
        dp.pegawai_nip,
        COALESCE(dp.status_kepegawaian, 'aktif') AS status_kepegawaian
    FROM public.users u
    LEFT JOIN public.data_pegawai dp ON lower(u.username) = lower(dp.username)
    ORDER BY u.id ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pegawai_profile(p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_pegawai RECORD;
    v_jabatan JSONB;
    v_pangkat JSONB;
    v_ak JSONB;
    v_gelar JSONB;
    v_target TEXT := lower(trim(p_username));
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Belum terautentikasi');
    END IF;

    IF NOT private.is_admin() AND v_target != COALESCE(private.current_app_username(), '') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Akses ditolak');
    END IF;

    SELECT id, username, full_name, role, roles, must_change_password
    INTO v_user
    FROM public.users
    WHERE lower(username) = v_target;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User tidak ditemukan');
    END IF;

    SELECT * INTO v_pegawai
    FROM public.data_pegawai
    WHERE lower(username) = v_target;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'user', row_to_json(v_user),
            'data_pegawai', NULL,
            'riwayat_jabatan', '[]'::jsonb,
            'riwayat_pangkat_golongan', '[]'::jsonb,
            'riwayat_angka_kredit', '[]'::jsonb,
            'riwayat_gelar', '[]'::jsonb
        );
    END IF;

    SELECT COALESCE(jsonb_agg(row_to_json(j) ORDER BY j.id DESC), '[]'::jsonb)
    INTO v_jabatan
    FROM public.riwayat_jabatan j
    WHERE j.pegawai_nip = v_pegawai.pegawai_nip;

    SELECT COALESCE(jsonb_agg(row_to_json(p) ORDER BY p.id DESC), '[]'::jsonb)
    INTO v_pangkat
    FROM public.riwayat_pangkat_golongan p
    WHERE p.pegawai_nip = v_pegawai.pegawai_nip;

    SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.periode_tahun DESC, a.periode_bulan_akhir DESC NULLS LAST, a.id DESC), '[]'::jsonb)
    INTO v_ak
    FROM public.riwayat_angka_kredit a
    WHERE a.pegawai_nip = v_pegawai.pegawai_nip;

    SELECT COALESCE(jsonb_agg(row_to_json(g) ORDER BY g.id DESC), '[]'::jsonb)
    INTO v_gelar
    FROM public.riwayat_gelar g
    WHERE g.pegawai_nip = v_pegawai.pegawai_nip;

    RETURN jsonb_build_object(
        'success', true,
        'user', row_to_json(v_user),
        'data_pegawai', row_to_json(v_pegawai),
        'riwayat_jabatan', v_jabatan,
        'riwayat_pangkat_golongan', v_pangkat,
        'riwayat_angka_kredit', v_ak,
        'riwayat_gelar', v_gelar
    );
END;
$$;

-- 6. Hapus fungsi legacy & helper lama di schema public
DROP FUNCTION IF EXISTS public.login_user(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.change_user_password(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.current_app_username();
DROP FUNCTION IF EXISTS public.current_app_user_id_text();
DROP FUNCTION IF EXISTS public.current_app_pegawai_nip();

-- 7. Fix search_path pada public.set_updated_at()
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- 8. Batasi ukuran & MIME bucket Storage (10 MB, .docx / octet-stream)
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream'
    ]
WHERE id IN ('surat-tugas-preview', 'template');

-- 9. Validasi CHECK constraint (P2)
ALTER TABLE public.data_pegawai VALIDATE CONSTRAINT chk_data_pegawai_status;
ALTER TABLE public.surat_tugas VALIDATE CONSTRAINT chk_surat_tugas_status;

COMMIT;
