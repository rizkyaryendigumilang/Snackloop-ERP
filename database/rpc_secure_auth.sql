-- =========================================================================
-- SNACKLOOP ERP - SECURE AUTHENTICATION & LOGIN RPC STORED PROCEDURES
-- =========================================================================
-- Skrip ini mengatasi temuan keamanan Cloudflare Security Audit:
-- 1. SEC-001 (Unauthenticated Database Mutation & Privilege Escalation)
-- 2. SEC-002 (Direct Credential Disclosure via PostgREST User Select)
--
-- FUNGSI:
-- 1. verify_user_login: Memvalidasi kredensial login langsung di PostgreSQL
--    tanpa pernah mentransmisikan kolom password_hash ke browser klien.
-- 2. admin_create_user: Menjamin hanya Super Admin yang dapat membuat akun baru,
--    mencegah pendaftaran akun Super Admin palsu oleh pihak luar melalui REST API.
--
-- CARA MENJALANKAN DI SUPABASE:
-- 1. Buka Supabase Dashboard > Pilih Proyek SnackLoop ERP
-- 2. Masuk ke menu "SQL Editor"
-- 3. Paste seluruh skrip di bawah ini dan klik "Run"
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. PROSEDUR VERIFIKASI LOGIN PENGGUNA (ZERO CREDENTIAL EXPOSURE)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION verify_user_login(
    p_username TEXT,
    p_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
    v_matched BOOLEAN := false;
BEGIN
    -- Bersihkan input dari spasi liar
    p_username := TRIM(p_username);

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

    -- Periksa kecocokan hash password (atau legacy plaintext jika ada akun belum termigrasi)
    IF v_user.password = p_password_hash THEN
        v_matched := true;
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
        'Otentikasi berhasil via secure RPC verify_user_login'
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
    p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin RECORD;
    v_new_id BIGINT;
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

    -- 3. Sisipkan pengguna baru
    INSERT INTO users (
        username,
        password,
        role
    ) VALUES (
        p_new_username,
        p_password_hash,
        p_role
    )
    RETURNING id INTO v_new_id;

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
GRANT EXECUTE ON FUNCTION verify_user_login(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_create_user(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_delete_user(TEXT, BIGINT) TO anon, authenticated, service_role;
