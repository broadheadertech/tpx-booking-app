/**
 * Walkthrough tutorial step configurations per role.
 *
 * Each step:
 *   target   — CSS selector for the element to spotlight (uses data-tour attribute)
 *   title    — Bold heading (short)
 *   message  — 1-2 line description
 *   position — Tooltip placement: 'top' | 'bottom' | 'left' | 'right'
 *   action   — Optional CSS selector to click before measuring (e.g. open a dropdown)
 */

// ─── Customer ────────────────────────────────────────────────────
export const customerSteps = [
  {
    target: '[data-tour="customer-nav-home"]',
    title: 'Welcome Home',
    message: 'This is your home feed — see updates, stories, and promos from your favorite branches.',
    position: 'top',
  },
  {
    target: '[data-tour="customer-nav-booking"]',
    title: 'Book a Haircut',
    message: 'Tap here to browse nearby branches, pick a barber, and book your appointment.',
    position: 'top',
  },
  {
    target: '[data-tour="customer-nav-wallet"]',
    title: 'Wallet & Payments',
    message: 'Load your wallet for cashless payments and view your transaction history.',
    position: 'top',
  },
  {
    target: '[data-tour="customer-nav-shop"]',
    title: 'Shop Products',
    message: 'Browse and purchase grooming products from the marketplace.',
    position: 'top',
  },
  {
    target: '[data-tour="customer-nav-profile"]',
    title: 'Your Account',
    message: 'Set up your profile, view bookings, loyalty points, and vouchers.',
    position: 'top',
  },
]

// ─── Staff ───────────────────────────────────────────────────────
// Order matches primaryTabIds: overview, reports, bookings, pos, team, customers, products, finance, marketing, settings
export const staffSteps = [
  {
    target: '[data-tour="staff-tab-overview"]',
    title: 'Dashboard Overview',
    message: 'Welcome! This is your command center — key branch metrics at a glance.',
    position: 'bottom',
  },
  {
    target: '[data-tour="staff-tab-reports"]',
    title: 'Reports',
    message: 'View performance analytics, summaries, and branch reports.',
    position: 'bottom',
  },
  {
    target: '[data-tour="staff-tab-bookings"]',
    title: 'Bookings',
    message: 'View and manage all branch bookings here.',
    position: 'bottom',
  },
  {
    target: '[data-tour="staff-tab-pos"]',
    title: 'Point of Sale',
    message: 'Process payments for services and products.',
    position: 'bottom',
  },
  {
    target: '[data-tour="staff-tab-team"]',
    title: 'Team Management',
    message: 'Manage barber schedules, walk-ins, and the live queue.',
    position: 'bottom',
  },
  {
    target: '[data-tour="staff-tab-customers"]',
    title: 'Customers',
    message: 'View customer profiles and booking history.',
    position: 'bottom',
  },
  {
    target: '[data-tour="staff-tab-products"]',
    title: 'Products & Inventory',
    message: 'Track your product catalog and stock levels.',
    position: 'bottom',
  },
  {
    target: '[data-tour="staff-tab-finance"]',
    title: 'Finance',
    message: 'Expenses, balance sheet, and financial tracking.',
    position: 'bottom',
  },
  {
    target: '[data-tour="staff-tab-marketing"]',
    title: 'Marketing',
    message: 'Send email campaigns and manage promotions.',
    position: 'bottom',
  },
  {
    target: '[data-tour="staff-tab-settings"]',
    title: 'Settings',
    message: 'Configure branch settings, branding, and preferences.',
    position: 'bottom',
  },
]

// ─── Branch Admin (same as staff with admin emphasis) ─────────
export const branchAdminSteps = staffSteps.map(step => {
  const overrides = {
    'staff-tab-overview': {
      title: 'Branch Dashboard',
      message: 'Your branch at a glance — live revenue, bookings, and team status.',
    },
    'staff-tab-finance': {
      title: 'Financial Dashboard',
      message: 'Full P&L, balance sheet, expenses, and royalty tracking for your branch.',
    },
  }
  const key = step.target.match(/data-tour="(.+?)"/)?.[1]
  return overrides[key] ? { ...step, ...overrides[key] } : step
})

// ─── Barber ──────────────────────────────────────────────────────
export const barberSteps = [
  {
    target: '[data-tour="barber-nav-overview"]',
    title: 'Your Dashboard',
    message: "Here's your daily schedule and upcoming appointments at a glance.",
    position: 'top',
  },
  {
    target: '[data-tour="barber-nav-bookings"]',
    title: 'My Bookings',
    message: "See who's coming in today and manage your appointments.",
    position: 'top',
  },
  {
    target: '[data-tour="barber-nav-portfolio"]',
    title: 'Portfolio',
    message: 'Showcase your work — upload photos of your best cuts.',
    position: 'top',
  },
  {
    target: '[data-tour="barber-nav-finance"]',
    title: 'Finance',
    message: 'Track your earnings, tips, and cash advances.',
    position: 'top',
  },
  {
    target: '[data-tour="barber-nav-schedule"]',
    title: 'Schedule',
    message: 'Set your availability and request time off.',
    position: 'top',
  },
]

