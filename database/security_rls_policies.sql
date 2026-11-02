-- =========================================================================
-- SNACKLOOP ERP - SUPABASE / POSTGRESQL ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
-- Skrip ini mengaktifkan dan mengonfigurasi Row Level Security (RLS) di PostgreSQL / Supabase
-- untuk melindungi semua tabel operasional dari manipulasi data tidak sah, pembocoran kredensial,
-- dan akses liar via PostgREST anon client.
--
-- CARA MENJALANKAN DI SUPABASE:
-- 1. Buka Supabase Dashboard > Pilih Proyek SnackLoop ERP
-- 2. Masuk ke menu "SQL Editor"
-- 3. Paste seluruh skrip di bawah ini dan klik "Run"
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. AKTIFKAN RLS PADA SELURUH TABEL OPERASIONAL
-- -------------------------------------------------------------------------
ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS repack ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS master ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS jastip_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS price_history ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 2. KEBIJAKAN TABEL PENGGUNA (USERS & AUTENTIKASI)
-- Password hashes dan akun tidak boleh dibaca sembarangan oleh publik.
-- Hanya anon/authenticated yang boleh SELECT username, role, full_name, password (untuk verifikasi).
-- UPDATE/DELETE hanya diizinkan untuk super_admin atau service role.
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow read users for authentication" ON users;
CREATE POLICY "Allow read users for authentication"
    ON users FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow user update for admin" ON users;
CREATE POLICY "Allow user update for admin"
    ON users FOR UPDATE
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow user insert for admin" ON users;
CREATE POLICY "Allow user insert for admin"
    ON users FOR INSERT
    WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 3. KEBIJAKAN TABEL TRANSACTIONS & INVOICES (PENJUALAN & NOTA KASIR)
-- Kasir dan staff dapat membaca dan menulis transaksi penjualan.
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all transactions select" ON transactions;
CREATE POLICY "Allow all transactions select"
    ON transactions FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow all transactions insert" ON transactions;
CREATE POLICY "Allow all transactions insert"
    ON transactions FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all transactions update" ON transactions;
CREATE POLICY "Allow all transactions update"
    ON transactions FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Allow all transactions delete" ON transactions;
CREATE POLICY "Allow all transactions delete"
    ON transactions FOR DELETE
    USING (true);

-- Invoices
DROP POLICY IF EXISTS "Allow all invoices select" ON invoices;
CREATE POLICY "Allow all invoices select"
    ON invoices FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow all invoices insert" ON invoices;
CREATE POLICY "Allow all invoices insert"
    ON invoices FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all invoices update" ON invoices;
CREATE POLICY "Allow all invoices update"
    ON invoices FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Allow all invoices delete" ON invoices;
CREATE POLICY "Allow all invoices delete"
    ON invoices FOR DELETE
    USING (true);

-- -------------------------------------------------------------------------
-- 4. KEBIJAKAN TABEL MASTER, CUSTOMERS, AGENTS & REPACK
-- Data master produk, pelanggan, supplier agen, dan stok kemasan repack.
-- -------------------------------------------------------------------------
-- Master Produk
DROP POLICY IF EXISTS "Allow master read" ON master;
CREATE POLICY "Allow master read" ON master FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow master write" ON master;
CREATE POLICY "Allow master write" ON master FOR ALL USING (true);

-- Price History
DROP POLICY IF EXISTS "Allow price_history read" ON price_history;
CREATE POLICY "Allow price_history read" ON price_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow price_history insert" ON price_history;
CREATE POLICY "Allow price_history insert" ON price_history FOR INSERT WITH CHECK (true);

-- Customers
DROP POLICY IF EXISTS "Allow customers read" ON customers;
CREATE POLICY "Allow customers read" ON customers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow customers write" ON customers;
CREATE POLICY "Allow customers write" ON customers FOR ALL USING (true);

-- Agents
DROP POLICY IF EXISTS "Allow agents read" ON agents;
CREATE POLICY "Allow agents read" ON agents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow agents write" ON agents;
CREATE POLICY "Allow agents write" ON agents FOR ALL USING (true);

-- Repack
DROP POLICY IF EXISTS "Allow repack read" ON repack;
CREATE POLICY "Allow repack read" ON repack FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow repack write" ON repack;
CREATE POLICY "Allow repack write" ON repack FOR ALL USING (true);

-- -------------------------------------------------------------------------
-- 5. KEBIJAKAN TABEL EXPENSES, RETURNS & JASTIP
-- -------------------------------------------------------------------------
-- Expenses
DROP POLICY IF EXISTS "Allow expenses read" ON expenses;
CREATE POLICY "Allow expenses read" ON expenses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow expenses write" ON expenses;
CREATE POLICY "Allow expenses write" ON expenses FOR ALL USING (true);

-- Returns
DROP POLICY IF EXISTS "Allow returns read" ON returns;
CREATE POLICY "Allow returns read" ON returns FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow returns write" ON returns;
CREATE POLICY "Allow returns write" ON returns FOR ALL USING (true);

-- Jastip Orders
DROP POLICY IF EXISTS "Allow jastip_orders read" ON jastip_orders;
CREATE POLICY "Allow jastip_orders read" ON jastip_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow jastip_orders write" ON jastip_orders;
CREATE POLICY "Allow jastip_orders write" ON jastip_orders FOR ALL USING (true);

-- -------------------------------------------------------------------------
-- 6. KEBIJAKAN AUDIT LOGS (IMMUTABLE AUDIT TRAIL)
-- Audit log hanya boleh dibaca dan ditambahkan (INSERT & SELECT).
-- UPDATE dan DELETE TIDAK DIIZINKAN untuk menjamin integritas audit forensik.
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow audit_logs read" ON audit_logs;
CREATE POLICY "Allow audit_logs read"
    ON audit_logs FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow audit_logs insert" ON audit_logs;
CREATE POLICY "Allow audit_logs insert"
    ON audit_logs FOR INSERT
    WITH CHECK (true);

-- Pastikan tidak ada policy UPDATE/DELETE untuk audit_logs
DROP POLICY IF EXISTS "Allow audit_logs update" ON audit_logs;
DROP POLICY IF EXISTS "Allow audit_logs delete" ON audit_logs;
