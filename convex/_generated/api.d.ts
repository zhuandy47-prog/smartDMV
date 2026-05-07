/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account_lifecycle from "../account_lifecycle.js";
import type * as auth from "../auth.js";
import type * as auth_helpers from "../auth_helpers.js";
import type * as comments from "../comments.js";
import type * as crons from "../crons.js";
import type * as documents from "../documents.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as roles from "../roles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account_lifecycle: typeof account_lifecycle;
  auth: typeof auth;
  auth_helpers: typeof auth_helpers;
  comments: typeof comments;
  crons: typeof crons;
  documents: typeof documents;
  emails: typeof emails;
  http: typeof http;
  migrations: typeof migrations;
  roles: typeof roles;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