// ─── Super Admin ─────────────────────────────────────────────────
export const superAdminSteps = [
  // --- Top-level tabs ---
  {
    target: '[data-tour="admin-tab-overview"]',
    title: 'Global Dashboard',
    message: 'Overview of all branches, total revenue, and system-wide activity.',
    position: 'bottom',
  },
  {
    target: '[data-tour="admin-tab-branches"]',
    title: 'Branch Management',
    message: 'Add, configure, and monitor all your branches from here.',
    position: 'bottom',
  },
  {
    target: '[data-tour="admin-tab-users"]',
    title: 'User Management',
    message: 'Control roles, permissions, and manage all user accounts. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
  },
  // --- Commerce category + sub-tabs ---
  {
    target: '[data-tour="admin-tab-Commerce"]',
    title: 'Commerce',
    message: 'Services, product catalog, vouchers, shop config, and deliveries.',
    position: 'bottom',
  },
  {
    target: '[data-tour="admin-subtab-default_services"]',
    title: 'Default Services',
    message: 'Define the default services available across all branches. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Commerce"]',
  },
  {
    target: '[data-tour="admin-subtab-catalog"]',
    title: 'Product Catalog',
    message: 'Manage the global product inventory and pricing. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Commerce"]',
  },
  {
    target: '[data-tour="admin-subtab-vouchers"]',
    title: 'Vouchers',
    message: 'Create and manage discount vouchers for customers. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Commerce"]',
  },
  {
    target: '[data-tour="admin-subtab-shop_config"]',
    title: 'Shop Config',
    message: 'Configure the online shop layout and product display settings. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Commerce"]',
  },
  {
    target: '[data-tour="admin-subtab-shop_banners"]',
    title: 'Shop Banners',
    message: 'Manage promotional banners displayed in the shop. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Commerce"]',
  },
  {
    target: '[data-tour="admin-subtab-delivery_orders"]',
    title: 'Delivery Orders',
    message: 'Track and manage product delivery orders. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Commerce"]',
  },
  // --- Finance category + sub-tabs ---
  {
    target: '[data-tour="admin-tab-Finance"]',
    title: 'Finance',
    message: 'Cross-branch P&L, balance sheets, royalties, and payroll.',
    position: 'bottom',
  },
  {
    target: '[data-tour="admin-subtab-pl"]',
    title: 'Profit & Loss',
    message: 'View the consolidated P&L across all branches. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Finance"]',
  },
  {
    target: '[data-tour="admin-subtab-balance_sheet"]',
    title: 'Balance Sheet',
    message: 'Assets, liabilities, and equity for the business. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Finance"]',
  },
  {
    target: '[data-tour="admin-subtab-royalty"]',
    title: 'Royalty',
    message: 'Track franchise royalty fees and settlements. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Finance"]',
  },
  {
    target: '[data-tour="admin-subtab-settlements"]',
    title: 'Settlements',
    message: 'View and process branch payment settlements. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Finance"]',
  },
  {
    target: '[data-tour="admin-subtab-wallet"]',
    title: 'Wallet Overview',
    message: 'Monitor customer wallet balances and top-ups. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Finance"]',
  },
  {
    target: '[data-tour="admin-subtab-wallet_analytics"]',
    title: 'Wallet Analytics',
    message: 'Analyze wallet usage trends and transaction patterns. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Finance"]',
  },
  // --- Marketing category + sub-tabs ---
  {
    target: '[data-tour="admin-tab-Marketing"]',
    title: 'Marketing',
    message: 'Loyalty, promotions, email campaigns, and branding.',
    position: 'bottom',
  },
  {
    target: '[data-tour="admin-subtab-loyalty"]',
    title: 'Loyalty Program',
    message: 'Configure loyalty tiers, points, and rewards. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Marketing"]',
  },
  {
    target: '[data-tour="admin-subtab-promotions"]',
    title: 'Promotions',
    message: 'Create and manage promotional campaigns. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Marketing"]',
  },
  {
    target: '[data-tour="admin-subtab-email_marketing"]',
    title: 'Email AI',
    message: 'AI-powered email marketing campaigns. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Marketing"]',
  },
  {
    target: '[data-tour="admin-subtab-branding"]',
    title: 'Branding',
    message: 'Customize app colors, logos, and brand identity. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Marketing"]',
  },
  {
    target: '[data-tour="admin-subtab-emails"]',
    title: 'Email Templates',
    message: 'Manage email templates and notification settings. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Marketing"]',
  },
  {
    target: '[data-tour="admin-subtab-customer_analytics"]',
    title: 'Customer Analytics',
    message: 'View customer behavior insights and engagement metrics. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Marketing"]',
  },
  // --- Reports category + sub-tabs ---
  {
    target: '[data-tour="admin-tab-Reports"]',
    title: 'Reports',
    message: 'Analytics, performance summaries, and audit trails.',
    position: 'bottom',
  },
  {
    target: '[data-tour="admin-subtab-reports"]',
    title: 'System Reports',
    message: 'View detailed analytics and performance reports. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Reports"]',
  },
  {
    target: '[data-tour="admin-subtab-audit_trail"]',
    title: 'Audit Trail',
    message: 'Track all system actions and changes for accountability. Tap the ? icon inside for a detailed guide.',
    position: 'bottom',
    action: '[data-tour="admin-tab-Reports"]',
  },
  // --- Settings ---
  {
    target: '[data-tour="admin-tab-settings"]',
    title: 'Settings',
    message: 'Configure app-wide settings, branding, and system defaults.',
    position: 'bottom',
  },
]

// ─── Per-Tab Tutorials (standalone, triggered from within a tab) ──
export const userManagementSteps = [
  {
    target: '[data-tour="admin-users-stats"]',
    title: 'User Statistics',
    message: 'Quick overview of your team — total users, super admins, admins, branch admins, and staff counts.',
    position: 'bottom',
  },
  {
    target: '[data-tour="admin-users-search"]',
    title: 'Search Users',
    message: 'Find any user quickly by typing their name or email address.',
    position: 'bottom',
  },
  {
    target: '[data-tour="admin-users-role-filter"]',
    title: 'Filter by Role',
    message: 'Filter the user list by role — Super Admin, Admin, Branch Admin, or Staff.',
    position: 'bottom',
  },
  {
    target: '[data-tour="admin-users-create-btn"]',
    title: 'Create a New User',
    message: 'Tap here to add a new user. You\'ll set their username, email, password, role, and branch assignment.',
    position: 'bottom',
  },
  {
    target: '[data-tour="admin-users-table"]',
    title: 'User Directory',
    message: 'All your team members are listed here. Click the edit icon on any row to update their details or change their role.',
    position: 'top',
  },
]

// ─── Commerce Per-Tab Tutorials ─────────────────────────────────
export const defaultServicesSteps = [
  {
    target: '[data-tour="services-stats"]',
    title: 'Service Stats',
    message: 'Quick snapshot — total services, active count, categories, and average price at a glance.',
    position: 'bottom',
  },
  {
    target: '[data-tour="services-controls"]',
    title: 'Search & Filter',
    message: 'Search by name or filter by category and status to find a specific service quickly.',
    position: 'bottom',
  },
  {
    target: '[data-tour="services-add-btn"]',
    title: 'Add a Service',
    message: 'Tap here to create a new default service. It will auto-apply to all new branches.',
    position: 'bottom',
  },
  {
    target: '[data-tour="services-table"]',
    title: 'Services List',
    message: 'All your default services are listed here. Click Edit or Delete on any row to manage it.',
    position: 'top',
  },
]

export const productCatalogSteps = [
  // --- Tab Navigation ---
  {
    target: '[data-tour="catalog-tabs"]',
    title: 'Inventory Tabs',
    message: 'Switch between My Inventory (warehouse), Branch Orders, and Branch Inventory views.',
    position: 'bottom',
  },
  // --- My Inventory tab ---
  {
    target: '[data-tour="catalog-stats"]',
    title: 'Inventory Overview',
    message: 'See total products, in-stock, low-stock, and out-of-stock counts at a glance.',
    position: 'bottom',
  },
  {
    target: '[data-tour="catalog-controls"]',
    title: 'Filters & Search',
    message: 'Filter by category or stock level, and search products by name or brand.',
    position: 'bottom',
  },
  {
    target: '[data-tour="catalog-add-btn"]',
    title: 'Add a Product',
    message: 'Tap here to add a new product to the global catalog with pricing and images.',
    position: 'bottom',
  },
  {
    target: '[data-tour="catalog-grid"]',
    title: 'Product Grid',
    message: 'Browse your entire product catalog. Click any card to edit, receive stock, or view batches.',
    position: 'top',
  },
  // --- Branch Orders tab ---
  {
    target: '[data-tour="orders-stats"]',
    title: 'Order Summary',
    message: 'Quick overview of branch orders — pending, approved, shipped, received, and paid counts.',
    position: 'bottom',
    action: '[data-tour="catalog-tabs"] button:nth-child(2)',
  },
  {
    target: '[data-tour="orders-controls"]',
    title: 'Filter & Create Orders',
    message: 'Filter orders by status and create manual orders for branches that need stock.',
    position: 'bottom',
    action: '[data-tour="catalog-tabs"] button:nth-child(2)',
  },
  {
    target: '[data-tour="orders-manual-btn"]',
    title: 'Manual Order',
    message: 'Create a manual stock order on behalf of a branch when needed.',
    position: 'bottom',
    action: '[data-tour="catalog-tabs"] button:nth-child(2)',
  },
  // --- Branch Inventory tab ---
  {
    target: '[data-tour="branch-inv-selector"]',
    title: 'Select a Branch',
    message: 'Pick a branch to view its current inventory levels and stock details.',
    position: 'top',
    action: '[data-tour="catalog-tabs"] button:nth-child(3)',
  },
  {
    target: '[data-tour="branch-inv-overview"]',
    title: 'Branch Overview',
    message: 'See all branches at a glance with in-stock, low-stock, and out-of-stock counts. Tap a card to drill in.',
    position: 'top',
    action: '[data-tour="catalog-tabs"] button:nth-child(3)',
  },
]

