-- =========================================================================
-- SNACKLOOP ERP - PHASE 2: EXPIRY DATE (FEFO) & TEMPO AR (ACCOUNTS RECEIVABLE)
-- =========================================================================
-- Skrip ini menambahkan pelacakan tanggal kadaluarsa (shelf-life FEFO)
-- dan manajemen jatuh tempo penjualan piutang pada tabel master & repack.
--
-- CARA MENJALANKAN DI SUPABASE:
-- 1. Buka Supabase Dashboard > Pilih Proyek SnackLoop ERP
-- 2. Masuk ke menu "SQL Editor"
-- 3. Paste seluruh skrip di bawah ini dan klik "Run"
-- =========================================================================

-- 1. Tambahkan kolom expiry_date pada tabel master jika belum ada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'master' AND column_name = 'expiry_date'
    ) THEN
        ALTER TABLE master ADD COLUMN expiry_date DATE DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'repack' AND column_name = 'expiry_date'
    ) THEN
        ALTER TABLE repack ADD COLUMN expiry_date DATE DEFAULT NULL;
    END IF;

    -- Kolom due_date pada invoices dan transactions untuk penjualan tempo
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'due_date'
    ) THEN
        ALTER TABLE invoices ADD COLUMN due_date DATE DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'due_date'
    ) THEN
        ALTER TABLE transactions ADD COLUMN due_date DATE DEFAULT NULL;
    END IF;
END $$;

-- 2. Indeks untuk query cepat peringatan kadaluarsa (FEFO) & jatuh tempo
CREATE INDEX IF NOT EXISTS idx_master_expiry_date ON master (expiry_date);
CREATE INDEX IF NOT EXISTS idx_repack_expiry_date ON repack (expiry_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices (due_date);
CREATE INDEX IF NOT EXISTS idx_transactions_due_date ON transactions (due_date);
