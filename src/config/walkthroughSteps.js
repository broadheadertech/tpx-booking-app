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
    default:
      return []
  }
}