export const voucherManagementSteps = [
  {
    target: '[data-tour="voucher-header"]',
    title: 'Voucher Approvals',
    message: 'Review and approve vouchers created by branch staff before they go live.',
    position: 'bottom',
  },
  {
    target: '[data-tour="voucher-branch-select"]',
    title: 'Select Branch',
    message: 'Pick a branch to view its voucher submissions.',
    position: 'bottom',
  },
  {
    target: '[data-tour="voucher-status-tabs"]',
    title: 'Filter by Status',
    message: 'Switch between Pending, Active, Rejected, or view all vouchers.',
    position: 'bottom',
  },
  {
    target: '[data-tour="voucher-table"]',
    title: 'Voucher Table',
    message: 'See all vouchers with code, value, creator, and status. Use the action buttons to approve or reject.',
    position: 'top',
  },
]

export const shopConfigSteps = [
  {
    target: '[data-tour="shopconfig-header"]',
    title: 'Shop Settings',
    message: 'Configure your online shop delivery and order settings from here.',
    position: 'bottom',
  },
  {
    target: '[data-tour="shopconfig-cards"]',
    title: 'Pricing & Thresholds',
    message: 'Set delivery fee, free delivery threshold, minimum order amount, and estimated delivery days.',
    position: 'bottom',
  },
  {
    target: '[data-tour="shopconfig-fulfillment"]',
    title: 'Fulfillment Options',
    message: 'Enable or disable delivery and pickup options for customers.',
    position: 'bottom',
  },
  {
    target: '[data-tour="shopconfig-save"]',
    title: 'Save Changes',
    message: 'Remember to save after making changes — the button turns green on success.',
    position: 'bottom',
  },
]

export const shopBannerSteps = [
  {
    target: '[data-tour="banner-header"]',
    title: 'Banner Management',
    message: 'Create and manage promotional carousel banners shown in the customer shop.',
    position: 'bottom',
  },
  {
    target: '[data-tour="banner-analytics-btn"]',
    title: 'Analytics Toggle',
    message: 'View impressions, clicks, and CTR stats for all your banners.',
    position: 'bottom',
  },
  {
    target: '[data-tour="banner-add-btn"]',
    title: 'Add a Banner',
    message: 'Create a new promotional banner with image, link, and scheduling options.',
    position: 'bottom',
  },
  {
    target: '[data-tour="banner-list"]',
    title: 'Banner List',
    message: 'Reorder, toggle visibility, edit, or delete banners. Drag arrows to change carousel order.',
    position: 'top',
  },
]

export const deliveryOrdersSteps = [
  {
    target: '[data-tour="delivery-header"]',
    title: 'Delivery Orders',
    message: 'Track and manage all product delivery orders across branches.',
    position: 'bottom',
  },
  {
    target: '[data-tour="delivery-status-cards"]',
    title: 'Status Summary',
    message: 'Quick count of orders by status — tap any card to filter the list below.',
    position: 'bottom',
  },
  {
    target: '[data-tour="delivery-filter"]',
    title: 'Filter Orders',
    message: 'Use the dropdown to filter orders by delivery status.',
    position: 'bottom',
  },
  {
    target: '[data-tour="delivery-list"]',
    title: 'Orders List',
    message: 'Expand any order to see details, customer info, and update the delivery status.',
    position: 'top',
  },
]

// ─── Finance Per-Tab Tutorials ──────────────────────────────────
export const plDashboardSteps = [
  {
    target: '[data-tour="pl-header"]',
    title: 'P&L Dashboard',
    message: 'View your consolidated profit & loss across all branches with add revenue/expense and export options.',
    position: 'bottom',
  },
  {
    target: '[data-tour="pl-date-range"]',
    title: 'Date Range',
    message: 'Select a time period — this month, last month, quarter, year, or a custom range.',
    position: 'bottom',
  },
  {
    target: '[data-tour="pl-summary"]',
    title: 'Key Metrics',
    message: 'Royalty income, product order income, total expenses, and net income at a glance.',
    position: 'bottom',
  },
  {
    target: '[data-tour="pl-secondary"]',
    title: 'Revenue Breakdown',
    message: 'Detailed breakdown of total revenue, expenses, margins, and branch-level performance.',
    position: 'top',
  },
]

export const balanceSheetSteps = [
  {
    target: '[data-tour="bs-header"]',
    title: 'Balance Sheet',
    message: 'View the headquarters financial position — assets, liabilities, and equity with export options.',
    position: 'bottom',
  },
  {
    target: '[data-tour="bs-equation"]',
    title: 'Accounting Equation',
    message: 'Assets = Liabilities + Equity. The system checks this balance for you automatically.',
    position: 'bottom',
  },
  {
    target: '[data-tour="bs-summary"]',
    title: 'Summary Cards',
    message: 'Total assets, liabilities, and equity broken down into clear categories.',
    position: 'top',
  },
]

export const royaltySteps = [
  {
    target: '[data-tour="royalty-header"]',
    title: 'Royalty Management',
    message: 'Configure royalty rates and track franchise royalty payments.',
    position: 'bottom',
  },
  {
    target: '[data-tour="royalty-tabs"]',
    title: 'Dashboard & Config',
    message: 'Switch between the Dashboard (payment overview) and Configuration (rate settings) tabs.',
    position: 'bottom',
  },
  {
    target: '[data-tour="royalty-stats"]',
    title: 'Payment Stats',
    message: 'Quick overview of total, due, overdue, paid, and pending royalty payments.',
    position: 'bottom',
  },
]

export const settlementSteps = [
  {
    target: '[data-tour="settlement-header"]',
    title: 'Settlement Queue',
    message: 'Review and process branch settlement requests — approve, reject, or track payouts.',
    position: 'bottom',
  },
  {
    target: '[data-tour="settlement-tabs"]',
    title: 'Status Tabs',
    message: 'Filter settlements by status — Pending, Processing, Completed, Rejected, or All.',
    position: 'bottom',
  },
  {
    target: '[data-tour="settlement-list"]',
    title: 'Settlement List',
    message: 'View all settlement requests with branch, amount, and status. Take action from the table.',
    position: 'top',
  },
]

export const walletConfigSteps = [
  {
    target: '[data-tour="wallet-config-header"]',
    title: 'Wallet Configuration',
    message: 'Configure PayMongo credentials for wallet top-ups and payment processing.',
    position: 'bottom',
  },
  {
    target: '[data-tour="wallet-config-status"]',
    title: 'Configuration Status',
    message: 'Check whether your PayMongo credentials are configured and encrypted.',
    position: 'bottom',
  },
  {
    target: '[data-tour="wallet-config-form"]',
    title: 'API Keys & Settings',
    message: 'Set test/live mode, enter API keys, and configure wallet limits and fees.',
    position: 'top',
  },
]

