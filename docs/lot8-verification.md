# Lot 8 — public search and release slider

## Scope and implementation

Branch `codex/lot8-public-search` starts at updated `main`, `a6644da`.
The pre-existing documentation edits and new direction file were preserved in
`231ce72`. Only the primary agent edited files, ran migrations/checks and reviewed
the lot. One standard sub-agent researched native search in read-only mode.
Removed `design/` references and guidance were not restored.

The navbar opens the installed shadcn Dialog. TanStack Form validates search
after a 450 ms typing pause; Enter or the button submits immediately. Intermediate
keystrokes cancel pending work, composition waits until completion, clearing the
input cancels search, and changed input hides previous results. The long search
explanation is screen-reader-only as requested. Each request
asks for 12 relevance-ranked results, with native cursor next/previous controls.
Only the current page is rendered. There is no estimated full-result count.
Loading, empty, unavailable/backfill, short continuing pages, validation and
technical-error recovery have separate localized feedback. Close/Escape, initial
input focus and focus restoration use the dialog's focus lifecycle.

The home slider replaces the former static hero. It combines the existing
bounded public home song/album selections,
sorts by first-publication time and keeps at most six. It uses native horizontal
scroll/snap for touch, keyboard arrows and labelled previous/next controls. Zero
entries show the existing empty state; one entry has no controls. Missing or
broken artwork uses themed fallback colors and a music placeholder. Titles,
context, badges and actions overlay the
background. Variant A uses the same artwork URL in a real blurred backdrop image
(70px, saturation 1.5) and a sharp 380px square cover on desktop. Only the active
slide creates the blurred image layer. Mobile centers the cover above the text and
full-width action, with counter/progress bars; desktop also offers pause/arrows.
The hero begins at y=0 behind the glass header, with no negative-margin offset.
Rotation runs every
seven seconds, pauses on hover, focus or touch interaction and when the document
is hidden, and is disabled by reduced motion. Touch release/cancel and pointer
exit restart a full delay; keyboard focus
pauses until blur. Desktop explicit pause is independent. No media autoplay, new
project model, editorial administration or media
provider is introduced. The floating rounded header preserves existing navigation,
auth controls, mobile bottom navigation and Caffeine tokens.

## Search contract and costs

Sources checked on 27 October 2026: [Convex full-text search](https://docs.convex.dev/search/text-search),
[SearchFilterBuilder](https://docs.convex.dev/api/interfaces/server.SearchFilterBuilder),
and the installed Convex **1.47.0** search/pagination types. Native search has
OR semantics, relevance ordering and a prefix on the final term only. Earlier
terms match complete tokens. No substring, strict AND, exact quoted phrase,
typo correction, accent folding, translation or Malagasy stemming is promised.
Latin-script Malagasy can be searched literally; punctuation/apostrophes split
terms. The application accepts 1–16 terms, each up to 32 characters, at most
200 input characters, and pages of 1–12 items. Native tokenization can impose
additional limits on unusually long/non-Latin tokens.

Convex permits one search field, up to 16 filter fields and eight equality
filters, and scans at most 1,024 search results per query. Native pagination is
used rather than collecting that window or offset-scanning the catalogue.
Search does not enforce `maximumRowsRead`/`maximumBytesRead`; the application
bounds page cardinality instead. Reactive relevance pages can move after edits;
there is no snapshot/exhaustive-count guarantee. Each search is billed against
the whole index size in query-GBs even when few matches are returned. Debounced
submission avoids intermediate-keystroke requests; no external search service
or browser-side catalogue download is introduced.

`discoveryEntries.searchText` contains only currently public title, credited/
guest artist, genre (including public FR/EN aliases/custom genres) and lyric
text, or public album/artist metadata. Fan album references are searchable;
official album title searches return album cards, not an implied association
with every track. Reports, reasons, auth/email, notebooks and draft text are
never copied. Search text is not returned by any public query. Excerpts are at
most 220 source characters plus ellipses, selected by literal token/final-prefix
matches in the current canonical lyrics; metadata-only matches need no excerpt.
Legacy lyrics use the existing bounded compatibility reader.

Publication/edit/withdrawal/moderation/deletion triggers update or remove the
projection transactionally. Eligibility changes and artist-name changes that
affect album metadata use the existing durable owner refresh. Queries fail
closed while jobs are pending and before the versioned global backfill completes.
Each candidate independently rechecks source publication, current member role,
active/verified/profile status and the account revocation marker before returning
any public card or excerpt. A short page retains its native continuation cursor.
Existing storage URLs/downloads and text already delivered cannot be recalled.

Search text increases projection storage/read size. Search-only edits patch the
text without rebuilding unchanged Aggregate positions. A future large catalogue
may justify splitting text storage from discovery cards, but there is no second
projection lifecycle to maintain in this lot.

## Verification evidence

Automated checks and final browser evidence are recorded in [progress](progress.md).
Backend regression tests cover both origins and routes, public metadata/genres,
lyrics excerpts, Fan attribution, drafts/hidden/removed content, edits removing
old terms, suspension, revocation, missing profiles, stale source hydration,
cursor boundaries, input limits and versioned backfill. DOM checks cover
debounced and immediate requests, native cursor navigation, result links,
state feedback,
retry, validation and zero/one/multiple slider entries, bounded selection,
keyboard movement, automatic rotation, hover/focus/explicit pause and reduced
motion. Tests do not claim to reproduce native
Convex tokenization/relevance; live development queries supply that evidence.

Development deployment and index creation succeeded on `lovely-dolphin-50`.
The idempotent discovery backfill was rerun; observed state is
`initialized:true,searchVersion:1,pendingJobs:0`. Some CLI/browser requests
initially failed or reconnected because of intermittent network connectivity;
retries succeeded. No production deployment, new publication, account/role
change, real moderation or destructive test was used to manufacture evidence.

## Local completion review

The primary agent applies the mandatory standards/specification review to the
entire lot from `a6644da`, including the user's retained scope notes, then applies
the Convex reviewer checklist in security, performance and quality passes.
Public search intentionally needs no authenticated identity: source eligibility
is the authorization boundary. Existing write wrappers and ownership rules are
unchanged. Review corrections and final gate results are recorded in progress.
