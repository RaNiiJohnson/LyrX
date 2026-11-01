# Lot 12 — Web hardening review (first pass)

## Errors and loading

- Alert titles no longer repeat "unexpected error"; they read "Couldn't complete
  the action" and the description gives the actual cause.
- `getErrorMessage` now maps the four previously unmapped backend codes
  (`ACCOUNT_UNAVAILABLE`, `ADMIN_ALREADY_EXISTS`, `ELIGIBLE_MEMBER_NOT_FOUND`,
  `SESSION_EXPIRED`) and common Better Auth codes (token, email, password length).
- Failures without an application code are classified: offline/network,
  Convex validators, masked "Server Error". Any other coded failure keeps its
  code visible, for example `Une erreur inattendue est survenue (SOME_CODE).`
- Community contribution detail and edit routes now use the shared route
  pending, error and not-found boundaries. `/community` is only a redirect.

## Security (read-only review, no defect found)

- No unauthenticated mutation or action exists besides the signed Resend webhook
  and the Better Auth routes. Writes use member/admin wrappers.
- Rate limiters cover profile images, interactions, notebook, community, artwork
  uploads and views. No `dangerouslySetInnerHTML` in the web app.
- Sharing and notebook reads derive ownership, publication and text server-side.
- Open item: no HTTP security headers (CSP, frame-ancestors, referrer policy) are
  configured; they depend on the hosting target, which is not chosen yet.

## Cost (read-only review)

- No unbounded `.collect()` in the backend; reads are indexed and paginated.
- Notebook list hashes the full lyrics of each card on the page; bounded by page
  size. Store a source fingerprint if pages grow.
- Notebook save reads up to 500 small rows for quota and duplicate checks; the
  three recovery crons run every 5 minutes and are index-only when idle.

## Not done

Legal pages (deferred by the user), browser audit with a signed-in account,
independent review, security headers.