export const walletAnalyticsSteps = [
  {
    target: '[data-tour="wallet-analytics-header"]',
    title: 'Wallet Overview',
    message: 'Monitor wallet system health — float, branch earnings, and transaction activity.',
    position: 'bottom',
  },
  {
    target: '[data-tour="wallet-analytics-quick"]',
    title: 'Quick Stats',
    message: 'Active wallets, branches with pending, pending settlements, and today\'s activity.',
    position: 'bottom',
  },
  {
    target: '[data-tour="wallet-analytics-metrics"]',
    title: 'Primary Metrics',
    message: 'Total Float, Outstanding to Branches, and Available for Operations.',
    position: 'bottom',
  },
  {
    target: '[data-tour="wallet-analytics-monthly"]',
    title: 'Monthly Activity',
    message: 'Top-ups, payments, settlements, and other wallet transactions for the selected period.',
    position: 'top',
  },
]

// =============================================
// Marketing standalone sub-tab tutorials
// =============================================

export const loyaltySteps = [
  {
    target: '[data-tour="loyalty-header"]',
    title: 'Loyalty Configuration',
    message: 'Set up point earning rates, wallet bonuses, and top-up tiers for your loyalty program.',
    position: 'bottom',
  },
  {
    target: '[data-tour="loyalty-preview"]',
    title: 'Preview Calculator',
    message: 'See how points are calculated for a sample ₱500 payment — cash vs wallet vs top-up bonus.',
    position: 'bottom',
  },
  {
    target: '[data-tour="loyalty-config"]',
    title: 'Earning Rates & Tiers',
    message: 'Configure base earning rates, wallet multipliers, top-up bonus tiers, and advanced settings.',
    position: 'top',
  },
]

export const flashPromotionsSteps = [
  {
    target: '[data-tour="promos-header"]',
    title: 'Flash Promotions',
    message: 'Create and manage time-limited promotional events to boost engagement.',
    position: 'bottom',
  },
  {
    target: '[data-tour="promos-stats"]',
    title: 'Promo Stats',
    message: 'Track active, scheduled, total promotions, uses, and bonus points awarded.',
    position: 'bottom',
  },
  {
    target: '[data-tour="promos-filters"]',
    title: 'Status Filters',
    message: 'Filter promotions by status — Active, Scheduled, Draft, or Ended.',
    position: 'bottom',
  },
  {
    target: '[data-tour="promos-grid"]',
    title: 'Promotions Grid',
    message: 'View all promotions as cards. Click to edit or view individual stats.',
    position: 'top',
  },
]

export const emailMarketingSteps = [
  {
    target: '[data-tour="email-ai-header"]',
    title: 'Email Marketing AI',
    message: 'AI-powered email marketing tools — completely free, no external API costs.',
    position: 'bottom',
  },
  {
    target: '[data-tour="email-ai-tabs"]',
    title: 'AI Tools',
    message: 'Switch between Overview, Campaign Generator, Subject Lines, Send Time, Churn Risk, RFM Segments, and Content Analyzer.',
    position: 'bottom',
  },
  {
    target: '[data-tour="email-ai-content"]',
    title: 'Tool Content',
    message: 'Each tab provides specialized AI insights to optimize your email campaigns.',
    position: 'top',
  },
]

export const brandingSteps = [
  {
    target: '[data-tour="branding-header"]',
    title: 'Global Branding',
    message: 'Configure colors, logos, and feature toggles — the single source of truth for your brand across every experience.',
    position: 'bottom',
  },
  {
    target: '[data-tour="branding-summary"]',
    title: 'Brand Summary',
    message: 'View display name, color tokens, and media assets at a glance.',
    position: 'bottom',
  },
  {
    target: '[data-tour="branding-editor"]',
    title: 'Brand Editor',
    message: 'Edit colors, upload logos, and toggle features. Changes apply across the entire app.',
    position: 'top',
  },
]

export const emailTemplatesSteps = [
  {
    target: '[data-tour="email-templates-header"]',
    title: 'Email Templates',
    message: 'Customize the content of system emails — password resets, vouchers, bookings, and more.',
    position: 'bottom',
  },
  {
    target: '[data-tour="email-templates-selector"]',
    title: 'Template Selector',
    message: 'Choose which email template to edit. Each template supports dynamic variables.',
    position: 'bottom',
  },
  {
    target: '[data-tour="email-templates-editor"]',
    title: 'Template Editor',
    message: 'Edit subject, heading, body, CTA, and footer. Colors are pulled from your branding settings.',
    position: 'top',
  },
]

// ─── Customers Hub ──────────────────────────────────────────────────
export const customersHubSteps = [
  {
    target: '[data-tour="ch-tabs"]',
    title: 'Customer Sections',
    message: 'Switch between the Customers list and Analytics dashboard from these tabs.',
    position: 'bottom',
  },
  {
    target: '[data-tour="ch-customers-tab"]',
    title: 'Customers',
    message: 'View all customers — search, filter by status, see wallet balances, and contact them directly.',
    position: 'bottom',
  },
  {
    target: '[data-tour="ch-analytics-tab"]',
    title: 'Analytics',
    message: 'Track churn risk, at-risk customers, top spenders, and retention metrics for your branch.',
    position: 'bottom',
  },
  {
    target: '[data-tour="ch-content"]',
    title: 'Content Area',
    message: 'The selected section\'s content appears here. Each tab has its own tutorial (? icon).',
    position: 'top',
  },
]

// ─── Customers: Customers Management ────────────────────────────────
export const customersManagementSteps = [
  {
    target: '[data-tour="cm-stats"]',
    title: 'Customer Stats',
    message: 'Quick overview of total, active, new, inactive customer counts and total revenue.',
    position: 'bottom',
  },
  {
    target: '[data-tour="cm-controls"]',
    title: 'Search & Filters',
    message: 'Search by name, email, or phone. Filter by status and sort by name, email, join date, or bookings.',
    position: 'bottom',
  },
  {
    target: '[data-tour="cm-table"]',
    title: 'Customer Table',
    message: 'Full customer list with contact info, wallet balance, and status. Tap View for details or Contact to reach out.',
    position: 'top',
  },
]

// ─── Products Hub ───────────────────────────────────────────────────
export const productsHubSteps = [
  {
    target: '[data-tour="ph-tabs"]',
    title: 'Products & Services',
    message: 'Switch between Services, Products, Order Products, and Vouchers from these tabs.',
    position: 'bottom',
  },
  {
    target: '[data-tour="ph-services-tab"]',
    title: 'Services',
    message: 'Manage your branch services — add, edit, price, and set durations.',
    position: 'bottom',
  },
  {
    target: '[data-tour="ph-products-tab"]',
    title: 'Products',
    message: 'Manage retail products — inventory, pricing, stock levels, and images.',
    position: 'bottom',
  },
  {
    target: '[data-tour="ph-order-tab"]',
    title: 'Order Products',
    message: 'Browse the central product catalog and place orders for your branch.',
    position: 'bottom',
  },
  {
    target: '[data-tour="ph-vouchers-tab"]',
    title: 'Vouchers',
    message: 'Create and manage discount vouchers — track redemptions and send to customers.',
    position: 'bottom',
  },
  {
    target: '[data-tour="ph-content"]',
    title: 'Content Area',
    message: 'The selected section\'s content appears here. Each tab has its own tutorial (? icon).',
    position: 'top',
  },
]

