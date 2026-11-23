# Master Produk Search Bar & Holistic Transaction Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a real-time search bar for the Master Produk catalog and a full-featured Edit Transaction modal in the Transaction Ledger that allows modifying date, customer, agent, custom buy/sell prices, quantity, extra cost, status, and notes with zero-variance holistic financial reconciliation across daily profit, monthly cards, financial dashboard, and linked invoices.

**Architecture:**
- Client-side debounced search filter on `masterData` array feeding into `renderMaster(filteredList)`.
- Dedicated Apple-styled modal dialog (`#modal-edit-trx`) in `index.html` with reactive live profit calculation.
- Transaction update engine in `src/modules/11-transactions.js` that recalculates line profit, daily profit aggregation, cross-month sheet migration, invoice total re-summation, Supabase sync mutation, and audit logging.

**Tech Stack:** Vanilla JavaScript (ES6+ modular), Tailwind CSS, FontAwesome 6, Feather Icons, Supabase JS Client, Capacitor native bridges.

**Spec:** `docs/superpowers/specs/2026-11-23-master-search-and-trx-edit-design.md`

## Global Constraints
- Zero duplicate top-level functions in `script.js`.
- Zero `transition: all` in `style.css`.
- Strict mathematical proof: $\text{Total Sell} - \text{Total Modal} - \text{Extra Cost} = \text{Profit} \iff \Delta = 0$.
- No corruption or alteration of existing historical transactions or master data.
- Maintain full responsiveness across mobile (< 640px) and desktop (>= 640px).
- All 24 existing unit tests must continue to pass, plus a new Test 25.

## Review Focus
1. Editing buy/sell price in a transaction must NOT overwrite the global Master Produk catalog price.
2. Editing a transaction's date into a different month (e.g. Nov 2026 to Okt 2026) must cleanly migrate the transaction object across `transactionData` month keys and update Supabase `month_key`.
3. Editing an item that is part of a multi-item invoice must automatically update the invoice's `total_amount` to reflect the sum of all its items.
4. Editing extra cost (ongkir/operational) must directly deduct from `profitPerItem` and daily profit while preserving total sell and total modal.
5. In-memory master search must handle Indonesian diacritics and case-insensitivity without breaking table action buttons.

---

### Task 1: Master Produk Real-Time Search Bar

**Files:**
- Modify: `index.html:1529-1538`
- Modify: `src/modules/09-master.js:42-146`
- Modify: `scripts/test.js` (add unit checks)

**Interfaces:**
- Consumes: `masterData` (Array of products)
- Produces: `filterMasterTable(keyword: string)` and `renderMaster(customList?: Array)`

- [ ] **Step 1: Write the failing test for `filterMasterTable` in `scripts/test.js`**

```javascript
// Test search filtering on masterData
const dummyMaster = [
    { id: 1, name: "Le Mineral 600ml", source: "Agen Mineral Mampang", barcode: "899123456" },
    { id: 2, name: "Nextar Brownis", source: "Toko Sumber Aceh Kemang", barcode: "899654321" },
    { id: 3, name: "Vit Mineral 550ml", source: "Toko Sumber Aceh Kemang", barcode: "" }
];
const res1 = filterMasterList(dummyMaster, "mineral");
assert.strictEqual(res1.length, 2, "Should find 2 Mineral products");
const res2 = filterMasterList(dummyMaster, "Kemang");
assert.strictEqual(res2.length, 2, "Should find 2 products from Kemang");
const res3 = filterMasterList(dummyMaster, "899654");
assert.strictEqual(res3.length, 1, "Should find 1 product by barcode");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node -e "require('./scripts/test.js')"`
Expected: FAIL (function `filterMasterList` not defined)

- [ ] **Step 3: Implement search input markup in `index.html` and logic in `src/modules/09-master.js`**

Add markup above `master-table-body`:
```html
<div class="flex flex-wrap items-center justify-between gap-3 mb-4">
    <h3 class="text-base font-bold">Daftar Master Produk</h3>
    <div class="relative w-full sm:w-72">
        <i class="fa-solid fa-magnifying-glass text-xs text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
        <input type="text" id="master-search" oninput="debouncedFilterMaster()" placeholder="Cari produk, agen, barcode..." class="w-full pl-9 pr-8 py-2 theme-input border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <button type="button" id="master-search-clear" onclick="clearMasterSearch()" class="hidden absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"><i class="fa-solid fa-xmark"></i></button>
    </div>
</div>
```

Implement `renderMaster(customList)` and `filterMasterList(list, keyword)` in `src/modules/09-master.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add index.html src/modules/09-master.js scripts/test.js
git commit -m "feat(master): add real-time search bar to master product catalog"
```

---

### Task 2: Transaction Ledger Edit Modal UI & Form Wiring

**Files:**
- Modify: `index.html` (add `#modal-edit-trx` markup before end of body)
- Modify: `src/modules/11-transactions.js` (add edit button in table rows and mobile cards)

