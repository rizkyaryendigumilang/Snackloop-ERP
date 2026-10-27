// ==========================================================
// KONFIGURASI SUPABASE 
// ==========================================================
const SUPABASE_URL = 'https://wirypusjlaywxlnlpebc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hBxnQJOgix-cY8Bt5Tl6wQ_x1AOglpR';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentRole = null; 

let agentData = []; 
let masterData = []; 
let customerData = []; 
let repackData = []; 
let transactionData = {}; 
let expenseData = [];
let userData = [
    { id: 1, username: 'admin', role: 'super_admin' },
    { id: 2, username: 'staff1', role: 'staff_rekap' },
    { id: 3, username: 'admin_kiky', role: 'super_admin' }
];
let invoiceData = [];
let priceHistoryData = []; 
let returnData = [];
let currentReturnStatusFilter = 'all';
let currentReturnAgentFilter = 'all'; 

let activeMonthSheet = ""; 
let currentTransactionFilter = 'all'; 
let currentDashboardTimeFilter = 'all'; 
let currentRepackCalcResult = null;
let financialChartInstance = null;
let isCompact = false;
let transactionDateSortAsc = true; 
let isSyncing = false;

// State Pagination & In-Memory Search
let currentTransactionPage = 1;
const rowsPerPage = 25;
let currentSearchKeyword = '';
