# Lot 8 direction — catalogue search and home presentation

Approved for implementation handoff on 26 October 2026. No application code is
changed by this note. Lot 7 is merged in PR #5 at `62dd6eb`.

## Current visual reference

The implemented Lyr'X interface is the visual reference for this and later lots.
Keep its Caffeine theme, colors, typography, shadcn/ui primitives, responsive
navigation and footer behavior. The user removed the local `design/` image
references and `docs/design-guidance.md`; do not restore them, retrieve historical
PNGs, or treat their absence as a blocker. Historical lot notes may still mention
those files; this decision supersedes instructions to use them.

Two user-supplied screenshots of https://skystream.fun/ illustrate interactions
only. They are not a request to copy its branding, colors, assets or content:

- Home: a large image-led slider highlighting public musical releases/projects,
  with readable title/context, link actions and slide controls. Use existing
  public albums or songs; do not invent a new project data model or a new
  editorial administration system. Keep the selection bounded and public-only,
  support keyboard/touch and reduced motion, and handle zero/one/multiple entries
  and missing imagery. No media autoplay is introduced.
- Search: an entry in the navbar opens a focused overlay over a dimmed backdrop,
  with a prominent input and scrollable results containing image, title and
  secondary context. Use an appropriate shadcn dialog/command composition,
  Escape/close, focus restoration and a mobile-safe layout. Preserve an accessible
  label and separate loading, empty, unavailable and error feedback.

The home slider is an explicitly requested presentation addition to lot 8.
Other later-lot product features remain deferred. Use existing project assets;
the supplied reference screenshots are sufficient unless behavior needs checking.

## Search behavior

Implement the roadmap search over public titles, artists, albums, genres and
supported lyric terms, with bounded matching excerpts where applicable. Reuse
the unified Artist/Fan public discovery model, preserving origin badges,
contributor attribution and distinct write permissions.

Check actual Convex search behavior and limits in official documentation and the
installed version. Document language/tokenization, multi-word, substring and
phrase limitations accurately, particularly for Malagasy. Never substitute an
unbounded database scan or loading the entire catalogue into the browser.

Results, counts and excerpts must exclude drafts, hidden/removed contributions
and ineligible/deleted authors. Updates, withdrawals, moderation and account
deletion must invalidate any search projection appropriately. Bound requests and
result pages; avoid a request for every intermediate keystroke. Ensure navigation
to a result works with the existing public detail routes. Keep FR/EN interface
copy and English technical Convex messages.

## Sub-agent constraints for the implementation session

The primary agent may delegate narrowly scoped, read-only investigation such as
search capability research, locating call sites or checking a proposed approach.
Use standard agents inheriting the parent model by default. Do not select another
model or a specialized role that fixes a different model without the user's
agreement. Assign a bounded question and request a concise source-backed report;
send only relevant context when practical.

Sub-agents must not modify files, documentation, generated outputs, dependencies,
Git state or application data, and must not start deployments. They share the
filesystem: delegation alone does not provide isolation. Only the primary agent
implements, integrates, runs the full gate, updates docs and commits. The mandatory
entire-lot local completion review remains with the primary agent and is not
delegated.

## Delivery workflow authorized for the implementation session

Verify Git, the merged prerequisites and local changes; create a dedicated
`codex/` branch from updated `main` without losing user edits. Implement only lot
8 and the explicitly described slider. Run the repository completion review,
applicable Convex review, `pnpm check` and relevant browser checks. Document actual
evidence and remaining limits; always give a final debrief.

The user authorizes committing and pushing that branch, then preparing an
English Markdown PR title/body in Chrome. Stop before `Create pull request`;
the user creates and merges the PR. Do not deploy to production or change account
roles. This research session only records the handoff and does not start that
implementation or delivery workflow.
