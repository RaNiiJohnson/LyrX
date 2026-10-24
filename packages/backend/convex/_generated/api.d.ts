/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as catalogue from "../catalogue.js";
import type * as catalogueAggregates from "../catalogueAggregates.js";
import type * as configuration from "../configuration.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as lib_authz from "../lib/authz.js";
import type * as lib_catalogueImages from "../lib/catalogueImages.js";
import type * as lib_functions from "../lib/functions.js";
import type * as lib_profileImages from "../lib/profileImages.js";
import type * as lib_validation from "../lib/validation.js";
import type * as members from "../members.js";
import type * as model from "../model.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  catalogue: typeof catalogue;
  catalogueAggregates: typeof catalogueAggregates;
  configuration: typeof configuration;
  crons: typeof crons;
  emails: typeof emails;
  http: typeof http;
  "lib/authz": typeof lib_authz;
  "lib/catalogueImages": typeof lib_catalogueImages;
  "lib/functions": typeof lib_functions;
  "lib/profileImages": typeof lib_profileImages;
  "lib/validation": typeof lib_validation;
  members: typeof members;
  model: typeof model;
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
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
  catalogueSongs: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"catalogueSongs">;
  catalogueSongsByStatus: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"catalogueSongsByStatus">;
  catalogueAlbums: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"catalogueAlbums">;
  catalogueAlbumsByStatus: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"catalogueAlbumsByStatus">;
  catalogueAlbumTracks: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"catalogueAlbumTracks">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
