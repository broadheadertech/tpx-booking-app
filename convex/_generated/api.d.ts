/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_clerkAuth from "../lib/clerkAuth.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_points from "../lib/points.js";
import type * as lib_roleUtils from "../lib/roleUtils.js";
import type * as lib_unifiedAuth from "../lib/unifiedAuth.js";
import type * as lib_walletBonus from "../lib/walletBonus.js";
import type * as lib_walletUtils from "../lib/walletUtils.js";
import type * as seed from "../seed.js";
import type * as services_accounting from "../services/accounting.js";
import type * as services_aiAnalytics from "../services/aiAnalytics.js";
import type * as services_auth from "../services/auth.js";
import type * as services_balanceSheet from "../services/balanceSheet.js";
import type * as services_barberMatcher from "../services/barberMatcher.js";
import type * as services_barbers from "../services/barbers.js";
import type * as services_bookingNotifications from "../services/bookingNotifications.js";
import type * as services_bookings from "../services/bookings.js";
import type * as services_branchEarnings from "../services/branchEarnings.js";
import type * as services_branchPosts from "../services/branchPosts.js";
import type * as services_branchProfile from "../services/branchProfile.js";
import type * as services_branchUsers from "../services/branchUsers.js";
import type * as services_branchWalletSettings from "../services/branchWalletSettings.js";
import type * as services_branches from "../services/branches.js";
import type * as services_branding from "../services/branding.js";
import type * as services_cashAdvance from "../services/cashAdvance.js";
import type * as services_clerkMigration from "../services/clerkMigration.js";
import type * as services_clerkSync from "../services/clerkSync.js";
import type * as services_customBookingForms from "../services/customBookingForms.js";
import type * as services_customBookingSubmissions from "../services/customBookingSubmissions.js";
import type * as services_customerBranchActivity from "../services/customerBranchActivity.js";
import type * as services_defaultServices from "../services/defaultServices.js";
import type * as services_emailMarketing from "../services/emailMarketing.js";
import type * as services_emailTemplates from "../services/emailTemplates.js";
import type * as services_events from "../services/events.js";
import type * as services_expenses from "../services/expenses.js";
import type * as services_faceAttendance from "../services/faceAttendance.js";
import type * as services_feed from "../services/feed.js";
import type * as services_feedAlgorithm from "../services/feedAlgorithm.js";
import type * as services_index from "../services/index.js";
import type * as services_loyaltyAnalytics from "../services/loyaltyAnalytics.js";
import type * as services_loyaltyConfig from "../services/loyaltyConfig.js";
import type * as services_mainQueue from "../services/mainQueue.js";
import type * as services_maintenanceConfig from "../services/maintenanceConfig.js";
import type * as services_notificationScheduler from "../services/notificationScheduler.js";
import type * as services_notifications from "../services/notifications.js";
import type * as services_paymentAudit from "../services/paymentAudit.js";
import type * as services_payments from "../services/payments.js";
import type * as services_paymongo from "../services/paymongo.js";
import type * as services_payroll from "../services/payroll.js";
import type * as services_points from "../services/points.js";
import type * as services_portfolio from "../services/portfolio.js";
import type * as services_productCatalog from "../services/productCatalog.js";
import type * as services_productOrders from "../services/productOrders.js";
import type * as services_products from "../services/products.js";
import type * as services_promotions from "../services/promotions.js";
import type * as services_pushTokens from "../services/pushTokens.js";
import type * as services_ratings from "../services/ratings.js";
import type * as services_rbac from "../services/rbac.js";
import type * as services_resendEmail from "../services/resendEmail.js";
import type * as services_royalty from "../services/royalty.js";
import type * as services_services from "../services/services.js";
import type * as services_settlements from "../services/settlements.js";
import type * as services_shopBanners from "../services/shopBanners.js";
import type * as services_shopConfig from "../services/shopConfig.js";
import type * as services_shoppablePosts from "../services/shoppablePosts.js";
import type * as services_tiers from "../services/tiers.js";
import type * as services_timeAttendance from "../services/timeAttendance.js";
import type * as services_transactions from "../services/transactions.js";
import type * as services_userAddresses from "../services/userAddresses.js";
import type * as services_vouchers from "../services/vouchers.js";
import type * as services_walkIn from "../services/walkIn.js";
import type * as services_wallet from "../services/wallet.js";
import type * as services_walletAnalytics from "../services/walletAnalytics.js";
import type * as services_walletConfig from "../services/walletConfig.js";
import type * as services_wishlist from "../services/wishlist.js";
import type * as utils_errors from "../utils/errors.js";
import type * as utils_password from "../utils/password.js";
import type * as utils_passwordActions from "../utils/passwordActions.js";
import type * as utils_sanitize from "../utils/sanitize.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  http: typeof http;
  "lib/clerkAuth": typeof lib_clerkAuth;
  "lib/encryption": typeof lib_encryption;
  "lib/points": typeof lib_points;
  "lib/roleUtils": typeof lib_roleUtils;
  "lib/unifiedAuth": typeof lib_unifiedAuth;
  "lib/walletBonus": typeof lib_walletBonus;
  "lib/walletUtils": typeof lib_walletUtils;
  seed: typeof seed;
  "services/accounting": typeof services_accounting;
  "services/aiAnalytics": typeof services_aiAnalytics;
  "services/auth": typeof services_auth;
  "services/balanceSheet": typeof services_balanceSheet;
  "services/barberMatcher": typeof services_barberMatcher;
  "services/barbers": typeof services_barbers;
  "services/bookingNotifications": typeof services_bookingNotifications;
  "services/bookings": typeof services_bookings;
  "services/branchEarnings": typeof services_branchEarnings;
  "services/branchPosts": typeof services_branchPosts;
  "services/branchProfile": typeof services_branchProfile;
  "services/branchUsers": typeof services_branchUsers;
  "services/branchWalletSettings": typeof services_branchWalletSettings;
  "services/branches": typeof services_branches;
  "services/branding": typeof services_branding;
  "services/cashAdvance": typeof services_cashAdvance;
  "services/clerkMigration": typeof services_clerkMigration;
  "services/clerkSync": typeof services_clerkSync;
  "services/customBookingForms": typeof services_customBookingForms;
  "services/customBookingSubmissions": typeof services_customBookingSubmissions;
  "services/customerBranchActivity": typeof services_customerBranchActivity;
  "services/defaultServices": typeof services_defaultServices;
  "services/emailMarketing": typeof services_emailMarketing;
  "services/emailTemplates": typeof services_emailTemplates;
  "services/events": typeof services_events;
  "services/expenses": typeof services_expenses;
  "services/faceAttendance": typeof services_faceAttendance;
  "services/feed": typeof services_feed;
  "services/feedAlgorithm": typeof services_feedAlgorithm;
  "services/index": typeof services_index;
  "services/loyaltyAnalytics": typeof services_loyaltyAnalytics;
  "services/loyaltyConfig": typeof services_loyaltyConfig;
  "services/mainQueue": typeof services_mainQueue;
  "services/maintenanceConfig": typeof services_maintenanceConfig;
  "services/notificationScheduler": typeof services_notificationScheduler;
  "services/notifications": typeof services_notifications;
  "services/paymentAudit": typeof services_paymentAudit;
  "services/payments": typeof services_payments;
  "services/paymongo": typeof services_paymongo;
  "services/payroll": typeof services_payroll;
  "services/points": typeof services_points;
  "services/portfolio": typeof services_portfolio;
  "services/productCatalog": typeof services_productCatalog;
  "services/productOrders": typeof services_productOrders;
  "services/products": typeof services_products;
  "services/promotions": typeof services_promotions;
  "services/pushTokens": typeof services_pushTokens;
  "services/ratings": typeof services_ratings;
  "services/rbac": typeof services_rbac;
  "services/resendEmail": typeof services_resendEmail;
  "services/royalty": typeof services_royalty;
  "services/services": typeof services_services;
  "services/settlements": typeof services_settlements;
  "services/shopBanners": typeof services_shopBanners;
  "services/shopConfig": typeof services_shopConfig;
  "services/shoppablePosts": typeof services_shoppablePosts;
  "services/tiers": typeof services_tiers;
  "services/timeAttendance": typeof services_timeAttendance;
  "services/transactions": typeof services_transactions;
  "services/userAddresses": typeof services_userAddresses;
  "services/vouchers": typeof services_vouchers;
  "services/walkIn": typeof services_walkIn;
  "services/wallet": typeof services_wallet;
  "services/walletAnalytics": typeof services_walletAnalytics;
  "services/walletConfig": typeof services_walletConfig;
  "services/wishlist": typeof services_wishlist;
  "utils/errors": typeof utils_errors;
  "utils/password": typeof utils_password;
  "utils/passwordActions": typeof utils_passwordActions;
  "utils/sanitize": typeof utils_sanitize;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