// ─── Products: Services Management ──────────────────────────────────
export const servicesManagementSteps = [
  {
    target: '[data-tour="svc-stats"]',
    title: 'Service Stats',
    message: 'Overview of total services, average price, average duration, and total value.',
    position: 'bottom',
  },
  {
    target: '[data-tour="svc-controls"]',
    title: 'Search & Actions',
    message: 'Search services, sort by name/price/duration, toggle card or table view, and add new services.',
    position: 'bottom',
  },
  {
    target: '[data-tour="svc-list"]',
    title: 'Services List',
    message: 'All branch services with pricing, duration, and category. Edit or delete from here.',
    position: 'top',
  },
]

// ─── Products: Products Management ──────────────────────────────────
export const productsManagementSteps = [
  {
    target: '[data-tour="prod-header"]',
    title: 'Products Header',
    message: 'Refresh data or add a new product with image, pricing, and inventory details.',
    position: 'bottom',
  },
  {
    target: '[data-tour="prod-stats"]',
    title: 'Inventory Stats',
    message: 'Total products, in-stock, low stock, out of stock, total inventory value, and sold this month.',
    position: 'bottom',
  },
  {
    target: '[data-tour="prod-controls"]',
    title: 'Search & Filters',
    message: 'Search by name, filter by category or stock level, and sort products.',
    position: 'bottom',
  },
  {
    target: '[data-tour="prod-grid"]',
    title: 'Product Grid',
    message: 'All products with images, pricing, stock bars, and profit margins. Edit or delete from here.',
    position: 'top',
  },
]

// ─── Products: Branch Product Ordering ──────────────────────────────
export const branchOrderingSteps = [
  {
    target: '[data-tour="order-header"]',
    title: 'Order Products',
    message: 'Browse the central warehouse catalog and order products for your branch.',
    position: 'bottom',
  },
  {
    target: '[data-tour="order-tabs"]',
    title: 'Catalog / Cart / Orders',
    message: 'Browse the Product Catalog, review your Cart, or check My Orders history.',
    position: 'bottom',
  },
  {
    target: '[data-tour="order-content"]',
    title: 'Tab Content',
    message: 'Search products, add to cart, set quantities, then submit your order for approval.',
    position: 'top',
  },
]

// ─── Products: Branch Voucher Management ────────────────────────────
export const branchVoucherSteps = [
  {
    target: '[data-tour="vouch-stats"]',
    title: 'Voucher Stats',
    message: 'Overview of total, active, redeemed, expired vouchers and total discount value.',
    position: 'bottom',
  },
  {
    target: '[data-tour="vouch-controls"]',
    title: 'Search & Actions',
    message: 'Search vouchers, filter by status, sort, toggle card or table view, and create new vouchers.',
    position: 'bottom',
  },
  {
    target: '[data-tour="vouch-list"]',
    title: 'Vouchers List',
    message: 'All vouchers with codes, discounts, expiry dates, and usage. Send, edit, or view assigned users.',
    position: 'top',
  },
]

export const customerAnalyticsSteps = [
  {
    target: '[data-tour="analytics-header"]',
    title: 'Customer Analytics',
    message: 'Track customer activity, identify churn risk, and optimize retention across branches.',
    position: 'bottom',
  },
  {
    target: '[data-tour="analytics-status-cards"]',
    title: 'Status Overview',
    message: 'See total, active, at-risk, churned, and new customer counts with percentages.',
    position: 'bottom',
  },
  {
    target: '[data-tour="analytics-table"]',
    title: 'Customer Table',
    message: 'Detailed per-customer data — last visit, status, bookings, and total spend. Click status cards to filter.',
    position: 'top',
  },
]

// ─── Reports: System Reports ───
export const systemReportsSteps = [
  {
    target: '[data-tour="reports-header"]',
    title: 'System Reports',
    message: 'Comprehensive analytics across all branches — filter by branch or time period and export data.',
    position: 'bottom',
  },
  {
    target: '[data-tour="reports-tabs"]',
    title: 'Report Tabs',
    message: 'Switch between Overview, DDPP Analytics, Branch Summary, and Top Performers views.',
    position: 'bottom',
  },
  {
    target: '[data-tour="reports-content"]',
    title: 'Report Content',
    message: 'Detailed charts, tables, and insights for the selected report tab.',
    position: 'top',
  },
]

// ─── Reports: Audit Trail ───
export const auditTrailSteps = [
  {
    target: '[data-tour="audit-header"]',
    title: 'Audit Trail',
    message: 'Track every permission and role change across the system for compliance and accountability.',
    position: 'bottom',
  },
  {
    target: '[data-tour="audit-stats"]',
    title: 'Change Statistics',
    message: 'Quick summary — total changes, last 24 hours, last 7 days, and role change counts.',
    position: 'bottom',
  },
  {
    target: '[data-tour="audit-filters"]',
    title: 'Search & Filter',
    message: 'Search by user name or email, and filter by change type (role, permission, branch, etc.).',
    position: 'bottom',
  },
  {
    target: '[data-tour="audit-list"]',
    title: 'Audit Entries',
    message: 'Chronological log of all changes. Expand any entry to see the before/after diff.',
    position: 'top',
  },
]

// ─── POS (Point of Sale) ────────────────────────────────────────────
export const posSteps = [
  {
    target: '[data-tour="pos-mode-toggle"]',
    title: 'Service / Retail Mode',
    message: 'Switch between Service Mode (barber + services) and Retail Mode (product-only sales, no barber needed).',
    position: 'bottom',
  },
  {
    target: '[data-tour="pos-barber-selection"]',
    title: 'Select Barber',
    message: 'In Service Mode, pick the barber who will perform the service. This is required before processing.',
    position: 'bottom',
  },
  {
    target: '[data-tour="pos-catalog"]',
    title: 'Service & Product Catalog',
    message: 'Browse services and products. Use the tabs, search bar, and categories to find items. Click "Add" to add them to the order.',
    position: 'bottom',
  },
  {
    target: '[data-tour="pos-customer"]',
    title: 'Customer Selection',
    message: 'Select a registered customer via search or QR scan, or add a walk-in customer with their details.',
    position: 'left',
  },
  {
    target: '[data-tour="pos-bookings"]',
    title: 'Today\'s Bookings',
    message: 'View today\'s bookings and attach one to the current transaction. This pre-fills services and customer info.',
    position: 'left',
  },
  {
    target: '[data-tour="pos-order-summary"]',
    title: 'Order Summary',
    message: 'Review all added services and products. Adjust quantities or remove items before checkout.',
    position: 'left',
  },
  {
    target: '[data-tour="pos-payment"]',
    title: 'Payment',
    message: 'See the total breakdown, select a payment method (Cash, Card, Wallet), and process the payment.',
    position: 'left',
  },
]

