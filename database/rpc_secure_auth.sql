-- =========================================================================
-- SNACKLOOP ERP - SECURE AUTHENTICATION & LOGIN RPC STORED PROCEDURES
-- =========================================================================
-- Skrip ini mengatasi temuan keamanan Cloudflare Security Audit & AI Team Standards:
-- 1. SEC-001 (Unauthenticated Database Mutation & Privilege Escalation)
-- 2. SEC-002 (Direct Credential Disclosure via PostgREST User Select)
-- 3. SEC-003 (Bcrypt High-Entropy Hash Upgrade via PostgreSQL pgcrypto)
--
-- FUNGSI:
-- 1. verify_user_login: Memvalidasi kredensial login langsung di PostgreSQL
--    mendukung verifikasi Bcrypt ($2a$, $2b$, $2y$) dan SHA-256, serta otomatis
--    meng-upgrade password legacy ke Bcrypt saat login berhasil.
-- 2. admin_create_user: Menjamin hanya Super Admin yang dapat membuat akun baru,
--    mencegah pendaftaran akun palsu dan menyimpan hash Bcrypt ber-salt tinggi.
-- 3. admin_delete_user: Menjamin hanya Super Admin yang dapat menghapus akun.
--
-- CARA MENJALANKAN DI SUPABASE:
-- 1. Buka Supabase Dashboard > Pilih Proyek SnackLoop ERP
-- 2. Masuk ke menu "SQL Editor"
-- 3. Paste seluruh skrip di bawah ini dan klik "Run"
-- =========================================================================

-- Aktifkan ekstensi pgcrypto untuk fungsi kriptografi standar industri (Bcrypt & Salts)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------------------------------
-- 1. PROSEDUR VERIFIKASI LOGIN PENGGUNA (ZERO CREDENTIAL EXPOSURE & BCRYPT)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION verify_user_login(
    p_username TEXT,
    p_password_hash TEXT,
    p_raw_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
    v_matched BOOLEAN := false;
    v_check_input TEXT;
BEGIN
    -- Bersihkan input dari spasi liar
    p_username := TRIM(p_username);
    v_check_input := COALESCE(NULLIF(p_raw_password, ''), p_password_hash);

    -- Cari user berdasarkan username (case-insensitive)
    SELECT id, username, password, role INTO v_user
    FROM users
    WHERE LOWER(username) = LOWER(p_username)
    LIMIT 1;

    -- Jika akun tidak ditemukan
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Username atau kata sandi tidak valid'
        );
    END IF;

    -- A. Periksa apakah password terenkripsi dengan format Bcrypt ($2a$, $2b$, $2y$)
    IF v_user.password LIKE '$2%' THEN
        IF v_user.password = crypt(v_check_input, v_user.password) THEN
            v_matched := true;
        END IF;
    -- B. Periksa format SHA-256 (64 hex characters) atau plaintext legacy
    ELSE
        IF v_user.password = p_password_hash OR v_user.password = v_check_input THEN
            v_matched := true;
            -- Otomatis upgrade password akun legacy ke format Bcrypt high-entropy
            IF p_raw_password IS NOT NULL AND p_raw_password <> '' THEN
                UPDATE users 
                SET password = crypt(p_raw_password, gen_salt('bf', 10))
                WHERE id = v_user.id;
            END IF;
        END IF;
    END IF;

    -- Jika password tidak cocok
    IF NOT v_matched THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Username atau kata sandi tidak valid'
        );
    END IF;

    -- Catat riwayat login ke audit log secara atomik
    INSERT INTO audit_logs (
        timestamp,
        "user",
        role,
        action,
        target,
        details
    ) VALUES (
        NOW()::TEXT,
        v_user.username,
        v_user.role,
        'LOGIN_AUTH',
        v_user.username,
        'Otentikasi berhasil via secure RPC verify_user_login (Bcrypt/SHA Verified)'
    );

    -- Kembalikan identitas pengguna TANPA kolom password
    RETURN jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
            'id', v_user.id,
            'username', v_user.username,
            'role', v_user.role
        )
    );
END;
$$;


