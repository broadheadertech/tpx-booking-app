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
import type * as services_auth from "../services/auth.js";
import type * as services_barbers from "../services/barbers.js";
import type * as services_bookings from "../services/bookings.js";
import type * as services_events from "../services/events.js";
import type * as services_index from "../services/index.js";
import type * as services_notifications from "../services/notifications.js";
import type * as services_products from "../services/products.js";
import type * as services_services from "../services/services.js";
import type * as services_transactions from "../services/transactions.js";
import type * as services_vouchers from "../services/vouchers.js";
import type * as utils_errors from "../utils/errors.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "services/auth": typeof services_auth;
  "services/barbers": typeof services_barbers;
  "services/bookings": typeof services_bookings;
  "services/events": typeof services_events;
  "services/index": typeof services_index;
  "services/notifications": typeof services_notifications;
  "services/products": typeof services_products;
  "services/services": typeof services_services;
  "services/transactions": typeof services_transactions;
  "services/vouchers": typeof services_vouchers;
  "utils/errors": typeof utils_errors;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
