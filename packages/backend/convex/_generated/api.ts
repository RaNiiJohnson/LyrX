/* eslint-disable */
/**
 * Generated function references. Regenerate with `pnpm convex:codegen` after a
 * Convex deployment is configured.
 */
import type * as admin from "../admin"
import type * as auth from "../auth"
import type * as configuration from "../configuration"
import type * as members from "../members"
import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server"
import { anyApi, componentsGeneric } from "convex/server"

const fullApi = anyApi as unknown as ApiFromModules<{
  admin: typeof admin
  auth: typeof auth
  configuration: typeof configuration
  members: typeof members
}>

export const api: FilterApi<
  typeof fullApi,
  FunctionReference<"query" | "mutation" | "action", "public">
> = anyApi as unknown as FilterApi<
  typeof fullApi,
  FunctionReference<"query" | "mutation" | "action", "public">
>

export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<"query" | "mutation" | "action", "internal">
> = anyApi as unknown as FilterApi<
  typeof fullApi,
  FunctionReference<"query" | "mutation" | "action", "internal">
>

export const components = componentsGeneric() as unknown as {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">
}
