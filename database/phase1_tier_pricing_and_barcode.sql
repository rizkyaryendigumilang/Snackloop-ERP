-- =========================================================================
-- SNACKLOOP ERP - MULTI-TIER PRICING & BARCODE COLUMNS ENHANCEMENT
-- =========================================================================
-- Skrip ini menambahkan dukungan harga grosir bertingkat (multi-tier pricing)
-- dan kode barcode pada tabel master produk.
--
-- CARA MENJALANKAN DI SUPABASE:
-- 1. Buka Supabase Dashboard > Pilih Proyek SnackLoop ERP
-- 2. Masuk ke menu "SQL Editor"
-- 3. Paste seluruh skrip di bawah ini dan klik "Run"
-- =========================================================================

-- 1. Tambahkan kolom barcode dan tier harga pada tabel master jika belum ada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'master' AND column_name = 'barcode'
    ) THEN
        ALTER TABLE master ADD COLUMN barcode VARCHAR(64) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'master' AND column_name = 'wholesale_price'
    ) THEN
        ALTER TABLE master ADD COLUMN wholesale_price NUMERIC(12, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'master' AND column_name = 'wholesale_min_qty'
    ) THEN
        ALTER TABLE master ADD COLUMN wholesale_min_qty INT DEFAULT 10;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'master' AND column_name = 'box_price'
    ) THEN
        ALTER TABLE master ADD COLUMN box_price NUMERIC(12, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'master' AND column_name = 'box_min_qty'
    ) THEN
        ALTER TABLE master ADD COLUMN box_min_qty INT DEFAULT 50;
    END IF;
END $$;

-- 2. Indeks untuk mempercepat pencarian barcode produk di POS
CREATE INDEX IF NOT EXISTS idx_master_barcode ON master (barcode);
CREATE INDEX IF NOT EXISTS idx_master_wholesale_price ON master (wholesale_price);