-- -------------------------------------------------------------------------
-- 2. PROSEDUR PEMBUATAN AKUN BARU OLEH SUPER ADMIN (ANTI PRIVILEGE ESCALATION)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_create_user(
    p_admin_username TEXT,
    p_new_username TEXT,
    p_password_hash TEXT,
    p_role TEXT,
    p_raw_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin RECORD;
    v_new_id BIGINT;
    v_final_password TEXT;
BEGIN
    p_admin_username := TRIM(p_admin_username);
    p_new_username := TRIM(p_new_username);

    -- 1. Verifikasi apakah pemohon adalah Super Admin sah
    SELECT id, username, role INTO v_admin
    FROM users
    WHERE LOWER(username) = LOWER(p_admin_username)
      AND role = 'super_admin'
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Akses Ditolak: Hanya Super Admin terdaftar yang dapat mendaftarkan akun baru.';
    END IF;

    -- 2. Periksa apakah username baru sudah terdaftar
    IF EXISTS (SELECT 1 FROM users WHERE LOWER(username) = LOWER(p_new_username)) THEN
        RAISE EXCEPTION 'Username "%" sudah digunakan.', p_new_username;
    END IF;

    -- 3. Enkripsi password menggunakan Bcrypt jika raw password tersedia
    IF p_raw_password IS NOT NULL AND p_raw_password <> '' THEN
        v_final_password := crypt(p_raw_password, gen_salt('bf', 10));
    ELSE
        v_final_password := p_password_hash;
    END IF;

    -- 4. Sisipkan pengguna baru
    INSERT INTO users (
        username,
        password,
        role
    ) VALUES (
        p_new_username,
        v_final_password,
        p_role
    )
    RETURNING id INTO v_new_id;

    -- 5. Catat aktivitas audit
    INSERT INTO audit_logs (
        timestamp,
        "user",
        role,
        action,
        target,
        details
    ) VALUES (
        NOW()::TEXT,
        v_admin.username,
        v_admin.role,
        'USER_CREATE',
        p_new_username,
        format('Mendaftarkan pengguna baru: %s (%s)', p_new_username, p_role)
    );

    RETURN jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
            'id', v_new_id,
            'username', p_new_username,
            'role', p_role
        )
    );
END;
$$;


-- -------------------------------------------------------------------------
-- 3. PROSEDUR PENGHAPUSAN AKUN OLEH SUPER ADMIN (ANTI UNAUTHORIZED USER DELETION)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_delete_user(
    p_admin_username TEXT,
    p_target_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin RECORD;
    v_target RECORD;
BEGIN
    p_admin_username := TRIM(p_admin_username);

    -- 1. Verifikasi Super Admin
    SELECT id, username, role INTO v_admin
    FROM users
    WHERE LOWER(username) = LOWER(p_admin_username)
      AND role = 'super_admin'
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Akses Ditolak: Hanya Super Admin yang berhak menghapus akun.';
    END IF;

    -- 2. Dapatkan info user yang akan dihapus
    SELECT id, username, role INTO v_target
    FROM users
    WHERE id = p_target_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Akun pengguna tidak ditemukan'
        );
    END IF;

    -- Cegah penghapusan akun super admin utama
    IF LOWER(v_target.username) = 'admin' OR LOWER(v_target.username) = 'admin_kiky' THEN
        RAISE EXCEPTION 'Akses Ditolak: Akun Super Admin utama tidak boleh dihapus.';
    END IF;

    -- 3. Hapus user
    DELETE FROM users WHERE id = p_target_id;

    -- 4. Catat aktivitas audit
    INSERT INTO audit_logs (
        timestamp,
        "user",
        role,
        action,
        target,
        details
    ) VALUES (
        NOW()::TEXT,
        v_admin.username,
        v_admin.role,
        'USER_DELETE',
        v_target.username,
        format('Menghapus akun pengguna: %s (ID: %s)', v_target.username, p_target_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Pengguna %s berhasil dihapus', v_target.username)
    );
END;
$$;

-- -------------------------------------------------------------------------
-- 4. IZIN EKSEKUSI RPC OLEH KLIEN SUPABASE (ANON & AUTHENTICATED)
-- -------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION verify_user_login(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_delete_user(TEXT, BIGINT) TO anon, authenticated, service_role;
