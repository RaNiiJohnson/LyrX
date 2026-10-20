# Authentication and profile operations

Lot 2 uses the repository-owned Better Auth Convex component with the exact
published pair `@convex-dev/better-auth@0.12.5` and `better-auth@1.6.33`.
Better Auth 1.7 is intentionally excluded until the adapter publishes compatible
support. The generated auth schema lives in
`packages/backend/convex/betterAuth/generatedSchema.ts`; custom indexes belong in
`schema.ts`, not in that generated file.

## Create a development deployment

The current development project is `johnsontolotriniavo/lyrx`, deployed in
Europe (Ireland):

- Project: <https://dashboard.convex.dev/t/johnsontolotriniavo/lyrx>
- Development dashboard:
  <https://dashboard.convex.dev/t/johnsontolotriniavo/lyrx/lovely-dolphin-50>
- Client URL: <https://lovely-dolphin-50.eu-west-1.convex.cloud>
- HTTP actions URL: <https://lovely-dolphin-50.eu-west-1.convex.site>

The ignored `packages/backend/.env.local` and `apps/web/.env.local` files are
already configured for this deployment. `BETTER_AUTH_SECRET` and
`SITE_URL=http://localhost:3000` are set in its server environment. Google OAuth,
`RESEND_API_KEY`, and `RESEND_WEBHOOK_SECRET` are also configured in the Convex
dashboard; values remain outside the repository.

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

The command has run successfully; the versioned `_generated` files now come
from the official Convex code generator.

## Configure backend environment

Set runtime values on the Convex deployment, never under a browser-visible
`VITE_` prefix:

```bash
pnpm --filter @lyrx/backend exec convex env set BETTER_AUTH_SECRET '<random-secret-at-least-32-characters>'
pnpm --filter @lyrx/backend exec convex env set SITE_URL 'http://localhost:3000'
```

Email verification and reset use the official `@convex-dev/resend` component.
The API key is the only application environment value required for sending:

```bash
pnpm --filter @lyrx/backend exec convex env set RESEND_API_KEY '<secret>'
```

The sender follows the already verified Hallomada setup:
`Lyr’X <noreply@hallomada.de>`. The component queues and retries delivery and
exposes `POST /resend-webhook`. Configure Resend to send all `email.*` webhook
events to:

```text
https://lovely-dolphin-50.eu-west-1.convex.site/resend-webhook
```

Set `RESEND_WEBHOOK_SECRET` in Convex when webhook status tracking is enabled.
Once Lyr’X has its own verified email domain, move the sender to an
`EMAIL_FROM` Convex environment value so development and production can change
addresses without a code deployment. This migration is tracked in
[progress.md](progress.md).

Google sign-in and explicit account linking are enabled only when both values
exist:

```bash
pnpm --filter @lyrx/backend exec convex env set GOOGLE_CLIENT_ID '<client-id>'
pnpm --filter @lyrx/backend exec convex env set GOOGLE_CLIENT_SECRET '<secret>'
```

The local Google flow currently requests this callback URL:
`http://localhost:3000/api/auth/callback/google`. The live browser test reaches
Google's account picker and consent screen. Completing consent and proving the
return session remains a separate test because it creates or links a real Lyr’X
account.
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

The repository now proves a successful push to a real development deployment,
live anonymous and capability queries, installed Better Auth and Resend
components, schema generation, TypeScript, production bundling, and in-memory
authorization/profile tests. Google reaches its real consent screen. Delivered
email, Google consent return, authenticated session cookies, webhook events, and
live image upload still require an actual test account and end-to-end evidence.
