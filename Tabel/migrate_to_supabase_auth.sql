-- ==============================================================================
-- MIGRASI PENUH KE SUPABASE AUTH (auth.users) + RLS BERBASIS auth.uid()
-- Sistem Automasi Pekerjaan Administrasi (APA) - BPS Kabupaten Raja Ampat
-- ==============================================================================
-- Yang dilakukan skrip ini secara idempoten (aman dijalankan ulang):
--   1. Menambahkan kolom `auth_user_id UUID` pada `public.users`.
--   2. Memigrasikan seluruh akun existing di `public.users` ke `auth.users` &
--      `auth.identities` dengan mempertahankan hash bcrypt password masing-masing
--      (format email internal: `<username>@apa.bps9108.local`, sudah terkonfirmasi).
--   3. Membuat helper `public.is_admin()`, `public.current_app_username()`,
--      `public.get_my_profile_session()`, dan `public.mark_password_changed()`.
--   4. Mengunci seluruh 5 RPC `admin_*` & `get_pegawai_profile`: mencabut akses
--      `anon` dan memverifikasi `public.is_admin()` / `auth.uid()` di server.
--   5. Mencabut akses `anon` dari seluruh tabel & bucket Storage, lalu menerapkan
--      RLS ketat berbasis `authenticated` + `auth.uid()` + `public.is_admin()`.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ------------------------------------------------------------------------------
-- 1. TAMBAH KOLOM auth_user_id PADA public.users
-- ------------------------------------------------------------------------------
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_lower_username ON public.users (lower(username));

-- ------------------------------------------------------------------------------
-- 2. MIGRASI USER EXISTING public.users -> auth.users & auth.identities
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    u RECORD;
    v_email TEXT;
    v_uid UUID;
    v_pwd_hash TEXT;
BEGIN
    FOR u IN
        SELECT id, username, password_hash, full_name, role, roles, auth_user_id
        FROM public.users
        WHERE auth_user_id IS NULL
    LOOP
        v_email := lower(trim(u.username)) || '@apa.bps9108.local';

        -- Cek apakah email sudah ada di auth.users
        SELECT id INTO v_uid
        FROM auth.users
        WHERE lower(email) = v_email
        LIMIT 1;

        IF v_uid IS NULL THEN
            v_uid := gen_random_uuid();
            v_pwd_hash := COALESCE(
                NULLIF(u.password_hash, ''),
                extensions.crypt('123456', extensions.gen_salt('bf', 10))
            );

            INSERT INTO auth.users (
                instance_id,
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                confirmation_sent_at,
                recovery_sent_at,
                last_sign_in_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at,
                confirmation_token,
                email_change,
                email_change_token_new,
                recovery_token
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                v_uid,
                'authenticated',
                'authenticated',
                v_email,
                v_pwd_hash,
                now(),
                now(),
                NULL,
                NULL,
                jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
                jsonb_build_object('username', lower(trim(u.username)), 'full_name', COALESCE(u.full_name, u.username)),
                now(),
                now(),
                '',
                '',
                '',
                ''
            );

            INSERT INTO auth.identities (
                id,
                user_id,
                provider_id,
                identity_data,
                provider,
                last_sign_in_at,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_uid,
                v_uid::text,
                jsonb_build_object(
                    'sub', v_uid::text,
                    'email', v_email,
                    'email_verified', true,
                    'phone_verified', false
                ),
                'email',
                now(),
                now(),
                now()
            )
            ON CONFLICT DO NOTHING;
        END IF;

        UPDATE public.users
        SET auth_user_id = v_uid
        WHERE id = u.id;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. HELPER OTORISASI SERVER-SIDE BERBASIS auth.uid()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE auth_user_id = auth.uid()
          AND (
              lower(COALESCE(role, '')) = 'admin'
              OR (roles IS NOT NULL AND roles ? 'admin')
          )
    );
$$;

