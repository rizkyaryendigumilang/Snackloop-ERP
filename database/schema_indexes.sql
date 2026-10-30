-- =========================================================================
-- SNACKLOOP ERP - SUPABASE / POSTGRESQL PRODUCTION INDEXING & PERFORMANCE
-- =========================================================================
-- Skrip ini mengoptimalkan throughput query PostgreSQL, eliminasi sequential scan (Full Table Scan),
-- dan mempercepat respon REST API PostgREST pada jaringan kasir mobile & desktop.
--
-- CARA MENJALANKAN DI SUPABASE:
-- 1. Buka Supabase Dashboard > Pilih Proyek SnackLoop ERP
-- 2. Masuk ke menu "SQL Editor"
-- 3. Paste seluruh skrip di bawah ini dan klik "Run"
-- =========================================================================

-- 1. TABEL TRANSACTIONS (Volume Tertinggi)
-- Mempercepat filter tanggal rekap bulanan, pengurutan nota, dan customer leaderboard
CREATE INDEX IF NOT EXISTS idx_transactions_date 
    ON transactions (date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_month_key 
    ON transactions (month_key);

CREATE INDEX IF NOT EXISTS idx_transactions_customer 
    ON transactions (customer);

CREATE INDEX IF NOT EXISTS idx_transactions_status 
    ON transactions (status);

CREATE INDEX IF NOT EXISTS idx_transactions_source_batch 
    ON transactions (source, batch);

-- Composite Index untuk query kasir (Filter Bulan + Status Pembayaran)
CREATE INDEX IF NOT EXISTS idx_transactions_month_status 
    ON transactions (month_key, status);


-- 2. TABEL INVOICES (Manajemen Faktur & Aging Piutang)
-- Mempercepat filter umur piutang, pelunasan cepat, dan query per bulan
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_number 
    ON invoices (invoice_number);

CREATE INDEX IF NOT EXISTS idx_invoices_date 
    ON invoices (date DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_name 
    ON invoices (customer_name);

CREATE INDEX IF NOT EXISTS idx_invoices_status 
    ON invoices (status);

-- Composite Index untuk filter Aging Piutang (Status + Tanggal Jatuh Tempo)
CREATE INDEX IF NOT EXISTS idx_invoices_status_date 
    ON invoices (status, date DESC);


-- 3. TABEL EXPENSES (Pengeluaran Kas Operasional)
-- Mempercepat kalkulasi laba bersih bulanan dan pelaporan P&L
CREATE INDEX IF NOT EXISTS idx_expenses_date 
    ON expenses (date DESC);


-- 4. TABEL REPACK (Gudang & Batch Produksi)
-- Mempercepat pengecekan sisa stok batch yang masih aktif
CREATE INDEX IF NOT EXISTS idx_repack_remaining_qty 
    ON repack (remaining_qty);

CREATE INDEX IF NOT EXISTS idx_repack_created_at 
    ON repack (created_at DESC);


-- 5. TABEL MASTER PRODUK, AGEN & PELANGGAN
CREATE INDEX IF NOT EXISTS idx_master_agent_id 
    ON master (agent_id);

CREATE INDEX IF NOT EXISTS idx_master_name 
    ON master (name);

CREATE INDEX IF NOT EXISTS idx_customers_name 
    ON customers (name);

CREATE INDEX IF NOT EXISTS idx_agents_name 
    ON agents (name);


-- 6. TABEL RETURNS (Retur & Klaim Toko)
CREATE INDEX IF NOT EXISTS idx_returns_date 
    ON returns (date DESC);

CREATE INDEX IF NOT EXISTS idx_returns_claim_status 
    ON returns (claim_status);

CREATE INDEX IF NOT EXISTS idx_returns_date_status 
    ON returns (date DESC, claim_status);


-- 7. TABEL PRICE_HISTORY & JASTIP_ORDERS
CREATE INDEX IF NOT EXISTS idx_price_history_product_id 
    ON price_history (product_id);

CREATE INDEX IF NOT EXISTS idx_price_history_created_at 
    ON price_history (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jastip_orders_order_date 
    ON jastip_orders (order_date DESC);

CREATE INDEX IF NOT EXISTS idx_jastip_orders_status 
    ON jastip_orders (status);


-- =========================================================================
-- OPTIMISASI STATISTIK POSTGRESQL (ANALYZE)
-- Memperbarui katalog statistik query planner Supabase setelah pembuatan indeks
-- =========================================================================
ANALYZE transactions;
ANALYZE invoices;
ANALYZE expenses;
ANALYZE repack;
ANALYZE master;
ANALYZE customers;
ANALYZE agents;
ANALYZE returns;
ANALYZE price_history;
ANALYZE jastip_orders;