// ─── Bookings Hub: Bookings Management ─────────────────────────────
export const bookingsManagementSteps = [
  {
    target: '[data-tour="bm-stats"]',
    title: 'Booking Stats',
    message: 'At-a-glance numbers — total bookings, today\'s count, pending, booked, confirmed, and cancelled.',
    position: 'bottom',
  },
  {
    target: '[data-tour="bm-filters"]',
    title: 'Search & Filters',
    message: 'Search by name, filter by status, sort, and narrow results with date range pickers.',
    position: 'bottom',
  },
  {
    target: '[data-tour="bm-create-btn"]',
    title: 'Create Booking',
    message: 'Manually create a new booking for a walk-in or phone customer.',
    position: 'bottom',
  },
  {
    target: '[data-tour="bm-tabs"]',
    title: 'View Tabs',
    message: 'Switch between the Bookings list, Transaction records, and Payment History.',
    position: 'bottom',
  },
  {
    target: '[data-tour="bm-table"]',
    title: 'Bookings Table',
    message: 'View, approve, reschedule, or cancel bookings. Use the action menu on each row.',
    position: 'top',
  },
]

// ─── Bookings Hub: Custom Bookings ──────────────────────────────────
export const customBookingsSteps = [
  {
    target: '[data-tour="cb-header"]',
    title: 'Custom Bookings',
    message: 'Manage custom booking forms and review submitted requests from customers.',
    position: 'bottom',
  },
  {
    target: '[data-tour="cb-stats"]',
    title: 'Submission Stats',
    message: 'Quick metrics — total submissions, pending, contacted, confirmed, completed, and conversion rate.',
    position: 'bottom',
  },
  {
    target: '[data-tour="cb-tabs"]',
    title: 'Submissions / Forms',
    message: 'Toggle between reviewing customer submissions and building custom booking forms.',
    position: 'bottom',
  },
  {
    target: '[data-tour="cb-filters"]',
    title: 'Search & Filter',
    message: 'Search submissions by name, email, or phone and filter by status.',
    position: 'bottom',
  },
]

// ─── Bookings Hub: Calendar Management ──────────────────────────────
export const calendarManagementSteps = [
  {
    target: '[data-tour="cal-toolbar"]',
    title: 'Calendar Toolbar',
    message: 'Navigate dates and switch between Day and Month views from this toolbar.',
    position: 'bottom',
  },
  {
    target: '[data-tour="cal-nav"]',
    title: 'Date Navigation',
    message: 'Use the arrows to move forward/backward, or click "Today" to jump to the current date.',
    position: 'bottom',
  },
  {
    target: '[data-tour="cal-view-toggle"]',
    title: 'View Toggle',
    message: 'Day View shows an hourly timeline with booking blocks. Month View shows a calendar grid.',
    position: 'bottom',
  },
]

// ─── Bookings Hub: Walk-ins ─────────────────────────────────────────
export const walkInSteps = [
  {
    target: '[data-tour="wi-header"]',
    title: 'Walk-ins',
    message: 'Manage walk-in customers who arrive without a prior booking.',
    position: 'bottom',
  },
  {
    target: '[data-tour="wi-stats"]',
    title: 'Walk-in Stats',
    message: 'Track totals, waiting, active, completed, and cancelled walk-ins at a glance.',
    position: 'bottom',
  },
  {
    target: '[data-tour="wi-controls"]',
    title: 'Search & Actions',
    message: 'Search walk-ins, clean up old records, or add a new walk-in customer.',
    position: 'bottom',
  },
  {
    target: '[data-tour="wi-table"]',
    title: 'Walk-ins Table',
    message: 'See queue number, customer info, assigned barber, and status. Use actions to start, complete, or cancel.',
    position: 'top',
  },
]

// ─── Bookings Hub: Queue ────────────────────────────────────────────
export const queueSteps = [
  {
    target: '[data-tour="q-header"]',
    title: 'Live Queue',
    message: 'Real-time queue management showing which barbers are busy and who\'s waiting.',
    position: 'bottom',
  },
  {
    target: '[data-tour="q-stats"]',
    title: 'Queue Stats',
    message: 'Overview of total customers in queue, currently active, and waiting.',
    position: 'bottom',
  },
  {
    target: '[data-tour="q-board"]',
    title: 'Barber Queues',
    message: 'Kanban-style board — each column represents a barber with their assigned customers. Click a customer for details.',
    position: 'top',
  },
]

// ─── Team Hub ─────────────────────────────────────────────────────
export const teamHubSteps = [
  {
    target: '[data-tour="th-tabs"]',
    title: 'Team Sections',
    message: 'Switch between Barbers, Staff Users, and Attendance management from these tabs.',
    position: 'bottom',
  },
  {
    target: '[data-tour="th-barbers-tab"]',
    title: 'Barbers',
    message: 'View, add, and manage barber profiles — schedules, services, ratings, and availability.',
    position: 'bottom',
  },
  {
    target: '[data-tour="th-users-tab"]',
    title: 'Staff Users',
    message: 'Manage branch staff accounts — add users, assign roles, and configure permissions.',
    position: 'bottom',
  },
  {
    target: '[data-tour="th-attendance-tab"]',
    title: 'Attendance',
    message: 'Track clock-in/out, overtime, late penalties, and export attendance reports.',
    position: 'bottom',
  },
  {
    target: '[data-tour="th-content"]',
    title: 'Content Area',
    message: 'The selected section\'s content appears here. Each section has its own search, filters, and actions.',
    position: 'top',
  },
]

// ─── Team Hub: Barbers Management ─────────────────────────────────
export const barbersManagementSteps = [
  {
    target: '[data-tour="barbers-stats"]',
    title: 'Barber Stats',
    message: 'Overview of your barber team — total count, active, inactive, and average customer rating.',
    position: 'bottom',
  },
  {
    target: '[data-tour="barbers-controls"]',
    title: 'Search & Filters',
    message: 'Search barbers by name, filter by active/inactive status, and sort by name, rating, or bookings.',
    position: 'bottom',
  },
  {
    target: '[data-tour="barbers-add-btn"]',
    title: 'Add Barber',
    message: 'Create a new barber profile with contact info, services, schedule, and specialties.',
    position: 'bottom',
  },
  {
    target: '[data-tour="barbers-table"]',
    title: 'Barbers Table',
    message: 'View all barbers with their contact, schedule, and status. Click a row to view full profile, edit, or remove.',
    position: 'top',
  },
]

// ─── Team Hub: Branch User Management ─────────────────────────────
export const branchUserSteps = [
  {
    target: '[data-tour="bu-header"]',
    title: 'Branch Info',
    message: 'Shows which branch you are managing staff for, along with the branch code.',
    position: 'bottom',
  },
  {
    target: '[data-tour="bu-stats"]',
    title: 'Staff Stats',
    message: 'Quick count of total staff members and how many are currently active.',
    position: 'bottom',
  },
  {
    target: '[data-tour="bu-controls"]',
    title: 'Search & Add User',
    message: 'Search staff by name or email, filter by role, and add new users to this branch.',
    position: 'bottom',
  },
  {
    target: '[data-tour="bu-table"]',
    title: 'Staff Table',
    message: 'View all branch staff with role, contact, and creation date. Use actions to edit, manage permissions, or delete.',
    position: 'top',
  },
]