CREATE OR REPLACE FUNCTION public.current_app_username()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT lower(username)
    FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_app_user_id_text()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id::text
    FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_app_pegawai_nip()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT dp.pegawai_nip
    FROM public.data_pegawai dp
    JOIN public.users u ON lower(dp.username) = lower(u.username)
    WHERE u.auth_user_id = auth.uid()
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_app_username() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_app_user_id_text() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_app_pegawai_nip() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_app_username() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_app_user_id_text() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_app_pegawai_nip() TO authenticated;

-- RPC untuk mengambil profil sesi user yang sedang login (berbasis auth.uid())
CREATE OR REPLACE FUNCTION public.get_my_profile_session()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_nip TEXT;
    v_foto TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Belum terautentikasi');
    END IF;

    SELECT id, username, full_name, role, roles, must_change_password
    INTO v_user
    FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Akun pengguna tidak ditemukan di public.users');
    END IF;

    UPDATE public.users SET last_login = now() WHERE id = v_user.id;

    SELECT pegawai_nip, foto_url
    INTO v_nip, v_foto
    FROM public.data_pegawai
    WHERE lower(username) = lower(v_user.username)
    LIMIT 1;

    RETURN jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
            'id', v_user.id,
            'auth_user_id', auth.uid(),
            'username', v_user.username,
            'full_name', v_user.full_name,
            'role', COALESCE(v_user.role, 'user'),
            'roles', COALESCE(v_user.roles, CASE WHEN v_user.role = 'admin' THEN '["admin","user"]'::jsonb ELSE '["user"]'::jsonb END),
            'must_change_password', COALESCE(v_user.must_change_password, false),
            'pegawai_nip', v_nip,
            'foto_url', v_foto
        )
    );
END;
$$;

-- RPC untuk menandai must_change_password = FALSE setelah sb.auth.updateUser({ password })
CREATE OR REPLACE FUNCTION public.mark_password_changed()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Belum terautentikasi');
    END IF;

    UPDATE public.users
    SET must_change_password = FALSE
    WHERE auth_user_id = auth.uid();

    RETURN jsonb_build_object('success', true, 'message', 'Status password berhasil diperbarui');
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_profile_session() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_password_changed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_password_changed() TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. KUNCI get_pegawai_profile & SELURUH 5 RPC admin_* BERBASIS auth.uid()
-- ------------------------------------------------------------------------------
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

    -- Hanya admin atau pemilik akun sendiri yang boleh membaca profil lengkap
    IF NOT public.is_admin() AND v_target != COALESCE(public.current_app_username(), '') THEN
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

-- 4a. admin_get_all_users (hanya Admin terautentikasi)
DROP FUNCTION IF EXISTS public.admin_get_all_users();
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
    id BIGINT,
    username TEXT,
    full_name TEXT,
    role TEXT,
    roles JSONB,
    must_change_password BOOLEAN,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    pegawai_nip TEXT,
    status_kepegawaian TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
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

-- 4b. admin_create_user (buat akun di auth.users + auth.identities + public.users)
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
    IF NOT public.is_admin() THEN
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
    VALUES (v_auth_uid, p_username, v_hash, TRUE, p_full_name, v_primary_role, p_roles)
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

