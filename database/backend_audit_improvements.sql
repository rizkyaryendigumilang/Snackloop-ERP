-- =========================================================================
-- SNACKLOOP ERP - BACKEND AUDIT REMEDIATION (DATABASE & API IMPROVEMENTS)
-- =========================================================================
-- Skrip ini menyelesaikan seluruh temuan pada Backend Audit (06-backend-agent.md):
-- 1. FOREIGN KEY CONSTRAINTS: Menjamin integritas referensial relasional di level PostgreSQL.
-- 2. CHECK CONSTRAINTS: Menolak nilai anomali (stok minus, harga negatif, format tanggal rusak).
-- 3. SERVER-SIDE PAGINATION RPC: Fungsi get_transactions_paginated untuk skalabilitas puluhan ribu baris.
--
-- CARA MENJALANKAN DI SUPABASE:
-- 1. Buka Supabase Dashboard > Pilih Proyek SnackLoop ERP
-- 2. Masuk ke menu "SQL Editor"
-- 3. Paste seluruh skrip di bawah ini dan klik "Run"
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. TAMBAHKAN CHECK CONSTRAINTS UNTUK INTEGRITAS DATA (DATA VALIDATION ENGINE)
-- -------------------------------------------------------------------------
DO $$
BEGIN
    -- A. Tabel transactions
    -- 1. Qty tidak boleh nol
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_qty_nonzero'
    ) THEN
        ALTER TABLE transactions 
        ADD CONSTRAINT chk_transactions_qty_nonzero 
        CHECK (qty <> 0);
    END IF;

    -- 2. Format tanggal ISO YYYY-MM-DD
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_date_format'
    ) THEN
        ALTER TABLE transactions 
        ADD CONSTRAINT chk_transactions_date_format 
        CHECK (date ~ '^\d{4}-\d{2}-\d{2}$');
    END IF;

    -- 3. Harga jual tidak boleh negatif
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_sell_price_nonnegative'
    ) THEN
        ALTER TABLE transactions 
        ADD CONSTRAINT chk_transactions_sell_price_nonnegative 
        CHECK (COALESCE(sell_price, 0) >= 0);
    END IF;

    -- B. Tabel repack (Gudang & Batch)
    -- 1. Sisa stok tidak boleh negatif (Anti Minus Stock Concurrency)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_repack_remaining_qty_nonnegative'
    ) THEN
        ALTER TABLE repack 
        ADD CONSTRAINT chk_repack_remaining_qty_nonnegative 
        CHECK (remaining_qty >= 0);
    END IF;

    -- 2. Target output kuantitas awal harus positif
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_repack_initial_qty_positive'
    ) THEN
        ALTER TABLE repack 
        ADD CONSTRAINT chk_repack_initial_qty_positive 
        CHECK (initial_qty > 0);
    END IF;

    -- 3. Modal per pcs tidak boleh negatif
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_repack_modal_nonnegative'
    ) THEN
        ALTER TABLE repack 
        ADD CONSTRAINT chk_repack_modal_nonnegative 
        CHECK (COALESCE(modal_per_pcs, 0) >= 0);
    END IF;

    -- C. Tabel expenses (Beban Operasional)
    -- 1. Nominal beban tidak boleh negatif
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_expenses_amount_nonnegative'
    ) THEN
        ALTER TABLE expenses 
        ADD CONSTRAINT chk_expenses_amount_nonnegative 
        CHECK (COALESCE(amount, 0) >= 0);
    END IF;

    -- 2. Format tanggal pengeluaran ISO YYYY-MM-DD
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_expenses_date_format'
    ) THEN
        ALTER TABLE expenses 
        ADD CONSTRAINT chk_expenses_date_format 
        CHECK (date ~ '^\d{4}-\d{2}-\d{2}$');
    END IF;

    -- D. Tabel invoices (Faktur & Piutang)
    -- 1. Total tagihan faktur tidak boleh negatif
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_total_amount_nonnegative'
    ) THEN
        ALTER TABLE invoices 
        ADD CONSTRAINT chk_invoices_total_amount_nonnegative 
        CHECK (COALESCE(total_amount, 0) >= 0);
    END IF;

    -- 2. Format tanggal invoice ISO YYYY-MM-DD
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_date_format'
    ) THEN
        ALTER TABLE invoices 
        ADD CONSTRAINT chk_invoices_date_format 
        CHECK (date ~ '^\d{4}-\d{2}-\d{2}$');
    END IF;

    -- E. Tabel master produk
    -- 1. Harga modal beli supplier tidak boleh negatif
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_master_buy_nonnegative'
    ) THEN
        ALTER TABLE master 
        ADD CONSTRAINT chk_master_buy_nonnegative 
        CHECK (COALESCE(buy, 0) >= 0);
    END IF;

    -- 2. Harga jual master tidak boleh negatif
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_master_sell_nonnegative'
    ) THEN
        ALTER TABLE master 
        ADD CONSTRAINT chk_master_sell_nonnegative 
        CHECK (COALESCE(sell, 0) >= 0);
    END IF;

    -- F. Tabel returns
    -- 1. Qty retur harus positif
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_returns_qty_positive'
    ) THEN
        ALTER TABLE returns 
        ADD CONSTRAINT chk_returns_qty_positive 
        CHECK (qty > 0);
    END IF;
