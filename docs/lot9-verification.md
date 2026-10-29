# Lot 9 — song likes, comments and comment reports

## Current status

Resumed on 29 October after the saved design checkpoint. Automated review and
checks cover the final implementation; final visual acceptance remains open
because the available browser tool cannot reach the user's localhost. Earlier
local-browser evidence predates the new design. See [progress](progress.md).

## Scope

Authorized on 29 October 2026 after lot 8 merged in PR #6 (`6e5659d`).
Branch `codex/lot9-song-interactions` starts at updated `main`, `e6d6822`,
including the user's AI-file/dependency update. The working tree was clean.
One standard sub-agent examined web integration seams read-only. The primary
agent made every edit and owns the completion review.

Both official Artist songs and Fan community contributions support likes and
flat chronological comments. Studio previews/drafts and albums do not. Existing
Fan lyric reporting/moderation stays separate. No replies, mentions, rich HTML,
notebook, sharing-card or lot 10 capability is introduced.

## Contracts and authorization

`convex/interactions/` owns `read`, `write`, `moderation`, `access`, `model` and
bounded `cleanup`. Every registered function validates arguments and returns.
All writes derive the member from the authenticated, verified, active session;
callers cannot supply another author/member. Anonymous readers receive only
public counts, comment text, public author names/handles and action eligibility.
Reports, request identifiers, private membership fields and email never enter
public results. Admin report reads/decisions use the existing admin wrappers.

Source IDs are a typed union of songs/community contributions; their canonical
row determines origin, publication status and owner. The shared eligibility
helper independently checks active/verified membership, the required Artist/Fan
role, profile availability and account revocation. Interaction reads do not rely
on search-index readiness. Withdrawn/hidden/deleted sources immediately yield no
public interaction data or liked-list metadata. Public commenters independently
pass current eligibility checks; account revocation hides their text immediately.
Already delivered text cannot be recalled from a reader's browser or copies.

Likes use explicit desired state (`liked:true/false`), not toggle semantics.
An indexed member/source lookup and count update commit in the same mutation.
Concurrent duplicates cannot add another row or increment twice. Removing a
like remains permitted when its source is unavailable. The public count is the
number of retained like rows, including historical likes from suspended members;
deleted-member likes are decremented by the bounded account cleanup. Counts can
therefore settle after that cleanup, rather than scanning all members per read.
The private `/liked` list paginates newest likes, hydrates current public metadata
and omits unavailable sources. A short/empty filtered page retains continuation.
The list is not exposed by member ID in any public API. Popularity remains the
existing seven-UTC-day deduplicated-view ranking; this lot does not silently mix
lifetime likes into a recent-view metric.

New comments contain 1–500 trimmed characters and an author-scoped request ID of
1–100 characters. An unchanged retry reuses its ID; editing a failed draft starts
a new request. Reusing an ID on another source/payload is rejected. Deleting or
moderating a comment erases its body, retains a minimal tombstone for deduplication
and audit linkage, and never restores text through a publish retry. There is no
comment-edit endpoint, so moderation targets immutable text or an already-erased
record and needs no text-revision workflow.

Members can report another currently public comment using one of four stable
categories (spam, abuse, inappropriate, other), with optional details up to
1,000 characters. Legacy category-less calls still require 1–1,000 characters.
One report per reporter/comment is idempotent; reports alone never hide text.
Admins classify an existing report as dismiss/remove with a required bounded
reason. Identical decision retries succeed; conflicting resolved decisions fail.
Removal erases only that comment, not its source song. No restoration is offered.
Admin history retains report/decision reasons but does not make a separate copy
of the comment body. A reporter's own free text can independently quote content;
clean deletion of a comment does not rewrite another person's report reason.

The existing Rate Limiter component supplies transactional token buckets:

| Write | Rate | Burst |
| --- | --- | --- |
| New like | 30/minute/member | 10 |
| New comment | 30/hour/member | 5 |
| New comment report | 10/hour/member | 3 |

Idempotent retries spend no token; unlike and own deletion are not rate-limited.
Native pages accept 1–50 items; web comments/reports request 12 and likes 24.
The member/source index enforces uniqueness transactionally; the separate
member-only index exists specifically for creation-time ordering of liked pages.
All growing queries use indexed bounded reads or native pagination.

