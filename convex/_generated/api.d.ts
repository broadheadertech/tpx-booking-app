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
import type * as lib_encryption from "../lib/encryption.js";
import type * as seed from "../seed.js";
import type * as services_accounting from "../services/accounting.js";
import type * as services_auth from "../services/auth.js";
import type * as services_balanceSheet from "../services/balanceSheet.js";
import type * as services_barbers from "../services/barbers.js";
import type * as services_bookingNotifications from "../services/bookingNotifications.js";
import type * as services_bookings from "../services/bookings.js";
import type * as services_branches from "../services/branches.js";
import type * as services_branding from "../services/branding.js";
import type * as services_cashAdvance from "../services/cashAdvance.js";
import type * as services_customBookingForms from "../services/customBookingForms.js";
import type * as services_customBookingSubmissions from "../services/customBookingSubmissions.js";
import type * as services_emailMarketing from "../services/emailMarketing.js";
import type * as services_emailTemplates from "../services/emailTemplates.js";
import type * as services_events from "../services/events.js";
import type * as services_expenses from "../services/expenses.js";
import type * as services_index from "../services/index.js";
import type * as services_mainQueue from "../services/mainQueue.js";
import type * as services_notificationScheduler from "../services/notificationScheduler.js";
import type * as services_notifications from "../services/notifications.js";
import type * as services_paymentAudit from "../services/paymentAudit.js";
import type * as services_payments from "../services/payments.js";
import type * as services_paymongo from "../services/paymongo.js";
import type * as services_payroll from "../services/payroll.js";
import type * as services_portfolio from "../services/portfolio.js";
import type * as services_productCatalog from "../services/productCatalog.js";
import type * as services_productOrders from "../services/productOrders.js";
import type * as services_products from "../services/products.js";
import type * as services_ratings from "../services/ratings.js";
import type * as services_royalty from "../services/royalty.js";
import type * as services_services from "../services/services.js";
import type * as services_timeAttendance from "../services/timeAttendance.js";
import type * as services_transactions from "../services/transactions.js";
import type * as services_vouchers from "../services/vouchers.js";
import type * as services_walkIn from "../services/walkIn.js";
import type * as services_wallet from "../services/wallet.js";
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
  "lib/encryption": typeof lib_encryption;
  seed: typeof seed;
  "services/accounting": typeof services_accounting;
  "services/auth": typeof services_auth;
  "services/balanceSheet": typeof services_balanceSheet;
  "services/barbers": typeof services_barbers;
  "services/bookingNotifications": typeof services_bookingNotifications;
  "services/bookings": typeof services_bookings;
  "services/branches": typeof services_branches;
  "services/branding": typeof services_branding;
  "services/cashAdvance": typeof services_cashAdvance;
  "services/customBookingForms": typeof services_customBookingForms;
  "services/customBookingSubmissions": typeof services_customBookingSubmissions;
  "services/emailMarketing": typeof services_emailMarketing;
  "services/emailTemplates": typeof services_emailTemplates;
  "services/events": typeof services_events;
  "services/expenses": typeof services_expenses;
  "services/index": typeof services_index;
  "services/mainQueue": typeof services_mainQueue;
  "services/notificationScheduler": typeof services_notificationScheduler;
  "services/notifications": typeof services_notifications;
  "services/paymentAudit": typeof services_paymentAudit;
  "services/payments": typeof services_payments;
  "services/paymongo": typeof services_paymongo;
  "services/payroll": typeof services_payroll;
  "services/portfolio": typeof services_portfolio;
  "services/productCatalog": typeof services_productCatalog;
  "services/productOrders": typeof services_productOrders;
  "services/products": typeof services_products;
  "services/ratings": typeof services_ratings;
  "services/royalty": typeof services_royalty;
  "services/services": typeof services_services;
  "services/timeAttendance": typeof services_timeAttendance;
  "services/transactions": typeof services_transactions;
  "services/vouchers": typeof services_vouchers;
  "services/walkIn": typeof services_walkIn;
  "services/wallet": typeof services_wallet;
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