-- 4c. admin_update_user_roles
CREATE OR REPLACE FUNCTION public.admin_update_user_roles(
    p_username TEXT,
    p_roles JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_primary_role TEXT := 'user';
BEGIN
    IF NOT public.is_admin() THEN
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

-- 4d. admin_reset_user_password (sinkron ke auth.users + public.users + dukung p_must_change_password)
DROP FUNCTION IF EXISTS public.admin_reset_user_password(TEXT, TEXT);
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
    IF NOT public.is_admin() THEN
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
    SET password_hash = v_hash,
        must_change_password = COALESCE(p_must_change_password, TRUE)
    WHERE lower(username) = p_username
    RETURNING auth_user_id INTO v_auth_uid;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak ditemukan');
    END IF;

    IF v_auth_uid IS NOT NULL THEN
        UPDATE auth.users
        SET encrypted_password = v_hash,
            updated_at = now()
        WHERE id = v_auth_uid;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Password berhasil direset.');
END;
$$;

-- 4e. admin_delete_user (hapus dari public.users + auth.users)
CREATE OR REPLACE FUNCTION public.admin_delete_user(
    p_username TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auth_uid UUID;
BEGIN
    IF NOT public.is_admin() THEN
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

-- Cabut seluruh izin anon dari RPC lama & RPC admin_*
REVOKE ALL ON FUNCTION public.get_pegawai_profile(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_all_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_user(TEXT, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_user_roles(TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reset_user_password(TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_user(TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_pegawai_profile(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_user(TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_roles(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(TEXT) TO authenticated;

-- Cabut RPC login lama dari anon (autentikasi kini lewat Supabase Auth GoTrue)
DO $$
BEGIN
    IF to_regprocedure('public.login_user(text,text)') IS NOT NULL THEN
        REVOKE ALL ON FUNCTION public.login_user(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
    END IF;
    IF to_regprocedure('public.change_user_password(text,text,text)') IS NOT NULL THEN
        REVOKE ALL ON FUNCTION public.change_user_password(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. PERKETAT RLS SEMUA TABEL & STORAGE BUCKET (CABUT ANON, WAJIB authenticated)
-- ------------------------------------------------------------------------------

-- 5a. public.users (cabut anon & cabut SELECT password_hash)
REVOKE ALL ON public.users FROM anon;
REVOKE SELECT ON public.users FROM authenticated;
GRANT SELECT (id, auth_user_id, username, full_name, role, roles, must_change_password, last_login, created_at)
    ON public.users TO authenticated;
GRANT UPDATE (full_name) ON public.users TO authenticated;

DROP POLICY IF EXISTS "Public select users" ON public.users;
DROP POLICY IF EXISTS "Auth select users" ON public.users;
DROP POLICY IF EXISTS "Auth update own full_name or admin" ON public.users;

CREATE POLICY "Auth select users"
    ON public.users FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Auth update own full_name or admin"
    ON public.users FOR UPDATE TO authenticated
    USING (auth_user_id = auth.uid() OR public.is_admin())
    WITH CHECK (auth_user_id = auth.uid() OR public.is_admin());

-- 5b. public.data_pegawai
REVOKE ALL ON public.data_pegawai FROM anon;
DROP POLICY IF EXISTS "Public access data_pegawai" ON public.data_pegawai;
DROP POLICY IF EXISTS "Auth read data_pegawai" ON public.data_pegawai;
DROP POLICY IF EXISTS "Auth update own data_pegawai or admin" ON public.data_pegawai;
DROP POLICY IF EXISTS "Admin write data_pegawai" ON public.data_pegawai;

CREATE POLICY "Auth read data_pegawai"
    ON public.data_pegawai FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Auth update own data_pegawai or admin"
    ON public.data_pegawai FOR UPDATE TO authenticated
    USING (lower(username) = public.current_app_username() OR public.is_admin())
    WITH CHECK (lower(username) = public.current_app_username() OR public.is_admin());

CREATE POLICY "Admin write data_pegawai"
    ON public.data_pegawai FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 5c. public.riwayat_jabatan, riwayat_pangkat_golongan, riwayat_angka_kredit, riwayat_gelar
REVOKE ALL ON public.riwayat_jabatan FROM anon;
REVOKE ALL ON public.riwayat_pangkat_golongan FROM anon;
REVOKE ALL ON public.riwayat_angka_kredit FROM anon;
REVOKE ALL ON public.riwayat_gelar FROM anon;

DROP POLICY IF EXISTS "Public access riwayat_jabatan" ON public.riwayat_jabatan;
DROP POLICY IF EXISTS "Auth read riwayat_jabatan" ON public.riwayat_jabatan;
DROP POLICY IF EXISTS "Auth write own riwayat_jabatan" ON public.riwayat_jabatan;
DROP POLICY IF EXISTS "Auth update own riwayat_jabatan" ON public.riwayat_jabatan;
DROP POLICY IF EXISTS "Admin delete riwayat_jabatan" ON public.riwayat_jabatan;

CREATE POLICY "Auth read riwayat_jabatan" ON public.riwayat_jabatan FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write own riwayat_jabatan" ON public.riwayat_jabatan FOR INSERT TO authenticated WITH CHECK (pegawai_nip = public.current_app_pegawai_nip() OR public.is_admin());
CREATE POLICY "Auth update own riwayat_jabatan" ON public.riwayat_jabatan FOR UPDATE TO authenticated USING (pegawai_nip = public.current_app_pegawai_nip() OR public.is_admin()) WITH CHECK (pegawai_nip = public.current_app_pegawai_nip() OR public.is_admin());
CREATE POLICY "Admin delete riwayat_jabatan" ON public.riwayat_jabatan FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Public access riwayat_pangkat" ON public.riwayat_pangkat_golongan;
DROP POLICY IF EXISTS "Auth read riwayat_pangkat" ON public.riwayat_pangkat_golongan;
DROP POLICY IF EXISTS "Auth write own riwayat_pangkat" ON public.riwayat_pangkat_golongan;
DROP POLICY IF EXISTS "Auth update own riwayat_pangkat" ON public.riwayat_pangkat_golongan;
DROP POLICY IF EXISTS "Admin delete riwayat_pangkat" ON public.riwayat_pangkat_golongan;

CREATE POLICY "Auth read riwayat_pangkat" ON public.riwayat_pangkat_golongan FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write own riwayat_pangkat" ON public.riwayat_pangkat_golongan FOR INSERT TO authenticated WITH CHECK (pegawai_nip = public.current_app_pegawai_nip() OR public.is_admin());
CREATE POLICY "Auth update own riwayat_pangkat" ON public.riwayat_pangkat_golongan FOR UPDATE TO authenticated USING (pegawai_nip = public.current_app_pegawai_nip() OR public.is_admin()) WITH CHECK (pegawai_nip = public.current_app_pegawai_nip() OR public.is_admin());
CREATE POLICY "Admin delete riwayat_pangkat" ON public.riwayat_pangkat_golongan FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Public access riwayat_ak" ON public.riwayat_angka_kredit;
DROP POLICY IF EXISTS "Auth read riwayat_ak" ON public.riwayat_angka_kredit;
DROP POLICY IF EXISTS "Auth write own riwayat_ak" ON public.riwayat_angka_kredit;
DROP POLICY IF EXISTS "Auth update own riwayat_ak" ON public.riwayat_angka_kredit;
DROP POLICY IF EXISTS "Admin delete riwayat_ak" ON public.riwayat_angka_kredit;

CREATE POLICY "Auth read riwayat_ak" ON public.riwayat_angka_kredit FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write own riwayat_ak" ON public.riwayat_angka_kredit FOR INSERT TO authenticated WITH CHECK (pegawai_nip = public.current_app_pegawai_nip() OR public.is_admin());
CREATE POLICY "Auth update own riwayat_ak" ON public.riwayat_angka_kredit FOR UPDATE TO authenticated USING (pegawai_nip = public.current_app_pegawai_nip() OR public.is_admin()) WITH CHECK (pegawai_nip = public.current_app_pegawai_nip() OR public.is_admin());
CREATE POLICY "Admin delete riwayat_ak" ON public.riwayat_angka_kredit FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Public access riwayat_gelar" ON public.riwayat_gelar;
DROP POLICY IF EXISTS "Auth read riwayat_gelar" ON public.riwayat_gelar;
DROP POLICY IF EXISTS "Auth write own riwayat_gelar" ON public.riwayat_gelar;
DROP POLICY IF EXISTS "Auth update own riwayat_gelar" ON public.riwayat_gelar;
DROP POLICY IF EXISTS "Admin delete riwayat_gelar" ON public.riwayat_gelar;

CREATE POLICY "Auth read riwayat_gelar" ON public.riwayat_gelar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write own riwayat_gelar" ON public.riwayat_gelar FOR INSERT TO authenticated WITH CHECK (pegawai_nip = public.current_app_pegawai_nip() OR public.is_admin());
CREATE POLICY "Auth update own riwayat_gelar" ON public.riwayat_gelar FOR UPDATE TO authenticated USING (pegawai_nip = public.current_app_pegawai_nip() OR public.is_admin()) WITH CHECK (pegawai_nip = public.current_app_pegawai_nip() OR public.is_admin());
CREATE POLICY "Admin delete riwayat_gelar" ON public.riwayat_gelar FOR DELETE TO authenticated USING (public.is_admin());

-- 5d. public.surat_tugas, public.mitra, public.kamus_pok
REVOKE ALL ON public.surat_tugas FROM anon;
REVOKE ALL ON public.mitra FROM anon;
REVOKE ALL ON public.kamus_pok FROM anon;

DROP POLICY IF EXISTS "Public access surat_tugas" ON public.surat_tugas;
DROP POLICY IF EXISTS "Auth select own or admin surat_tugas" ON public.surat_tugas;
DROP POLICY IF EXISTS "Auth insert own or admin surat_tugas" ON public.surat_tugas;
DROP POLICY IF EXISTS "Admin update surat_tugas" ON public.surat_tugas;
DROP POLICY IF EXISTS "Auth delete own menunggu or admin surat_tugas" ON public.surat_tugas;

CREATE POLICY "Auth select own or admin surat_tugas"
    ON public.surat_tugas FOR SELECT TO authenticated
    USING (user_id = public.current_app_user_id_text() OR public.is_admin());

CREATE POLICY "Auth insert own or admin surat_tugas"
    ON public.surat_tugas FOR INSERT TO authenticated
    WITH CHECK (user_id = public.current_app_user_id_text() OR public.is_admin());

CREATE POLICY "Admin update surat_tugas"
    ON public.surat_tugas FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Auth delete own menunggu or admin surat_tugas"
    ON public.surat_tugas FOR DELETE TO authenticated
    USING ((user_id = public.current_app_user_id_text() AND status != 'selesai') OR public.is_admin());

DROP POLICY IF EXISTS "Public access mitra" ON public.mitra;
DROP POLICY IF EXISTS "Auth read mitra" ON public.mitra;
DROP POLICY IF EXISTS "Admin write mitra" ON public.mitra;

CREATE POLICY "Auth read mitra" ON public.mitra FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write mitra" ON public.mitra FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public access kamus_pok" ON public.kamus_pok;
DROP POLICY IF EXISTS "Auth read kamus_pok" ON public.kamus_pok;
DROP POLICY IF EXISTS "Admin write kamus_pok" ON public.kamus_pok;

CREATE POLICY "Auth read kamus_pok" ON public.kamus_pok FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write kamus_pok" ON public.kamus_pok FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5e. Storage Buckets (`template` & `surat-tugas-preview`)
DROP POLICY IF EXISTS "Public access template bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public read template bucket" ON storage.objects;
DROP POLICY IF EXISTS "Auth read template bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admin write template bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public access preview bucket" ON storage.objects;
DROP POLICY IF EXISTS "Auth access preview bucket" ON storage.objects;

CREATE POLICY "Auth read template bucket"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'template');

CREATE POLICY "Admin write template bucket"
    ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'template' AND public.is_admin())
    WITH CHECK (bucket_id = 'template' AND public.is_admin());

CREATE POLICY "Auth access preview bucket"
    ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'surat-tugas-preview' AND public.is_admin())
    WITH CHECK (bucket_id = 'surat-tugas-preview' AND public.is_admin());

-- Verifikasi ringkas hasil migrasi
SELECT
    count(*) AS total_public_users,
    count(auth_user_id) AS migrated_to_auth_users
FROM public.users;
