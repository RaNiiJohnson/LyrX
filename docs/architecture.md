# Architecture and decisions

## Required stack

- TypeScript throughout.
- pnpm workspaces at the repository root.
- TanStack Start for `apps/web`; it must not be replaced with Next.js.
- Convex for data, server functions, realtime queries, and application images.
- Better Auth for email/password and Google authentication.
- shadcn/ui source components for the web interface.
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

## External prerequisites not yet available

- Convex deployment configuration.
- Google OAuth client credentials.
- Transactional email provider.
- Domain and hosting configuration.
- EAS project and Android signing configuration.

Absence of these values must be reported as an unverified integration, never
hidden by a fake success state.
