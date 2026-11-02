-- =========================================================================
-- SNACKLOOP ERP - ACID ATOMIC SALES TRANSACTION RPC STORED PROCEDURE
-- =========================================================================
-- Fungsi ini menjamin transaksi ACID (Atomicity, Consistency, Isolation, Durability)
-- saat kasir menyimpan penjualan:
-- 1. Pengurangan stok batch repack (dengan pengecekan stok mencukupi)
-- 2. Penyisipan baris ke tabel transactions
-- 3. Penyisipan baris nota ke tabel invoices
-- Jika salah satu gagal (misal stok habis atau nomor invoice duplikat),
-- seluruh operasi di-ROLLBACK secara otomatis tanpa meninggalkan partial state.
--
-- CARA MENJALANKAN DI SUPABASE:
-- 1. Buka Supabase Dashboard > Pilih Proyek SnackLoop ERP
-- 2. Masuk ke menu "SQL Editor"
-- 3. Paste seluruh skrip di bawah ini dan klik "Run"
-- =========================================================================

CREATE OR REPLACE FUNCTION create_sale_transaction_atomic(
    p_trx JSONB,
    p_inv JSONB,
    p_repack_batch_id TEXT DEFAULT NULL,
    p_repack_deduct_qty INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_trx_id BIGINT;
    v_new_inv_id BIGINT;
    v_current_stock INT;
BEGIN
    -- 1. Pengurangan Stok Repack jika batch id disertakan
    IF p_repack_batch_id IS NOT NULL AND p_repack_deduct_qty > 0 THEN
        -- Kunci baris dengan FOR UPDATE untuk mencegah race condition konkuren
        SELECT remaining_qty INTO v_current_stock
        FROM repack
        WHERE id = p_repack_batch_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Batch repack dengan ID % tidak ditemukan', p_repack_batch_id;
        END IF;

        IF v_current_stock < p_repack_deduct_qty THEN
            RAISE EXCEPTION 'Stok batch repack tidak mencukupi (Tersisa: %, Diminta: %)', v_current_stock, p_repack_deduct_qty;
        END IF;

        UPDATE repack
        SET remaining_qty = remaining_qty - p_repack_deduct_qty
        WHERE id = p_repack_batch_id;
    END IF;

    -- 2. Sisipkan baris transaksi
    INSERT INTO transactions (
        date,
        customer,
        item_name,
        source,
        batch,
        qty,
        buy_price,
        sell_price,
        total_sell,
        total_modal,
        profit,
        status,
        month_key,
        notes,
        extra_cost,
        extra_cost_note
    ) VALUES (
        (p_trx->>'date')::TEXT,
        (p_trx->>'customer')::TEXT,
        (p_trx->>'item_name')::TEXT,
        (p_trx->>'source')::TEXT,
        (p_trx->>'batch')::TEXT,
        (p_trx->>'qty')::INT,
        (p_trx->>'buy_price')::NUMERIC,
        (p_trx->>'sell_price')::NUMERIC,
        (p_trx->>'total_sell')::NUMERIC,
        (p_trx->>'total_modal')::NUMERIC,
        (p_trx->>'profit')::NUMERIC,
        (p_trx->>'status')::TEXT,
        (p_trx->>'month_key')::TEXT,
        (p_trx->>'notes')::TEXT,
        COALESCE((p_trx->>'extra_cost')::NUMERIC, 0),
        (p_trx->>'extra_cost_note')::TEXT
    )
    RETURNING id INTO v_new_trx_id;

    -- 3. Sisipkan baris nota invoice jika payload invoice ada
    IF p_inv IS NOT NULL AND (p_inv->>'invoice_number') IS NOT NULL THEN
        INSERT INTO invoices (
            invoice_number,
            date,
            customer_name,
            total_amount,
            status,
            item_details
        ) VALUES (
            (p_inv->>'invoice_number')::TEXT,
            (p_inv->>'date')::TEXT,
            (p_inv->>'customer_name')::TEXT,
            (p_inv->>'total_amount')::NUMERIC,
            COALESCE((p_inv->>'status')::TEXT, 'Belum Lunas'),
            p_inv->'item_details'
        )
        RETURNING id INTO v_new_inv_id;
    END IF;

    -- 4. Kembalikan ID hasil insert dalam format JSON
    RETURN jsonb_build_object(
        'success', true,
        'trx_id', v_new_trx_id,
        'inv_id', v_new_inv_id
    );
EXCEPTION
    WHEN OTHERS THEN
        -- PostgreSQL otomatis me-rollback transaksi ketika RAISE EXCEPTION
        RAISE;
END;
$$;