**Interfaces:**
- Consumes: Transaction row data (`t.id`, `t.date`, `t.customer`, `t.source`, `t.itemName`, `t.qty`, `t.buy`, `t.sell`, `t.extraCost`, `t.status`, `t.notes`)
- Produces: `openEditTrxModal(id: string|number)` and `closeEditTrxModal()`

- [ ] **Step 1: Write test verifying edit button rendering in transaction rows**

Verify that `renderTable()` produces an edit button with `onclick="openEditTrxModal(...)` and icon `<i class="fa-solid fa-pen"></i>` for every transaction.

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test.js`
Expected: FAIL (edit button missing from transaction rows)

- [ ] **Step 3: Implement `#modal-edit-trx` in `index.html` and wire `openEditTrxModal` in `src/modules/11-transactions.js`**

Modal contains:
- Header: "Edit Transaksi Penjualan"
- Inputs: `edit-trx-id`, `edit-trx-old-month`, `edit-trx-date`, `edit-trx-customer`, `edit-trx-source`, `edit-trx-item`, `edit-trx-qty`, `edit-trx-buy`, `edit-trx-sell`, `edit-trx-extra-cost`, `edit-trx-extra-cost-note`, `edit-trx-status`, `edit-trx-notes`.
- Live preview element: `#edit-trx-preview` showing live recalculation of Modal Total, Jual Total, Laba Bersih, and Margin %.
- Actions: Batal button (`closeEditTrxModal()`) and Simpan button (`type="submit"`).

Add Edit button to desktop `actionBtns` and mobile card views.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add index.html src/modules/11-transactions.js scripts/test.js
git commit -m "feat(transactions): wire edit transaction modal dialog and action buttons"
```

---

### Task 3: Holistic Transaction Edit Recalculation & Mutation Dispatch

**Files:**
- Modify: `src/modules/11-transactions.js:saveEditTrx`
- Modify: `src/modules/04-outbox.js:dispatchMutation`
- Modify: `scripts/test.js`

**Interfaces:**
- Consumes: Form submission from `#form-edit-trx`
- Produces: `saveEditTrx(event)` executing cross-month migration, invoice sum update, profit recalculation, Supabase mutation, and dashboard refresh.

- [ ] **Step 1: Write failing test for `saveEditTrx` logic and financial reconciliation**

Test scenarios in `scripts/test.js`:
1. Recalculation math: changing buy from 18.000 to 19.000, sell from 23.000 to 25.000, qty from 1 to 2, extraCost to 1.000:
   - Total modal = $2 \times 19.000 = 38.000$
   - Total sell = $2 \times 25.000 = 50.000$
   - Profit = $50.000 - 38.000 - 1.000 = 11.000$
   - Variance $\Delta = 0$.
2. Cross-month migration: changing date from `2026-11-20` to `2026-10-20` moves item from `Nov 2026` array to `Okt 2026` array.
3. Invoice update: editing item belonging to `INV-...` re-sums the invoice's total amount.

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test.js`
Expected: FAIL (`saveEditTrx` not yet implemented)

- [ ] **Step 3: Implement `saveEditTrx(e)` and full reconciliation in `src/modules/11-transactions.js`**

Implement complete workflow:
1. Extract and sanitize values using `getCleanNumber`.
2. Find transaction by ID across `transactionData`.
3. Check if month changed: if `newMonth !== oldMonth`, splice from old month and push to new month.
4. Calculate `totalModal = qty * buy`, `totalSell = qty * sell`, `profitPerItem = (sell - buy) * qty - extraCost`.
5. Update invoice `total_amount` if invoice reference exists in notes or invoiceData.
6. Trigger `calculateDailyProfits()`, `renderTable()`, `renderMobileCards()`, `updateMonthlyRecap()`, `updateDashboard()`.
7. Dispatch `UPDATE_TRANSACTION` mutation to Supabase.
8. Persist to local cache and log activity via `logAuditActivity`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/11-transactions.js src/modules/04-outbox.js scripts/test.js
git commit -m "feat(transactions): implement holistic reconciliation for transaction edits"
```

---

### Task 4: End-to-End Build, Test Suite Expansion & Mobile Asset Sync

**Files:**
- Modify: `scripts/test.js` (finalize Test 25)
- Modify: `dist/` (via `npm run build`)
- Modify: `android/` and `ios/` (via `npx cap copy`)

**Interfaces:**
- Consumes: Assembled `script.js` and updated `index.html`
- Produces: 25/25 passing automated tests, synchronized `dist/` and Capacitor mobile platforms.

- [ ] **Step 1: Execute `npm run build`**

Run: `npm run build`
Expected: Script bundling successful, 17 modules assembled into `script.js`, `dist/` populated.

- [ ] **Step 2: Run complete automated test suite**

Run: `node scripts/test.js`
Expected: 25/25 tests passed successfully with 0 errors.

- [ ] **Step 3: Synchronize Capacitor mobile wrappers**

Run: `npx cap copy`
Expected: Assets copied to android and ios assets successfully.

- [ ] **Step 4: Final verification & git commit/push**

```bash
git add .
git commit -m "feat: complete master search bar and transaction editing with holistic reconciliation"
git push origin main
```
