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
    { id: 1, username: 'admin', role: 'super_admin' }
];
let invoiceData = [];
let priceHistoryData = []; 
let returnData = [];
let auditLogData = [];
let currentAuditActionFilter = 'all';
let currentAuditSearchKeyword = '';
let currentReturnStatusFilter = 'all';
let currentReturnAgentFilter = 'all'; 

let activeMonthSheet = ""; 
let activeTransactionYear = "";
let isTransactionMonthsExpanded = true;
let shouldAnimateTransactionMonths = true;
const lastActiveMonthByYear = {};
let currentTransactionFilter = 'all'; 
let currentDashboardTimeFilter = 'all'; 
let currentRepackCalcResult = null;
let financialChartInstance = null;
let isCompact = false;
let transactionSortField = 'date';
let transactionSortOrder = 'desc';
let isSyncing = false;

// State Pagination & In-Memory Search
let currentTransactionPage = 1;
const rowsPerPage = 25;
let currentSearchKeyword = '';

// State Pagination & Filtering Invoice
let activeInvoiceMonthSheet = '';
let activeInvoiceYear = "";
let isInvoiceMonthsExpanded = true;
let shouldAnimateInvoiceMonths = true;
const lastActiveInvoiceMonthByYear = {};
let currentInvoicePage = 1;
const invoiceRowsPerPage = 25;
let currentInvoiceSearchKeyword = '';

// ==========================================================
// SNACKLOOP ENTERPRISE GLOBAL APPLICATION REGISTRY
// ==========================================================
window.SnackLoop = {
    version: '2.6.0',
    getUser: () => currentUser,
    getRole: () => currentRole,
    hasRole: (role) => currentRole === role,
    isSuperAdmin: () => currentRole === 'super_admin',
    isStaff: () => currentRole === 'staff_rekap',
    isOnline: () => (typeof navigator !== 'undefined' ? navigator.onLine : true),
    getAuditState: () => ({
        filter: currentAuditActionFilter,
        search: currentAuditSearchKeyword
    }),
    getState: () => ({
        agentData,
        masterData,
        customerData,
        repackData,
        transactionData,
        expenseData,
        invoiceData,
        priceHistoryData,
        returnData,
        auditLogData,
        activeMonthSheet,
        activeTransactionYear,
        activeInvoiceMonthSheet,
        activeInvoiceYear
    }),
    getLocalDateStr: (d) => (typeof getLocalDateStr === 'function' ? getLocalDateStr(d) : new Date().toISOString().slice(0, 10)),
    normalizeWaPhone: (p, fb) => (typeof normalizeWaPhone === 'function' ? normalizeWaPhone(p, fb) : String(p || '').replace(/\D/g, '').replace(/^0/, '62')),
    getClient: () => supabaseClient,
    security: {
        escapeHtml: (str) => (typeof escapeHtml === 'function' ? escapeHtml(str) : String(str || '')),
        hashPassword: (p) => (typeof hashPassword === 'function' ? hashPassword(p) : Promise.resolve(p))
    },
    api: {
        loadDataFromCloud: () => (typeof loadDataFromCloud === 'function' ? loadDataFromCloud() : Promise.resolve()),
        fetchServerPaginatedTransactions: (opts) => (typeof fetchServerPaginatedTransactions === 'function' ? fetchServerPaginatedTransactions(opts) : Promise.resolve({ success: false, data: [] }))
    },
    actions: {
        renderMaster: () => (typeof renderMaster === 'function' && renderMaster()),
        renderReturns: () => (typeof renderReturns === 'function' && renderReturns()),
        renderInvoicesTable: () => (typeof renderInvoicesTable === 'function' && renderInvoicesTable())
    }
};
