# Lot 11 verification

Base: `e8ffc16` (local lot 10 commit). Branch: `codex/lyric-sharing-cards`.
The user approved the card design and implementation while reviewing lot 10.
Lot 10 was not merged into main. The existing AGENTS.md Turborepo guidance was
preserved; its initial diff is recorded at `/tmp/lyrx-lot11-existing-agents.patch`.

## Delivered behavior

Public Artist/Fan songs compose **Create a card** beside the notebook action.
The private notebook offers it in an excerpt's menu, disabled for unavailable
entries. A changed notebook source requires a new selection from the current
public song. Active, verified member authorization applies to preview and export;
foreign passage IDs are rejected even for administrators.

The dialog shows an exact native text selection and a 9:16 raster preview, with
an artwork checkbox and local PNG download. It uses the existing Caffeine/shadcn
components, DM Sans, TanStack Form, translations and modal focus restoration.
Mobile puts the preview above controls with a fixed footer; desktop has two
columns. No native sharing, public link generation, publishing, audio or lot 12
work is included.

## Rendering and safety contract

- Output: 1080×1920 PNG; source-derived passage, song title and artist, plus a visible
  Lyr'X brand signature baked into the pixels. This is visual branding, not a
  cryptographic signature, verified badge or rights certification.
- Selection is limited to 360 UTF-16 units and ten rendered passage lines. Title
  and artist each have a maximum of three rendered lines. Actual font measurement
  wraps words/graphemes, retains explicit line breaks and fails rather than clips
  overlong text/metadata. Native textarea CR/CRLF offsets map to canonical offsets.
- Stable Corail studio export palette, independent of the surrounding UI theme;
  optional current managed artwork is blurred and darkened. There is no arbitrary
  client image URL or user-supplied embed input. CORS fetch + a decoded blob image
  keep the canvas origin-clean. Image failures require disabling artwork or retrying;
  files over 10 MiB or 8192 px per side and unsupported MIME types fail closed.
- No new database tables, uploads or persistent sharing artifacts. Queries authorize
  canonical source/owner visibility and private passage ownership, derive content,
  and check the complete-source fingerprint and bounded selection. Variable-range
  reads use the standard SDK hook and are not retained by Helpers.
- Download uses the same canvas as the preview. Two uncached Convex query checks,
  before PNG encoding and immediately before triggering download, compare the
  current version, selection, attribution and artwork ID. Closing the dialog or
  changing selection prevents an in-flight export. A distributed client cannot
  recall a downloaded file or guarantee revocation after the last server check.

## Automated evidence

Focused suites: six backend cases, eleven web cases, one portable range case.
They cover both origins/roles, direct anonymous/suspended/unverified access,
foreign/admin notebook IDs, current vs edited notebook snapshots, withdrawal
between preview and export, owner suspension, selected ranges/Unicode/limits,
word/grapheme wrapping, canvas failure, filename/URL cleanup, final revalidation,
close cancellation, unavailable UI, explicit opening and deferred focus return.
Final `pnpm check` passed formatting, lint, all TypeScript projects, **480 tests**
(329 web, 120 backend, 31 shared) and production client/SSR builds. The full log is
`/tmp/lyrx-lot11-check.log`. Only documentation changed after that gate; final
formatting was checked separately.

## Browser evidence

A real signed-in song journey produced `/home/niiavo/Downloads/lyrx-Esremborak.png`.
Separate temporary renderer fixtures used original technical text and a current
managed public artwork. Actual downloads were PNG 1080×1920: plain 105,938 bytes,
with artwork 609,338 bytes; the real song export was 794,155 bytes. Oversized text
was refused and disabled the download. All three file headers/dimensions were
verified with Pillow. No publication, notebook, profile, account or role was changed.

Real application screens were embedded in temporary same-origin 390×844 and
1440×1000 frames because the browser viewport override did not affect existing
tabs. Measurements confirmed document scroll widths of 390 and 1440, respectively;
the mobile dialog filled exactly 390×844, and the desktop dialog was 1024 px wide.
Native keyboard selection and the rendered canvas were exercised in both.
`/tmp/lyrx-lot11-responsive.png` captures the two layouts. The real screen screenshot
is `/tmp/lyrx-lot11-desktop.png` (default-width capture, not a viewport measurement).

Temporary fixture HTML pages were moved to Trash before the root build and are
not delivered. The initial verification session showed the sign-in screen; a subsequent browser
session reconnection supplied an authenticated song journey. No physical-phone touch,
other browser engine, live cross-account session, source withdrawal/moderation or
native mobile integration is claimed; destructive/privacy paths use isolated tests.

## Local review and delivery state

The primary agent reviewed the complete working diff/new files against `e8ffc16`
for repository standards and the approved scope. Convex expert/reviewer checklists
were applied to the read-only API and authorization. No delegated completion
review or code-review skill was used. Corrections included export cancellation,
metadata/artwork revalidation, Unicode wrapping and absent-artwork handling.

Accepted limits: fixed text/metadata layout can reject a long title/artist even
with a short passage; the visible failure is preferable to silently clipping or
rewriting source attribution. Download permission is a last server check, not DRM.
No unresolved Critical/Important Convex or hard specification finding remains.

Changes were initially left uncommitted for Ctrl+Shift+G review. The user then
authorized a local commit after the selection-event correction, explicitly excluding
merge and PR creation. No push, PR, merge or production deployment is performed. The existing development watcher serves the new functions;
the successful real preview/download exercised them without a new migration.

## Native-selection follow-up

The React-only onSelect binding could defer updates during mouse selection. Two
regressions reproduced the zero counter on native select/document selectionchange
before the fix. Sharing and notebook textareas now share a native-event hook,
including keyboard/pointer/touch completion, focus-transfer preservation and listener
cleanup. Fourteen targeted form tests passed; browser selection updated the counter
and preview without deselection. The corrective `pnpm check` passed formatting, lint, TypeScript, **482 tests**
(331 web, 120 backend, 31 shared) and production builds; log:
`/tmp/lyrx-selection-check.log`. Final documentation formatting passed as well.