// ─── Team Hub: Attendance ─────────────────────────────────────────
export const attendanceSteps = [
  {
    target: '[data-tour="att-header"]',
    title: 'Attendance',
    message: 'Track barber clock-in/out times. Switch between table and card views, or export reports to CSV.',
    position: 'bottom',
  },
  {
    target: '[data-tour="att-live-status"]',
    title: 'Live Status',
    message: 'Real-time view of which barbers are clocked in, with live overtime and late detection.',
    position: 'bottom',
  },
  {
    target: '[data-tour="att-date-filters"]',
    title: 'Date Filters',
    message: 'Filter records by Today, Yesterday, This Week, This Month, This Year, or a custom date range.',
    position: 'bottom',
  },
  {
    target: '[data-tour="att-records"]',
    title: 'Attendance Records',
    message: 'Detailed log of clock-in/out times, total hours, overtime, late minutes, and penalties per barber.',
    position: 'top',
  },
]

// ─── Customer: Dashboard Home Feed ──────────────────────────────────
export const customerHomeFeedSteps = [
  {
    target: '[data-tour="home-greeting"]',
    title: 'Smart Greeting',
    message: 'Personalized greeting based on the time of day, with a quick-book button.',
    position: 'bottom',
  },
  {
    target: '[data-tour="home-stories"]',
    title: 'Stories',
    message: 'Tap to watch branch stories — promos, behind-the-scenes, and barber highlights.',
    position: 'bottom',
  },
  {
    target: '[data-tour="home-promos"]',
    title: 'Active Promotions',
    message: 'Current flash promotions and bonus point events at your favorite branches.',
    position: 'bottom',
  },
  {
    target: '[data-tour="home-feed"]',
    title: 'Social Feed',
    message: 'Browse posts from barbers and branches — inspiration, tips, and portfolio shots.',
    position: 'top',
  },
]

// ─── Customer: Booking Hub ──────────────────────────────────────────
export const customerBookingHubSteps = [
  {
    target: '[data-tour="bh-tabs"]',
    title: 'Booking Tabs',
    message: 'Switch between My Bookings, Book Now, and History.',
    position: 'bottom',
  },
  {
    target: '[data-tour="bh-quick-action"]',
    title: 'Quick Book',
    message: 'Tap here to start a new appointment — pick a branch, barber, service, and time slot.',
    position: 'bottom',
  },
  {
    target: '[data-tour="bh-upcoming"]',
    title: 'Upcoming Bookings',
    message: 'Your next appointments with live countdown timers and QR codes for check-in.',
    position: 'top',
  },
]

// ─── Customer: Wallet Hub ───────────────────────────────────────────
export const customerWalletHubSteps = [
  {
    target: '[data-tour="wh-balance"]',
    title: 'Wallet Balance',
    message: 'Your current wallet balance. Top up to pay cashlessly at checkout.',
    position: 'bottom',
  },
  {
    target: '[data-tour="wh-tabs"]',
    title: 'Wallet Sections',
    message: 'Pay — quick actions & top-up. Activity — transaction history. Rewards — loyalty tiers & points.',
    position: 'bottom',
  },
  {
    target: '[data-tour="wh-content"]',
    title: 'Tab Content',
    message: 'The selected section appears here. Use Pay to top up, Activity to review, Rewards to redeem.',
    position: 'top',
  },
]

// ─── Customer: Shop ─────────────────────────────────────────────────
export const customerShopSteps = [
  {
    target: '[data-tour="shop-search"]',
    title: 'Search Products',
    message: 'Search by product name or brand to find grooming essentials quickly.',
    position: 'bottom',
  },
  {
    target: '[data-tour="shop-cart"]',
    title: 'Shopping Cart',
    message: 'View items in your cart and proceed to checkout.',
    position: 'bottom',
  },
  {
    target: '[data-tour="shop-tabs"]',
    title: 'Shop / Wishlist / Orders',
    message: 'Browse products, check your wishlist, or view past orders.',
    position: 'bottom',
  },
  {
    target: '[data-tour="shop-categories"]',
    title: 'Categories',
    message: 'Filter by category — Hair Care, Beard, Shaving, Tools, or Extras.',
    position: 'bottom',
  },
  {
    target: '[data-tour="shop-products"]',
    title: 'Product Grid',
    message: 'Tap a product for details, or hit + to add it to your cart instantly.',
    position: 'top',
  },
]

// ─── Customer: Profile ──────────────────────────────────────────────
export const customerProfileSteps = [
  {
    target: '[data-tour="profile-header"]',
    title: 'Your Profile',
    message: 'Your avatar, name, member status, and badges at a glance.',
    position: 'bottom',
  },
  {
    target: '[data-tour="profile-rewards"]',
    title: 'Star Rewards',
    message: 'Track your loyalty tier, earned points, and available rewards.',
    position: 'bottom',
  },
  {
    target: '[data-tour="profile-activity"]',
    title: 'Recent Activity',
    message: 'Your latest bookings and visit streak — keep the streak going!',
    position: 'bottom',
  },
  {
    target: '[data-tour="profile-info"]',
    title: 'Personal Info',
    message: 'Edit your nickname, phone number, and birthday. Tap Edit to update.',
    position: 'bottom',
  },
  {
    target: '[data-tour="profile-settings"]',
    title: 'Settings',
    message: 'Manage notifications, get help, or sign out.',
    position: 'top',
  },
]

// ── Staff: Finance Hub ──
export const financeHubSteps = [
  { target: '[data-tour="finance-tab-accounting"]', title: 'Profit & Loss', message: 'View revenue, expenses, and net income with charts and breakdowns.', position: 'bottom' },
  { target: '[data-tour="finance-tab-balance_sheet"]', title: 'Balance Sheet', message: 'Track assets, liabilities, and equity for your branch.', position: 'bottom' },
  { target: '[data-tour="finance-tab-payroll"]', title: 'Payroll', message: 'Manage barber and staff payroll — commissions, daily rates, and payslips.', position: 'bottom' },
  { target: '[data-tour="finance-tab-cash_advances"]', title: 'Cash Advances', message: 'Review and approve cash advance requests from staff.', position: 'bottom' },
  { target: '[data-tour="finance-tab-royalty"]', title: 'Royalty', message: 'View royalty payment history and calculations.', position: 'bottom' },
  { target: '[data-tour="finance-tab-payments"]', title: 'Payments', message: 'Browse payment transaction history.', position: 'bottom' },
  { target: '[data-tour="finance-tab-wallet_earnings"]', title: 'Wallet Earnings', message: 'Track earnings from customer wallet top-ups and spending.', position: 'bottom' },
  { target: '[data-tour="finance-tab-branch_wallet"]', title: 'Branch Wallet', message: 'Manage the branch-level wallet balance.', position: 'bottom' },
]

// ── Staff: Marketing Hub ──
export const marketingHubSteps = [
  { target: '[data-tour="marketing-tab-ai"]', title: 'AI Email', message: 'Generate and send marketing emails powered by AI — bulk send, templates, and analytics.', position: 'bottom' },
  { target: '[data-tour="marketing-tab-posts"]', title: 'Posts', message: 'Create and moderate community posts — announcements, tips, and promotions.', position: 'bottom' },
  { target: '[data-tour="marketing-tab-events"]', title: 'Events', message: 'Manage branch events and special occasions.', position: 'bottom' },
  { target: '[data-tour="marketing-tab-notifications"]', title: 'Notifications', message: 'Send push notifications to your customers.', position: 'bottom' },
]

