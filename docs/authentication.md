# Authentication and profile operations

Lot 2 uses the repository-owned Better Auth Convex component with the exact
published pair `@convex-dev/better-auth@0.12.5` and `better-auth@1.6.33`.
Better Auth 1.7 is intentionally excluded until the adapter publishes compatible
support. The generated auth schema lives in
`packages/backend/convex/betterAuth/generatedSchema.ts`; custom indexes belong in
`schema.ts`, not in that generated file.

## Create a development deployment

From a clean checkout, install dependencies, then select or create a Convex
development deployment. This changes external state and is therefore an
operator step:

```bash
pnpm install --frozen-lockfile
pnpm --filter @lyrx/backend dev
```

Copy the generated `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` into
`apps/web/.env.local`, add `VITE_SITE_URL=http://localhost:3000`, and keep every
real `.env.local` file uncommitted. Regenerate official Convex types after the
deployment exists:

```bash
pnpm --filter @lyrx/backend convex:codegen
```

Until that command can run, the versioned `_generated` files are typed bootstrap
stubs and say so in their headers.

## Configure backend environment

Set runtime values on the Convex deployment, never under a browser-visible
`VITE_` prefix:

```bash
pnpm --filter @lyrx/backend exec convex env set BETTER_AUTH_SECRET '<random-secret-at-least-32-characters>'
pnpm --filter @lyrx/backend exec convex env set SITE_URL 'http://localhost:3000'
```

Email verification and reset use Resend only when both values exist:

```bash
pnpm --filter @lyrx/backend exec convex env set RESEND_API_KEY '<secret>'
pnpm --filter @lyrx/backend exec convex env set EMAIL_FROM 'LyrX <auth@example.com>'
```

Google sign-in and explicit account linking are enabled only when both values
exist:

```bash
pnpm --filter @lyrx/backend exec convex env set GOOGLE_CLIENT_ID '<client-id>'
pnpm --filter @lyrx/backend exec convex env set GOOGLE_CLIENT_SECRET '<secret>'
```

Register the callback URL shown by the configured Better Auth/Google flow and
verify it against the real development origin before treating OAuth as working.
The interface reads a server capability query and otherwise disables Google; it
does not simulate availability. Account linking requires a verified local email,
trusts Google as the provider, rejects different emails, and cannot unlink the
last account.

## Generate the local Better Auth schema

The generator loads the backend configuration, so non-production values are
required even though it performs no deployment:

```bash
BETTER_AUTH_SECRET='local-schema-generation-secret-at-least-32-characters' \
SITE_URL='http://localhost:3000' \
CONVEX_SITE_URL='https://example.convex.site' \
pnpm --filter @lyrx/backend auth:schema
```

The script formats its generated output. Review schema changes before commit.

## Bootstrap the first administrator

There is no public promotion endpoint. First let the intended administrator
verify their email and complete onboarding, then run the internal mutation using
deployment administrator access:

```bash
pnpm --filter @lyrx/backend exec convex run admin:bootstrapFirstAdmin \
  '{"email":"admin@example.com"}'
```

The operation accepts only an active, verified member and refuses to run after
one administrator exists. Later administration workflows must use authenticated
server authorization rather than this bootstrap path.

## Verification boundary

The repository proves schema generation, TypeScript, production bundling, and
in-memory authorization/profile tests. A real deployment, delivered email,
Google consent return, session cookie across the deployed proxy, and live image
upload still require operator-owned Convex, Resend, and Google configuration.
They must remain recorded as unverified until exercised with evidence.