## Lifecycle and cost

One count document per source avoids a likes scan. It is a deliberate simple
counter, not a ranking/offset query: highly concentrated write traffic may
contend on that source's counter and would justify a sharded design if observed.
No new dependencies/components or user-installed dependency upgrades are added.

Source-deletion triggers atomically persist a cleanup job and schedule work.
Jobs delete at most 25 likes or reports, or one comment per batch; a five-minute
cron resumes jobs stalled for five minutes. Public reads already reject the
missing source while physical cleanup proceeds. No public arbitrary cleanup
endpoint exists. Account deletion's final-phase guard, including old jobs,
removes likes/counts, erases/anonymizes owned comments, anonymizes foreign report
reasons and moderator IDs, and preserves decisions on another author's content.
Existing catalogue/discovery triggers and storage ownership rules are preserved.

The additive new tables need no historical content migration. Development uses
the existing Europe deployment; never add `--prod` without separate authorization.
The full local gate and deployment/browser outcomes are recorded in progress.

## UI and evidence boundary

Public detail wrappers mount the shared interaction section after the reader.
Personal state is queried client-side, never prefetched in public SSR loaders.
`/liked` is linked from both member roles; `/admin/comments` is admin-only.
Existing Caffeine tokens, shadcn primitives and TanStack Form are retained.
The approved comment design uses compact borderless reactions, avatar rows with
separators and relative dates, You/Artist badges and ellipsis menus. The inline
composer displays a 0/500 counter and Commenter/Comment; menu actions use
Signaler/Report and Supprimer/Delete. Deletion menu/confirmation use the destructive
variant. The heading has no duplicate count; only the comment reaction displays
the loaded count, with `+` for a continuing page. Both reaction skeletons are 36×36px circles, with no loading ellipsis button.
The report dialog offers a bounded public excerpt, four categories and optional
details. New InputGroup/RadioGroup source was reviewed from the shadcn CLI without
overwriting existing primitives or adding dependencies.

Likes and comment submission use React `useOptimistic` inside async Transitions
on the client; this refinement changes no Convex functions or authorization.
The heart/count reflects the requested state immediately and rebases over live
server counts without applying the same increment twice. Pending comment rows
show Envoi…/Sending… and offer no delete/report actions until canonical data
arrives. Errors roll back the preview and retain the draft/request ID for retry.
Each operation clears its own preview even if another Transition remains pending.
Changing source remounts the section, avoiding a draft/preview on another song.

A newly loaded own row with matching trimmed text suppresses the pending preview;
this is only display reconciliation, not an identity/idempotency guarantee. The
server's existing request ID remains the exact duplicate guard. Successful writes
return to the authoritative chronological pages: if newer comments fall beyond
the loaded pages, Load more is still needed. No unbounded fetch or permanent
client copy bypasses current visibility/moderation checks.

FR/EN labels, persistent localized errors, pending guards, plain-text rendering,
empty/loading states, reason dialogs and deletion/removal confirmations are
provided. Report-dialog Escape/cancel returns focus to its trigger. Keyboard
and small-screen layout are checked without publishing test comments/reports.

Backend fixtures exercise both origins, concurrent like/comment/decision retries,
auth and forged identities, draft/hidden/revoked sources, unavailable liked rows,
short-page continuation, text/page/rate bounds, clean deletion, private report
reads, decisions, account cleanup and source-cleanup recovery. DOM tests cover
anonymous/member/admin subscriptions, plain-text rendering, pending likes,
required text, draft/request retention on failure, deletion cancellation,
report errors and admin decision retries. Deferred-request cases also cover
immediate like/unlike feedback, rollback, concurrent live counts, pending comment
reconciliation, identical-text submissions, overlapping Actions and source
changes. They do not simulate distributed production load, physical devices or
a live cross-account admin session.

Reference behavior checked against installed Convex 1.48.0 backend and official
[React useOptimistic](https://react.dev/reference/react/useOptimistic),
[Convex optimistic updates](https://docs.convex.dev/client/react/optimistic-updates),
[OCC/atomicity](https://docs.convex.dev/database/advanced/occ),
[index ordering](https://docs.convex.dev/database/reading-data/indexes/) and
[Rate Limiter](https://www.convex.dev/components/rate-limiter) documentation.