END $$;


-- -------------------------------------------------------------------------
-- 2. TAMBAHKAN RELASI FOREIGN KEY SECARA AMAN (REFERENTIAL INTEGRITY)
-- -------------------------------------------------------------------------
DO $$
BEGIN
    -- Relasi master.agent_id -> agents(id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_master_agent_id'
    ) THEN
        -- Pastikan hanya pasang jika tabel agents ada
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') THEN
            ALTER TABLE master 
            ADD CONSTRAINT fk_master_agent_id 
            FOREIGN KEY (agent_id) 
            REFERENCES agents(id) 
            ON DELETE SET NULL;
        END IF;
    END IF;

    -- Relasi price_history.master_id -> master(id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_price_history_master_id'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_history') THEN
            ALTER TABLE price_history 
            ADD CONSTRAINT fk_price_history_master_id 
            FOREIGN KEY (master_id) 
            REFERENCES master(id) 
            ON DELETE CASCADE;
        END IF;
    END IF;
END $$;


-- -------------------------------------------------------------------------
-- 3. STORED PROCEDURE SERVER-SIDE PAGINATION (PAGINATED RPC GATEWAY)
-- -------------------------------------------------------------------------
-- Memungkinkan kasir/owner memuat halaman transaksi secara bertahap
-- dengan filter bulan dan pencarian dinamis langsung di level PostgreSQL.
CREATE OR REPLACE FUNCTION get_transactions_paginated(
    p_month_key TEXT DEFAULT NULL,
    p_page INT DEFAULT 1,
    p_page_size INT DEFAULT 25,
    p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset INT;
    v_total_count BIGINT;
    v_rows JSONB;
BEGIN
    p_page := GREATEST(1, COALESCE(p_page, 1));
    p_page_size := GREATEST(1, LEAST(100, COALESCE(p_page_size, 25)));
    v_offset := (p_page - 1) * p_page_size;

    -- 1. Hitung total baris yang cocok dengan filter
    SELECT COUNT(*) INTO v_total_count
    FROM transactions t
    WHERE (p_month_key IS NULL OR p_month_key = 'all' OR t.month_key = p_month_key)
      AND (
          p_search IS NULL OR p_search = '' OR 
          t.customer ILIKE '%' || p_search || '%' OR 
          t.item_name ILIKE '%' || p_search || '%'
      );

    -- 2. Ambil data terpaginasi dengan sorting stabil
    SELECT COALESCE(jsonb_agg(to_jsonb(sub)), '[]'::JSONB) INTO v_rows
    FROM (
        SELECT 
            t.id, 
            t.month_key, 
            t.date, 
            t.customer, 
            t.item_name, 
            t.source, 
            t.batch, 
            t.qty, 
            t.buy_price, 
            t.sell_price, 
            t.total_sell, 
            t.total_modal, 
            t.profit,
            t.status, 
            t.notes, 
            t.extra_cost, 
            t.extra_cost_note, 
            t.created_at
        FROM transactions t
        WHERE (p_month_key IS NULL OR p_month_key = 'all' OR t.month_key = p_month_key)
          AND (
              p_search IS NULL OR p_search = '' OR 
              t.customer ILIKE '%' || p_search || '%' OR 
              t.item_name ILIKE '%' || p_search || '%'
          )
        ORDER BY t.date DESC, t.id DESC
        LIMIT p_page_size
        OFFSET v_offset
    ) sub;

    RETURN jsonb_build_object(
        'success', true,
        'page', p_page,
        'page_size', p_page_size,
        'total_count', v_total_count,
        'total_pages', CEIL(v_total_count::NUMERIC / p_page_size),
        'data', v_rows
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_transactions_paginated TO anon, authenticated, service_role;

COMMENT ON FUNCTION get_transactions_paginated IS 'SnackLoop ERP: Server-Side Pagination & Search Gateway for Transactions.';
