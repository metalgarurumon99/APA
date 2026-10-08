-- ==============================================================================
-- FIX AUTHENTICATION & CHANGE PASSWORD FUNCTIONS (SUPABASE SQL EDITOR)
-- Jalankan skrip ini di SQL Editor Supabase untuk memperbaiki fungsi login & ganti password.
-- ==============================================================================

-- 1. Pastikan ekstensi pgcrypto aktif di schema extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Perbaiki fungsi login_user dengan search_path yang mengikutsertakan extensions
CREATE OR REPLACE FUNCTION public.login_user(
    p_username TEXT,
    p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user RECORD;
    v_pegawai RECORD;
BEGIN
    p_username := trim(p_username);

    SELECT id, username, password_hash, must_change_password, full_name, role, roles
    INTO v_user
    FROM public.users
    WHERE lower(username) = lower(p_username);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Username atau password salah');
    END IF;

    -- Gunakan fungsi crypt dari schema extensions
    IF v_user.password_hash = extensions.crypt(p_password, v_user.password_hash) THEN
        UPDATE public.users SET last_login = now() WHERE id = v_user.id;

        -- Ambil NIP yang bersesuaian di data_pegawai
        SELECT pegawai_nip INTO v_pegawai FROM public.data_pegawai WHERE lower(username) = lower(v_user.username);

        RETURN jsonb_build_object(
            'success', true,
            'user', jsonb_build_object(
                'id', v_user.id,
                'username', v_user.username,
                'full_name', v_user.full_name,
                'role', v_user.role,
                'roles', v_user.roles,
                'must_change_password', v_user.must_change_password,
                'pegawai_nip', v_pegawai.pegawai_nip
            )
        );
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Username atau password salah');
    END IF;
END;
$$;

-- 3. Perbaiki fungsi change_user_password dengan search_path yang mengikutsertakan extensions
CREATE OR REPLACE FUNCTION public.change_user_password(
    p_username TEXT,
    p_old_password TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user RECORD;
BEGIN
    p_username := trim(p_username);

    IF length(p_new_password) < 6 OR p_new_password !~ '[A-Za-z]' OR p_new_password !~ '[0-9]' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Password minimal 6 karakter dan harus kombinasi huruf serta angka');
    END IF;

    SELECT id, password_hash INTO v_user FROM public.users WHERE lower(username) = lower(p_username);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak ditemukan');
    END IF;

    IF v_user.password_hash != extensions.crypt(p_old_password, v_user.password_hash) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Password lama tidak sesuai');
    END IF;

    -- Update hash baru dan set must_change_password = false di database
    UPDATE public.users
    SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
        must_change_password = FALSE,
        last_login = now()
    WHERE id = v_user.id;

    RETURN jsonb_build_object('success', true, 'message', 'Password berhasil diperbarui');
END;
$$;

-- 4. Berikan izin eksekusi ke peran anon dan authenticated
GRANT EXECUTE ON FUNCTION public.login_user(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_user_password(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_pegawai_profile(TEXT) TO anon, authenticated;
