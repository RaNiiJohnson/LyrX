/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts_deletion from "../accounts/deletion.js";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as catalogue from "../catalogue.js";
import type * as catalogue_access from "../catalogue/access.js";
import type * as catalogue_aggregates from "../catalogue/aggregates.js";
import type * as catalogue_albums from "../catalogue/albums.js";
import type * as catalogue_artwork from "../catalogue/artwork.js";
import type * as catalogue_languageMigration from "../catalogue/languageMigration.js";
import type * as catalogue_lyrics from "../catalogue/lyrics.js";
import type * as catalogue_lyricsMigration from "../catalogue/lyricsMigration.js";
import type * as catalogue_read from "../catalogue/read.js";
import type * as catalogue_songs from "../catalogue/songs.js";
import type * as catalogue_tracks from "../catalogue/tracks.js";
import type * as catalogue_values from "../catalogue/values.js";
import type * as catalogueAggregates from "../catalogueAggregates.js";
import type * as community_artwork from "../community/artwork.js";
import type * as community_model from "../community/model.js";
import type * as community_moderation from "../community/moderation.js";
import type * as community_read from "../community/read.js";
import type * as community_values from "../community/values.js";
import type * as community_write from "../community/write.js";
import type * as configuration from "../configuration.js";
import type * as crons from "../crons.js";
import type * as discovery_maintenance from "../discovery/maintenance.js";
import type * as discovery_model from "../discovery/model.js";
import type * as discovery_projection from "../discovery/projection.js";
import type * as discovery_read from "../discovery/read.js";
import type * as discovery_searchText from "../discovery/searchText.js";
import type * as discovery_views from "../discovery/views.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as interactions_access from "../interactions/access.js";
import type * as interactions_cleanup from "../interactions/cleanup.js";
import type * as interactions_model from "../interactions/model.js";
import type * as interactions_moderation from "../interactions/moderation.js";
import type * as interactions_read from "../interactions/read.js";
import type * as interactions_write from "../interactions/write.js";
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
  "accounts/deletion": typeof accounts_deletion;
  admin: typeof admin;
  auth: typeof auth;
  catalogue: typeof catalogue;
  "catalogue/access": typeof catalogue_access;
  "catalogue/aggregates": typeof catalogue_aggregates;
  "catalogue/albums": typeof catalogue_albums;
  "catalogue/artwork": typeof catalogue_artwork;
  "catalogue/languageMigration": typeof catalogue_languageMigration;
  "catalogue/lyrics": typeof catalogue_lyrics;
  "catalogue/lyricsMigration": typeof catalogue_lyricsMigration;
  "catalogue/read": typeof catalogue_read;
  "catalogue/songs": typeof catalogue_songs;
  "catalogue/tracks": typeof catalogue_tracks;
  "catalogue/values": typeof catalogue_values;
  catalogueAggregates: typeof catalogueAggregates;
  "community/artwork": typeof community_artwork;
  "community/model": typeof community_model;
  "community/moderation": typeof community_moderation;
  "community/read": typeof community_read;
  "community/values": typeof community_values;
  "community/write": typeof community_write;
  configuration: typeof configuration;
  crons: typeof crons;
  "discovery/maintenance": typeof discovery_maintenance;
  "discovery/model": typeof discovery_model;
  "discovery/projection": typeof discovery_projection;
  "discovery/read": typeof discovery_read;
  "discovery/searchText": typeof discovery_searchText;
  "discovery/views": typeof discovery_views;
  emails: typeof emails;
  http: typeof http;
  "interactions/access": typeof interactions_access;
  "interactions/cleanup": typeof interactions_cleanup;
  "interactions/model": typeof interactions_model;
  "interactions/moderation": typeof interactions_moderation;
  "interactions/read": typeof interactions_read;
  "interactions/write": typeof interactions_write;
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
  publicDiscovery: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"publicDiscovery">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
