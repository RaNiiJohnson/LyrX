/**
 * Compile-time marker for the backend workspace.
 *
 * Convex functions will live in `convex/` once a deployment can be verified.
 * Client applications must not import this package as an authorization layer.
 */
export const backendProvider = "convex" as const
