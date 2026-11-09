-- =========================================================================
-- SNACKLOOP ERP - MASTER PRODUCT STOCK TRACKING & AUDIT ENHANCEMENTS
-- =========================================================================
-- Skrip ini menambahkan pelacakan stok dan peringatan kuantitas minimum
-- untuk produk yang bersumber dari Supplier pada tabel master.
--
-- CARA MENJALANKAN DI SUPABASE:
-- 1. Buka Supabase Dashboard > Pilih Proyek SnackLoop ERP
-- 2. Masuk ke menu "SQL Editor"
-- 3. Paste seluruh skrip di bawah ini dan klik "Run"
-- =========================================================================

-- 1. Tambahkan kolom stock_qty dan min_stock jika belum ada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'master' AND column_name = 'stock_qty'
    ) THEN
        ALTER TABLE master ADD COLUMN stock_qty INT DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'master' AND column_name = 'min_stock'
    ) THEN
        ALTER TABLE master ADD COLUMN min_stock INT DEFAULT 5;
    END IF;
END $$;

-- 2. Indeks untuk query pencarian cepat stok menipis
CREATE INDEX IF NOT EXISTS idx_master_stock_qty ON master (stock_qty);
CREATE INDEX IF NOT EXISTS idx_master_source ON master (source);

-- 3. Check Constraint: Stok master tidak boleh minus jika tidak diizinkan
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_master_stock_qty_nonnegative'
    ) THEN
        ALTER TABLE master 
        ADD CONSTRAINT chk_master_stock_qty_nonnegative 
        CHECK (stock_qty >= 0);
    END IF;
END $$;
