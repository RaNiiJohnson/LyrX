# Approved web design direction

Approved on 25 October 2026 for the lot 7 implementation. This document records
product and layout decisions; it does not claim they have been implemented.

## References and theme

The PNG files in `design/` are the layout references for desktop and mobile.
Preserve the existing Caffeine theme, semantic colors, primary color, typography,
and light/dark/system support. Do not recolor the project to copy screenshot
pixels. Apply the intended layout with responsive judgment rather than tracing
every dimension.

Existing fields, optional metadata, album behavior, and authorization remain
available even when a screenshot omits them. Reference images are not a reason
to remove a working capability or reintroduce previously removed fields.

Use installed shadcn/ui primitives for controls they cover: Button, Tabs, form
fields, menus, dialogs, badges, skeletons, pagination, and empty states. Compose
domain views from these primitives; ordinary semantic HTML/CSS remains appropriate
for page layout. Check for an appropriate shadcn primitive before implementing
an equivalent interaction from scratch.

## One public song catalogue

Public song lists combine artist publications and Fan contributions. Every item
has a visible origin badge, `Artiste` or `Communauté`, translated with the locale.
The badge identifies origin, not a verified artist identity or rights ownership.
Fan detail views retain contributor attribution separately from credited artists.

There is no separate public Community discovery destination in the lot 7 target.
The `Communauté` navigation link and `Communauté@2x.png` listing are superseded
by the unified public catalogue. Adapt mobile navigation accordingly; do not
leave a redundant Community destination solely because it appears in a mockup.
Keep access to Fan publication, personal contributions, and admin moderation.
Existing contribution detail links must keep working or redirect to the
corresponding detail; do not remove the backend community domain.

This is a unified reading experience, not a merge of content ownership or write
permissions. Fans cannot edit artist-owned songs/albums; artist accounts do not
gain control of Fan contributions. Report visibility and moderation rules remain
unchanged. Artist claim/replacement remains future scope.

## Header, hero, and mobile navigation

The user's 26 October correction keeps catalogue navigation **below the list
title**, as in `Voir tout – Albums@2x.png`: real links for Morceaux, Albums and
Artistes, with an underlined active destination. Do not duplicate these links
in the desktop header. That header contains Accueil plus Studio for an Artist
or Contributions for a Fan; other account states show Accueil alone.

Use a simple shadcn offcanvas account panel with separated exploration, account,
role tools and administration groups. Publication is the prominent action;
sign-out is separated at the bottom and must not receive initial focus. Language
(FR/EN), theme and account controls use equal 36px targets and a uniform gap.

The home hero uses a real image behind the headline, with a readable overlay
and deliberate mobile crop. Reuse suitable existing local music photography
when possible; selecting another asset does not change theme tokens.

Lot 7 includes the visual search entry shown in the mockup. Actual catalogue and
lyrics search remains lot 8. Until then, display a clear localized availability
message and a disabled or non-submitting control, rather than a working-looking
form that silently does nothing. Activating search must not open a dead route.

Mobile bottom navigation is fixed, adapts to authentication/role, and reserves
content space plus the device safe area. Nothing, including the final list item,
form actions, focused fields, or loading controls, may be covered by it.

## Footer

On desktop, short pages fill the viewport and place the footer at the bottom;
long pages put it after the content in normal document flow. The footer is not
fixed over content, and content is not forced into an extra scrolling panel.

On mobile, hide the decorative footer when bottom navigation is present. Keep
useful legal/contact links accessible from a menu or profile. Prefer form actions
in document flow instead of stacking a second fixed action bar above bottom
navigation; verify keyboard-open and safe-area behavior.

## Lists and pagination

Home artist and album rows scroll horizontally on touch devices, with a partly
visible next item, keyboard access, and desktop scroll buttons when overflowing.
Each row is a bounded selection with a `Tout voir` link. Do not cause whole-page
horizontal overflow or fetch an entire catalogue to populate these rows.

Dedicated all-song, all-album, and all-artist lists use numbered pages with page,
sort, and filters in the URL. Filters reset the page. Use Aggregate projections
where counts and positional access warrant them; a `Tout voir` link or horizontal
scroll alone does not require Aggregate. Public counts and entries must obey the
same visibility rules, excluding drafts, hidden/removed content, and ineligible
authors.

Unified song pagination must have one ordering, total, and page across both
origins. Do not concatenate independently paginated artist and community lists:
that produces incorrect ordering, totals, and page boundaries. Use a bounded
public projection/index strategy appropriate to both origins; update it alongside
publish, edit, withdrawal, moderation, and account deletion. Preserve stable
first-publication ordering with a deterministic tie-breaker. Reactive numbered
pages may shift when publications change; do not promise snapshot pagination.

Personal lists may retain appropriate cursor pagination and a `Charger plus`
control. Search pagination is decided in lot 8 against the actual search API.

## Studio and lyric entry

On mobile, the `Morceaux`/`Albums` tabs span the available content width and have
equal widths. The primary action follows the active tab: `Créer un morceau` or
`Créer un album`; it may occupy a separate full-width row on mobile. Desktop
keeps the action aligned alongside the tabs where space permits.

Keep one canonical lyric textarea. Optional `+ Intro`, `+ Couplet`, `+ Refrain`,
`+ Pont` and `+ Outro` buttons (localized in French/English) insert the matching bracket heading at the current text
selection, with necessary line breaks, then return focus/caret to the textarea
so writing can continue. They must not reset the remaining text, submit the form,
or create structured per-line fields. Preserve normal undo behavior and the
existing TanStack Form validation.

Adopt the mockup's clear free-writing placeholder and persistent description of
optional bracket headings. Important instructions must remain available after
the placeholder disappears. Retain existing optional details omitted by the
mockup and the established compact artwork behavior unless explicitly revised.

The user reaffirmed the mockup on 26 October: do not display the repeated
“L’essentiel du morceau” title or its introductory paragraph. Present the
Single/Album choice, identity fields and lyrics directly. Desktop uses a side
column for compact artwork, optional details and actions; mobile keeps these in
normal flow. Optional details must remain usable at the side column's width.

All song/album/Fan artwork pickers use a minimal outlined browse tile, not a
large nested Card with duplicate titles or a prominent native file input.
Keep constraints, accessible keyboard selection, pending/failure/retry/clear
behavior and compact previews; an outlined tile does not imply drag-and-drop.
Profile image controls follow the same presentation, with a true 96px circular
avatar rather than a Field-stretched capsule. Image preparation and upload
authorization are unchanged.

## Lot boundaries and acceptance

Lot 7 implements necessary mockups for public pages/discovery and the shared
navigation, plus visual adaptations to the existing Studio, authoring, account,
and contribution views. It does not create a separate design lot. Future
features follow the same references when their roadmap lot arrives.

Search behavior remains lot 8; likes/comments, notebooks, and sharing retain
their respective later lot boundaries. Do not add inactive decorative controls
for these features without an explicit approved availability treatment.

Verify real and missing artwork, empty/loading/error states, long names/titles,
both locales/themes, role-aware navigation, keyboard use, image fallback,
horizontal rows, and mobile form/keyboard behavior. Check source badges and
attribution on the unified list and ensure moderated/deleted content disappears
from entries and counts. PNG example names, counts, and gradient covers are not
production fixtures.
