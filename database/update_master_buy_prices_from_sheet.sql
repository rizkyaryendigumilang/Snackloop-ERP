-- =========================================================================
-- SNACKLOOP ERP - SINKRONISASI MASTER PRODUK DARI GOOGLE SPREADSHEET
-- Sumber: https://docs.google.com/spreadsheets/d/16-y31zsM8Trtn9AhKmnU5sprM2YkfSrt9EwU98w3euY/edit?usp=sharing
-- Memperbarui harga modal (buy) dan harga jual (sell) agar perhitungan
-- Laba Per Item (Harga Jual - Harga Beli Agen) 100% akurat.
-- =========================================================================

-- 1. Pastikan kolom buy dan sell ada pada tabel master
ALTER TABLE master ADD COLUMN IF NOT EXISTS buy NUMERIC DEFAULT 0;
ALTER TABLE master ADD COLUMN IF NOT EXISTS sell NUMERIC DEFAULT 0;

-- 2. Update harga beli agen (modal) & harga jual ke customer
UPDATE master SET buy = 50000, sell = 65000 WHERE name = 'Le Mineral 600ml' OR (name ILIKE '%Le Mineral 600ml%' AND name NOT ILIKE '%Mampang%');
UPDATE master SET buy = 42000, sell = 55000 WHERE name ILIKE '%Le Mineal 330ml%' OR name ILIKE '%Le Mineral 330ml%' OR name ILIKE '%Le Minerale 330ml%';
UPDATE master SET buy = 52000, sell = 70000 WHERE name = 'Le Mineral 1500ml' OR (name ILIKE '%Le Mineral 1500ml%' AND name NOT ILIKE '%Mampang%');
UPDATE master SET buy = 35000, sell = 55000 WHERE name ILIKE '%Vit Mineral 550ml%';
UPDATE master SET buy = 21000, sell = 23000 WHERE name ILIKE '%Nextar Brownis%' AND name NOT ILIKE '%SP%';
UPDATE master SET buy = 18000, sell = 22000 WHERE name ILIKE '%Slai o%lai Stawberry%' OR name ILIKE '%Slai o%lai Strawberry%';
UPDATE master SET buy = 21000, sell = 25000 WHERE name = 'Chocolatos' OR name ILIKE '%Chocolatos Choco%';
UPDATE master SET buy = 22000, sell = 23000 WHERE name ILIKE '%Sari Gandum Coklat%';
UPDATE master SET buy = 10000, sell = 17000 WHERE name = 'Momogi Jagung' OR (name ILIKE '%Momogi Jagung%' AND name NOT ILIKE '%Pedas%');
UPDATE master SET buy = 10000, sell = 17000 WHERE name ILIKE '%Momogi Keju%';
UPDATE master SET buy = 10000, sell = 17000 WHERE name ILIKE '%Momogi Coklat%';
UPDATE master SET buy = 18000, sell = 20000 WHERE name = 'Astor' OR name ILIKE '%Astor%';
UPDATE master SET buy = 18000, sell = 20000 WHERE name = 'Better';
UPDATE master SET buy = 18000, sell = 20000 WHERE name ILIKE '%Better Caramel%';
UPDATE master SET buy = 19000, sell = 20000 WHERE name ILIKE '%Coki-Coki%' OR name ILIKE '%Coki Coki%';
UPDATE master SET buy = 19000, sell = 22000 WHERE name ILIKE '%Superstar%';
UPDATE master SET buy = 26022, sell = 27000 WHERE name ILIKE '%Pocky Mini Size Box%';
UPDATE master SET buy = 24273, sell = 25000 WHERE name ILIKE '%Sari Gandum Peanute%' OR name ILIKE '%Sari Gandum Peanut%';
UPDATE master SET buy = 23274, sell = 25000 WHERE name ILIKE '%Chocolatos Mix Variant%';
UPDATE master SET buy = 12000, sell = 15000 WHERE name ILIKE '%SPIX Soba Renceng BBQ%';
UPDATE master SET buy = 20773, sell = 25000 WHERE name ILIKE '%Oishi Snack Renceng Pop Corn%';
UPDATE master SET buy = 20273, sell = 25000 WHERE name ILIKE '%Garuda Kacang Telur Pack%';
UPDATE master SET buy = 19523, sell = 23000 WHERE name ILIKE '%Slai o%lai Nanas%';
UPDATE master SET buy = 13023, sell = 17000 WHERE name ILIKE '%Go! Egg roll%' OR name ILIKE '%Go Egg roll%';
UPDATE master SET buy = 11733, sell = 15000 WHERE name ILIKE '%Gery Wafer Roll Coconut%';
UPDATE master SET buy = 10023, sell = 15000 WHERE name ILIKE '%Superco%' AND (source = 'GS' OR name ILIKE '%Superco%');
UPDATE master SET buy = 9398, sell = 15000 WHERE name ILIKE '%Nabati AHH Long Staw%' OR name ILIKE '%Nabati AHH Long Straw%';
UPDATE master SET buy = 9000, sell = 15000 WHERE name ILIKE '%Nabati AHH Long Chese%' OR name ILIKE '%Nabati AHH Long Cheese%';
UPDATE master SET buy = 9273, sell = 15000 WHERE name ILIKE '%Roma Malkist Keju Manis Renceng%';
UPDATE master SET buy = 9273, sell = 15000 WHERE name ILIKE '%Roma Malkist Original Renceng%';
UPDATE master SET buy = 9223, sell = 14000 WHERE name ILIKE '%Kacang Garuda Roast Renceng Bawang%';
UPDATE master SET buy = 9223, sell = 14000 WHERE name ILIKE '%Kacang Garuda Roast Renceng Pedas%';
UPDATE master SET buy = 8148, sell = 17000 WHERE name ILIKE '%Momogi Caramel%';
UPDATE master SET buy = 8148, sell = 17000 WHERE name ILIKE '%Momogi Rendang%';
UPDATE master SET buy = 8148, sell = 17000 WHERE name ILIKE '%Momogi Jagung Pedas%';
UPDATE master SET buy = 8148, sell = 17000 WHERE name ILIKE '%Momogi Seaweed%';
UPDATE master SET buy = 18523, sell = 23000 WHERE name ILIKE '%Nextar Brownis SP%';
UPDATE master SET buy = 9000, sell = 17000 WHERE name ILIKE '%Momogi Truffle%';
UPDATE master SET buy = 9000, sell = 17000 WHERE name ILIKE '%Momogi Soto Ayam%';
UPDATE master SET buy = 19346, sell = 23000 WHERE name ILIKE '%Ciki Chuba Balado%';
UPDATE master SET buy = 19346, sell = 23000 WHERE name ILIKE '%Ciki Chuba Keju%';
UPDATE master SET buy = 10505, sell = 15000 WHERE name ILIKE '%SaltCheese%' OR name ILIKE '%Salt Cheese%';
UPDATE master SET buy = 18000, sell = 23000 WHERE name ILIKE '%Mie Shorr Ayam Panggang%';
UPDATE master SET buy = 22000, sell = 25000 WHERE name ILIKE '%NoriGo Pedas%' OR name ILIKE '%Nori Renceng%';
UPDATE master SET buy = 9000, sell = 15000 WHERE name ILIKE '%Nabati Waffer Coklat%' OR name ILIKE '%Nabati Wafer Coklat%';
UPDATE master SET buy = 22000, sell = 25000 WHERE name ILIKE '%Dilan Matcha%';
UPDATE master SET buy = 22000, sell = 25000 WHERE name ILIKE '%Nextar Chocopie%' AND name NOT ILIKE '%Staw%' AND name NOT ILIKE '%Straw%';
UPDATE master SET buy = 9000, sell = 14000 WHERE name ILIKE '%Stick Biscuite Nissin%' OR name ILIKE '%Stick Biscuit Nissin%';
UPDATE master SET buy = 9000, sell = 13000 WHERE name ILIKE '%Soba Baldo%' OR name ILIKE '%Soba Balado%';
UPDATE master SET buy = 10000, sell = 20000 WHERE name ILIKE '%Mie Lidi%';
UPDATE master SET buy = 10000, sell = 11000 WHERE name ILIKE '%Kripik Kaca%';
UPDATE master SET buy = 7964, sell = 8000 WHERE name ILIKE '%Makaroni Pedas Daun Jeruk%';
UPDATE master SET buy = 8234, sell = 8000 WHERE name ILIKE '%Makaroni Ulir%';
UPDATE master SET buy = 6191, sell = 8000 WHERE name ILIKE '%Krupuk Seblak%';
UPDATE master SET buy = 18000, sell = 20000 WHERE name ILIKE '%Apetito Snack Stik%';
UPDATE master SET buy = 6000, sell = 8000 WHERE name ILIKE '%Basreng Daun Jeruk%';
UPDATE master SET buy = 22000, sell = 25000 WHERE name ILIKE '%Nextar Chocopie Staw%' OR name ILIKE '%Nextar Chocopie Straw%';
UPDATE master SET buy = 22000, sell = 25000 WHERE name ILIKE '%Chupacups%' OR name ILIKE '%Chupa Chups%';
UPDATE master SET buy = 11000, sell = 16000 WHERE name ILIKE '%Fruta Gummy%';
UPDATE master SET buy = 4375, sell = 5500 WHERE name = 'Popmie Biasa Kuah' OR (name ILIKE '%Popmie Biasa Kuah%' AND name NOT ILIKE '%Karton%');
UPDATE master SET buy = 27788, sell = 35000 WHERE name ILIKE '%Makaroni Bantet 1Kg%';
UPDATE master SET buy = 19799, sell = 25000 WHERE name ILIKE '%Seblak Rafael%';
UPDATE master SET buy = 22000, sell = 25000 WHERE name ILIKE '%Arden Blueberry%';
UPDATE master SET buy = 10000, sell = 12000 WHERE name ILIKE '%Floaty%';
UPDATE master SET buy = 22000, sell = 25000 WHERE name ILIKE '%Good Time%';
UPDATE master SET buy = 18000, sell = 23000 WHERE name ILIKE '%Caca%';
UPDATE master SET buy = 11000, sell = 20000 WHERE name = 'Cannonball' OR (name ILIKE '%Cannonball%' AND name NOT ILIKE '%Big Size%');
UPDATE master SET buy = 22000, sell = 25000 WHERE name ILIKE '%Bonita%';
UPDATE master SET buy = 22000, sell = 25000 WHERE name ILIKE '%Oreo Softcake%';
UPDATE master SET buy = 18000, sell = 28000 WHERE name ILIKE '%OMG Snack%';
UPDATE master SET buy = 22000, sell = 25000 WHERE name ILIKE '%Marie Gold%';
UPDATE master SET buy = 10000, sell = 12000 WHERE name ILIKE '%Makaroni Naruto%';
UPDATE master SET buy = 9000, sell = 13000 WHERE name ILIKE '%Roti Aoka%';
UPDATE master SET buy = 60000, sell = 70000 WHERE name ILIKE '%Le Mineral 1500ml Agen Mampang%';
UPDATE master SET buy = 52000, sell = 65000 WHERE name ILIKE '%Le Mineral 600ml Agen Mampang%';
UPDATE master SET buy = 22000, sell = 26000 WHERE name ILIKE '%Cannonball Big Size%';
UPDATE master SET buy = 108000, sell = 130000 WHERE name ILIKE '%Popmie Biasa Kuah Mix 1 Karton 24PCs%' OR name ILIKE '%Popmie%1 Karton%';
UPDATE master SET buy = 5805, sell = 6500 WHERE name ILIKE '%Nice Tissu%' OR name ILIKE '%Nice Tissue%';
UPDATE master SET buy = 19000, sell = 26000 WHERE name ILIKE '%Choki%Stick%';

-- 3. Self-heal transaksi historis yang memiliki total_modal = 0 atau profit = 0
UPDATE transactions t
SET 
    buy_price = COALESCE(NULLIF(t.buy_price, 0), m.buy, 0),
    total_modal = CASE 
        WHEN COALESCE(t.total_modal, 0) = 0 AND m.buy > 0 THEN (m.buy * ABS(t.qty)) + COALESCE(t.extra_cost, 0)
        ELSE t.total_modal 
    END,
    profit = CASE 
        WHEN COALESCE(t.profit, 0) = 0 AND m.buy > 0 AND COALESCE(t.sell_price, 0) > 0 THEN (t.sell_price - m.buy)
        ELSE t.profit 
    END
FROM master m
WHERE LOWER(TRIM(t.item_name)) = LOWER(TRIM(m.name))
  AND (COALESCE(t.total_modal, 0) = 0 OR COALESCE(t.profit, 0) = 0);
