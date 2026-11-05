-- =========================================================================
-- SNACKLOOP ERP - P1 (DATABASE SECURITY & VIEWS) & P3 (REALTIME SYNC SETUP)
-- =========================================================================
-- Skrip ini menyediakan:
-- 1. POSTGRES VIEWS TERISOLASI (P1): Memisahkan kolom rahasia (harga beli/modal
--    supplier, total modal, laba bersih, dan biaya operasional) agar tidak dapat
--    diakses oleh staf biasa maupun klien anon melalui API PostgREST.
-- 2. SUPABASE REALTIME REPLICATION (P3): Mendaftarkan tabel-tabel operasional
--    ke publikasi 'supabase_realtime' agar perubahan harga, transaksi, dan stok
--    dapat disiarkan secara instan (live sync) ke semua tablet, HP, dan laptop.
--
-- CARA MENJALANKAN DI SUPABASE:
-- 1. Buka Supabase Dashboard > Pilih Proyek SnackLoop ERP
-- 2. Masuk ke menu "SQL Editor"
-- 3. Paste seluruh skrip di bawah ini dan klik "Run"
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. POSTGRES VIEWS TERISOLASI UNTUK STAF KASIR & VIEWER (P1)
-- -------------------------------------------------------------------------

-- A. View Transaksi Staf: Bebas dari 'buy', 'total_modal', dan 'profit'
CREATE OR REPLACE VIEW view_staff_transactions AS
SELECT 
    id, 
    month_key, 
    date, 
    customer, 
    item_name, 
    source, 
    batch, 
    qty, 
    sell, 
    total_sell, 
    status, 
    notes, 
    extra_cost, 
    extra_cost_note, 
    created_at
FROM transactions;

-- B. View Produk Master Staf: Bebas dari 'buy' (harga modal dari agen/supplier)
CREATE OR REPLACE VIEW view_staff_master AS
SELECT 
    id, 
    name, 
    source, 
    sell, 
    agent_id, 
    created_at
FROM master;

-- C. View Repack Staf: Bebas dari 'modal_per_pcs'
CREATE OR REPLACE VIEW view_staff_repack AS
SELECT 
    id, 
    date, 
    name, 
    sell_target, 
    initial_qty, 
    remaining_qty, 
    created_at
FROM repack;

-- Berikan izin akses SELECT pada Views untuk role Supabase
GRANT SELECT ON view_staff_transactions TO anon, authenticated, service_role;
GRANT SELECT ON view_staff_master TO anon, authenticated, service_role;
GRANT SELECT ON view_staff_repack TO anon, authenticated, service_role;


-- -------------------------------------------------------------------------
-- 2. AKTIFKAN REPLIKASI SUPABASE REALTIME (P3)
-- -------------------------------------------------------------------------
-- Supabase menggunakan PostgreSQL Publication bernama 'supabase_realtime'.
-- Blok idempoten berikut memeriksa dan mendaftarkan tabel ke publikasi tersebut.

DO $$
BEGIN
    -- 1. master (Perubahan harga/produk langsung tersinkron ke semua perangkat)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'master'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE master;
    END IF;

    -- 2. transactions (Nota baru dari kasir A langsung muncul di kasir B & dashboard owner)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
    END IF;

    -- 3. invoices (Pelunasan tempo langsung sinkron real-time)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'invoices'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
    END IF;

    -- 4. repack (Sisa stok kemasan berkurang secara real-time antar perangkat)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'repack'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE repack;
    END IF;

    -- 5. customers (Daftar toko/pelanggan baru tersinkron langsung)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'customers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE customers;
    END IF;

    -- 6. returns (Klaim retur rusak langsung tersinkron)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'returns'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE returns;
    END IF;
END $$;

COMMENT ON VIEW view_staff_transactions IS 'SnackLoop ERP: Secure staff transactions view omitting wholesale costs and margins.';
COMMENT ON VIEW view_staff_master IS 'SnackLoop ERP: Secure staff product catalog view omitting supplier purchase prices.';
COMMENT ON VIEW view_staff_repack IS 'SnackLoop ERP: Secure staff repack stock view omitting internal repack unit costs.';
