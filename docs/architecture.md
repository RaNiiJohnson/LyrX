# Architecture and decisions

## Required stack

- TypeScript throughout.
- pnpm workspaces at the repository root.
- TanStack Start for `apps/web`; it must not be replaced with Next.js.
- Convex for data, server functions, realtime queries, and application images.
- Better Auth for email/password and Google authentication.
- shadcn/ui source components for the web interface.
- TanStack Form for every interactive web form; fields and validation feedback
  compose the installed shadcn/ui primitives.
- Expo / React Native for `apps/mobile` after the web backend stabilizes.

## Repository boundaries

```text
apps/web/                 TanStack Start web application
apps/mobile/              Expo application (created in the mobile foundation lot)
packages/backend/         Convex project and Better Auth server integration
packages/shared/          Portable domain types, translations, and design tokens
docs/                     Product, architecture, research, delivery, and operations
```

Web components never cross into React Native. Only framework-neutral types,
translations, validation rules, and design tokens belong in `packages/shared`.
Both clients use one backend; security rules are enforced in Convex functions,
not duplicated as trust decisions in clients.

## Foundation decisions

1. Use one root lockfile and root commands so a clean checkout has one install
   and one verification entry point.
2. Keep applications and internal packages independently type-checkable and
   buildable through workspace scripts.
3. Commit example environment files only. Convex deployment data, Google OAuth,
   transactional email, hosting, EAS, and signing credentials remain external.
4. Defer schemas, auth tables, business functions, UI themes, and Expo scaffolding
   to the lots that can verify their behavior end to end.
5. Store implementation research under `docs/research/`; decisions in this file
   remain the concise source of truth.

## Account and profile decisions

1. Pin `@convex-dev/better-auth@0.12.5` with `better-auth@1.6.33`; keep the
   Better Auth component and generated schema local to the repository while the
   published adapter remains the integration boundary.
2. Proxy Better Auth through the TanStack Start catch-all route and isolate all
   server helpers from client modules. Google and transactional email are
   capability-gated from typed Convex environment values.
3. Store authentication users in the Better Auth component and product
   authorization in application tables: `members`, `profiles`, and
   `artistProfiles`. Fan/Artist, administrator, credited identity, and future
   verification badges remain separate concepts.
4. Require a verified email before onboarding and active-member authorization
   before profile writes. Suspended profiles disappear from public queries and
   every protected mutation rejects them server-side.
5. Keep first-admin assignment internal and single-use. No client-facing path
   can promote an account.
6. Store only Convex storage identifiers for avatar and banner images. An upload
   intent is short-lived, authenticated, rate-limited, and can accept only a
   storage object created during its lifetime. Persist ownership before
   attachment; delete a replaced object only when that ownership is proven and
   no profile still references it. Preserve an unowned client-supplied object
   rather than risk cross-account deletion. Resolve URLs only for public reads.
7. Use HTTPS allowlists for named social providers and HTTPS-only custom links.
   Public profile queries project only fields intended for anonymous readers.
8. Prefer an official Convex component whenever one covers the capability. The
   Resend component owns queued, durable, idempotent email delivery, and the
   Rate Limiter component protects upload-intent creation.

Operational setup and the evidence boundary are documented in
[authentication.md](authentication.md).

## External prerequisites not yet available

- Domain and hosting configuration.
- EAS project and Android signing configuration.

The Convex development project, Google OAuth credentials, and Resend credentials
are configured on the Europe-region development deployment. Their values and
local selection files remain ignored; public links and remaining end-to-end
checks are recorded in [authentication.md](authentication.md).

Absence of these values must be reported as an unverified integration, never
hidden by a fake success state.