// ── Staff: Reports (DDPP Analytics) ──
export const reportsManagementSteps = [
  { target: '[data-tour="reports-tab-descriptive"]', title: 'Descriptive Analytics', message: 'What happened — revenue metrics, booking rates, staff performance rankings.', position: 'bottom' },
  { target: '[data-tour="reports-tab-diagnostic"]', title: 'Diagnostic Analytics', message: 'Why it happened — cancellation analysis, peak hours, customer retention trends.', position: 'bottom' },
  { target: '[data-tour="reports-tab-predictive"]', title: 'Predictive Analytics', message: 'What will happen — AI sales forecasts, churn risk, and reorder alerts.', position: 'bottom' },
  { target: '[data-tour="reports-tab-prescriptive"]', title: 'Prescriptive Analytics', message: 'What to do — AI-generated action recommendations and marketing strategies.', position: 'bottom' },
  { target: '[data-tour="reports-period"]', title: 'Time Period', message: 'Filter analytics by Today, This Week, This Month, or This Year.', position: 'bottom' },
  { target: '[data-tour="reports-export"]', title: 'Export Data', message: 'Download your analytics as a CSV file for offline analysis.', position: 'left' },
]

// ── Staff: Branch Settings ──
export const branchSettingsSteps = [
  { target: '[data-tour="settings-tab-profile"]', title: 'Branch Profile', message: 'Update your branch name, logo, cover photo, address, and contact info.', position: 'bottom' },
  { target: '[data-tour="settings-tab-payment"]', title: 'Payment Settings', message: 'Configure payment methods, processing fees, and PayMongo integration.', position: 'bottom' },
  { target: '[data-tour="settings-tab-wallet"]', title: 'Wallet Settings', message: 'Enable or disable customer wallets, set top-up limits and earning rules.', position: 'bottom' },
  { target: '[data-tour="settings-tab-schedule"]', title: 'Schedule', message: 'Set operating hours per day and manage closure or holiday dates.', position: 'bottom' },
  { target: '[data-tour="settings-tab-system"]', title: 'System Info', message: 'View app version, changelog, and system information.', position: 'bottom' },
]

// ── Staff/Admin: Activity Log / System Audit Log ──
export const activityLogSteps = [
  { target: '[data-tour="audit-stats"]', title: 'Log Statistics', message: 'Quick overview — total logs, last 24 hours, last 7 days, and active categories.', position: 'bottom' },
  { target: '[data-tour="audit-categories"]', title: 'Category Filters', message: 'Filter logs by category — Booking, Transaction, Payment, Product, and more.', position: 'bottom' },
  { target: '[data-tour="audit-search"]', title: 'Search & Date Filter', message: 'Search by description or user, and narrow results with date range filters.', position: 'bottom' },
  { target: '[data-tour="audit-entries"]', title: 'Log Entries', message: 'Click any entry to expand and view full metadata details.', position: 'top' },
]

// ── Admin: Branch Management ──
export const branchManagementSteps = [
  { target: '[data-tour="branch-mgmt-stats"]', title: 'Branch Overview', message: 'Total branches, active/inactive counts, revenue, and wallet balances at a glance.', position: 'bottom' },
  { target: '[data-tour="branch-mgmt-search"]', title: 'Search & Filter', message: 'Find branches by name, filter by status, and sort by different criteria.', position: 'bottom' },
  { target: '[data-tour="branch-mgmt-grid"]', title: 'Branch Cards', message: 'Each card shows branch details, financials, and quick actions like Edit and Toggle Status.', position: 'top' },
]

// ── Admin: Hairstyle Catalog Manager ──
export const hairstyleCatalogSteps = [
  { target: '[data-tour="hairstyle-search"]', title: 'Search & Filter', message: 'Find hairstyles by name and filter by category (Fade, Undercut, Classic, etc.).', position: 'bottom' },
  { target: '[data-tour="hairstyle-add"]', title: 'Add Hairstyle', message: 'Create a new hairstyle with overlay image, face shape scores, and maintenance level.', position: 'bottom' },
  { target: '[data-tour="hairstyle-grid"]', title: 'Hairstyle Cards', message: 'Each card shows the overlay, face shape compatibility bars, try/save counts, and edit/delete actions.', position: 'top' },
]

// ── Admin: System Logs (same component, admin scope) ──
export const systemLogsSteps = [
  { target: '[data-tour="audit-stats"]', title: 'System Statistics', message: 'Overview of total logs, recent activity, and active categories across all branches.', position: 'bottom' },
  { target: '[data-tour="audit-categories"]', title: 'Category Filters', message: 'Filter by category — Auth, Booking, Transaction, Payment, User, System, and more.', position: 'bottom' },
  { target: '[data-tour="audit-search"]', title: 'Search & Date Range', message: 'Search logs by description, user, or action, and filter by date range.', position: 'bottom' },
  { target: '[data-tour="audit-entries"]', title: 'Log Entries', message: 'View detailed log entries with actor, timestamp, and expandable metadata.', position: 'top' },
]

// ── IT Admin: Platform-specific tabs ──
export const itAdminPlatformSteps = [
  { target: '[data-tour="it-tab-subscriptions"]', title: 'Subscriptions', message: 'Manage branch subscription plans, billing cycles, and payment status.', position: 'bottom' },
  { target: '[data-tour="it-tab-licenses"]', title: 'Licenses', message: 'Track and manage software licenses per branch.', position: 'bottom' },
  { target: '[data-tour="it-tab-error_monitor"]', title: 'Error Monitor', message: 'Track system errors by severity — Critical, Error, Warning, Info. Resolve issues in bulk.', position: 'bottom' },
  { target: '[data-tour="it-tab-security"]', title: 'Security Monitor', message: 'Monitor security events — login attempts, brute force, suspicious IPs, role escalation.', position: 'bottom' },
  { target: '[data-tour="it-tab-bans"]', title: 'Bans', message: 'Ban or suspend users and branches with reasons and duration.', position: 'bottom' },
  { target: '[data-tour="it-tab-maintenance"]', title: 'Maintenance Mode', message: 'Toggle maintenance mode with a custom message and duration.', position: 'bottom' },
]

export const itAdminSteps = [...superAdminSteps, ...itAdminPlatformSteps]

// ── Customer: AI Mirror ──
export const aiMirrorSteps = [
  { target: '[data-tour="mirror-header"]', title: 'AI Mirror', message: 'Try on hairstyles virtually — the AI detects your face shape and suggests compatible styles.', position: 'bottom' },
  { target: '[data-tour="mirror-camera"]', title: 'Face Scanner', message: 'Position your face in the frame — the AI will detect your face shape automatically.', position: 'bottom' },
  { target: '[data-tour="mirror-actions"]', title: 'Actions', message: 'Rescan your face, capture a photo, or save your favorite look to your lookbook.', position: 'top' },
]

/**
 * Returns the walkthrough steps for a given user role.
 */
export function getStepsForRole(role) {
  switch (role) {
    case 'customer':
      return customerSteps
    case 'staff':
      return staffSteps
    case 'branch_admin':
      return branchAdminSteps
    case 'barber':
      return barberSteps
    case 'super_admin':
    case 'admin':
      return superAdminSteps
    case 'it_admin':
      return itAdminSteps
    default:
      return []
  }
}
