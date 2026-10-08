-- ==============================================================================
-- SCRIPT UPDATE SUPABASE: FITUR MANAJEMEN PENGGUNA (ADMIN ONLY)
-- SISTEM AUTOMASI PEKERJAAN ADMINISTRASI (APA) - BPS KABUPATEN RAJA AMPAT
-- ==============================================================================
-- Jalankan seluruh script ini di menu "SQL Editor" pada dashboard Supabase Anda.
-- Fitur yang disediakan:
-- 1. Mengambil seluruh data user beserta role & status (admin_get_all_users)
-- 2. Menambah pengguna baru dengan enkripsi password (admin_create_user)
-- 3. Mengatur/mencabut role dengan proteksi minimal 1 role & admin tetap rizal.akbar (admin_update_user_roles)
-- 4. Reset password pengguna oleh admin (admin_reset_user_password)
-- 5. Menghapus pengguna dengan proteksi admin tetap rizal.akbar (admin_delete_user)
-- ==============================================================================

-- Pastikan ekstensi pgcrypto aktif
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. FUNGSI: Ambil Seluruh Data Pengguna untuk Halaman Admin
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
    id BIGINT,
    username TEXT,
    full_name TEXT,
    role TEXT,
    roles JSONB,
    must_change_password BOOLEAN,
    created_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    pegawai_nip TEXT,
    status_kepegawaian TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.full_name,
        u.role,
        u.roles,
        u.must_change_password,
        u.created_at,
        u.last_login,
        dp.pegawai_nip,
        COALESCE(dp.status_kepegawaian, 'aktif') AS status_kepegawaian
    FROM public.users u
    LEFT JOIN public.data_pegawai dp ON lower(u.username) = lower(dp.username)
    ORDER BY u.id ASC;
END;
$$;

-- 2. FUNGSI: Tambah Pengguna Baru oleh Admin
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
    v_user_id BIGINT;
    v_primary_role TEXT;
BEGIN
    p_username := lower(trim(p_username));
    p_full_name := trim(p_full_name);

    IF p_username = '' OR p_full_name = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Username dan Nama Lengkap wajib diisi');
    END IF;

    -- Validasi: User minimal memiliki 1 role
    IF p_roles IS NULL OR jsonb_array_length(p_roles) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'User minimal harus memiliki 1 role');
    END IF;

    IF EXISTS (SELECT 1 FROM public.users WHERE lower(username) = p_username) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Username sudah terdaftar');
    END IF;

    IF p_roles ? 'admin' THEN
        v_primary_role := 'admin';
    ELSE
        v_primary_role := 'user';
    END IF;

    INSERT INTO public.users (username, password_hash, must_change_password, full_name, role, roles)
    VALUES (
        p_username,
        extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
        TRUE,
        p_full_name,
        v_primary_role,
        p_roles
    )
    RETURNING id INTO v_user_id;

    -- Hubungkan ke data_pegawai jika NIP diisi
    IF p_nip IS NOT NULL AND trim(p_nip) <> '' THEN
        INSERT INTO public.data_pegawai (username, pegawai_nip, status_kepegawaian)
        VALUES (p_username, trim(p_nip), 'aktif')
        ON CONFLICT (pegawai_nip) DO UPDATE SET username = EXCLUDED.username;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Pengguna berhasil ditambahkan', 'user_id', v_user_id);
END;
$$;

-- 3. FUNGSI: Perbarui Role / Hak Akses Pengguna oleh Admin
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
    v_primary_role TEXT;
BEGIN
    p_username := lower(trim(p_username));

    -- Validasi: User minimal memiliki 1 role
    IF p_roles IS NULL OR jsonb_array_length(p_roles) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'User minimal harus memiliki 1 role!');
    END IF;

    -- Validasi: rizal.akbar adalah admin tetap (role admin tidak bisa dicabut)
    IF p_username = 'rizal.akbar' AND NOT (p_roles ? 'admin') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role admin untuk rizal.akbar tidak dapat dicabut (Admin Tetap)!');
    END IF;

    IF p_roles ? 'admin' THEN
        v_primary_role := 'admin';
    ELSE
        v_primary_role := 'user';
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

-- 4. FUNGSI: Reset Password Pengguna oleh Admin
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    p_username TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    p_username := lower(trim(p_username));

    IF length(p_new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Password minimal 6 karakter');
    END IF;

    UPDATE public.users
    SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
        must_change_password = TRUE
    WHERE lower(username) = p_username;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak ditemukan');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Password berhasil direset. User wajib mengganti password saat login.');
END;
$$;

-- 5. FUNGSI: Hapus Pengguna oleh Admin
CREATE OR REPLACE FUNCTION public.admin_delete_user(
    p_username TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    p_username := lower(trim(p_username));

    -- Validasi: rizal.akbar tidak boleh dihapus
    IF p_username = 'rizal.akbar' THEN
        RETURN jsonb_build_object('success', false, 'message', 'User rizal.akbar adalah Admin Tetap dan tidak dapat dihapus!');
    END IF;

    DELETE FROM public.users WHERE lower(username) = p_username;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak ditemukan');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Pengguna berhasil dihapus');
END;
$$;

-- 6. BERIKAN HAK AKSES EKSEKUSI RPC KE ANON & AUTHENTICATED
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_user(TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_roles(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(TEXT) TO anon, authenticated;
