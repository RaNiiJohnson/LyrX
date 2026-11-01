# Lot 10 verification

Fixed point: `ce7b21fa0b872cc2a99e4d948b531c0e28f6918f` (merged PR #8).
Branch: `codex/private-lyric-notebook`, existing checkout, initially clean.
The user explicitly approved the notebook design and implementation.

## Implemented journeys

- Public Artist/Fan song → explicit save dialog → exact selected excerpt → default
  or named private collection → notebook → source song.
- `/notebook` owns member gating, visible header and collection selection; meaningful
  save/collection/list behavior is under `features/notebook`. Normal lyric reading
  stays read-only. Optional/protected reads follow the approved Helpers cache rule.
- Default collection always exists. Custom create/rename/delete, move, excerpt
  removal, incremental pages, loading/empty/error/retry and unavailable states.
- Changed lyrics retain a clearly labelled old snapshot. Missing/hidden/unpublished
  sources and ineligible owners expose no snapshot content or source artwork.
  Scheduled batches redact stored snapshots while unavailable; purged snapshots
  are not reconstructed. Account deletion erases the private notebook.
- Sharing-card generation/download is not implemented; it belongs to lot 11.

## Automated checks

Focused backend tests cover both origins and roles, anonymous/suspended/revoked
access, admin/cross-account isolation on every API, forged IDs, concurrent retries,
source change/stale save, unavailable output, stored redaction, republication,
collection lifecycle, pagination, range/Unicode/name/quota limits, the real account
cleanup job, multiple cleanup batches and stalled-job recovery.

Focused DOM tests cover explicit selection, exact repeated-text range submission,
source-conflict retry, sign-in gating, changed/unavailable cards, pagination,
collection creation without a callback and deferred keyboard-focus restoration.
The portable range test covers CRLF, lone CR, repeated text and emoji offsets.

Final `pnpm check` passed formatting, lint, all TypeScript projects, **462 tests**
(318 web, 114 backend, 30 shared), and production client/SSR builds. Full result:
`/tmp/lyrx-notebook-final-check.log`. Only documentation changed after that gate;
its formatting was checked separately.

## Browser and development deployment evidence

The user's existing `pnpm dev`/Convex watcher was already running in this checkout;
no additional deployment target or production push was started. Actual runtime
verification successfully saved an own excerpt from an existing public song and
read it in the private notebook. The CLI successfully removed only that single
verification-created row through the authenticated notebook API; the table was
then empty. No real publication, profile, comment, role or account was changed.

Inspected the real interface at 1440×1000 and 390×844: desktop collection column,
mobile collection selector, readable cards, fullscreen mobile selection, collection
form cancellation, native keyboard selection and visible save controls. Mobile
`scrollWidth` and viewport both measured 390; computed font was DM Sans Variable.
FR/EN and light/dark rendering were exercised; original French/system preferences
were restored. The temporary viewport override is reset at handoff.

Screenshots of the populated verification notebook before its temporary excerpt
was cleaned up: `/tmp/lyrx-notebook-desktop.png`, `/tmp/lyrx-notebook-mobile.png`.
An intermediate HMR context mismatch disappeared after a complete document reload;
normal fresh-page rendering was checked afterward. No live cross-account login,
source withdrawal, destructive moderation or account deletion was performed;
isolated backend tests supply that evidence. Native touch selection was not tested
on a physical phone. Previously delivered auth integration limitations remain.

## Review and limits

The primary agent reviewed the full lot locally against the fixed point, including
new modules/tests, generated route/API types, integration, translations and docs.
Convex expert/reviewer checklists were applied to schema, private APIs, triggers,
recovery and account cleanup. Corrections and the accepted capped-scan cost are in
progress. No unresolved blocking finding remains. No extra dependency was added.
Tables are additive, so no historical migration is needed; reverting the schema
requires preserving any newly saved data. Snapshot redaction is irreversible.
