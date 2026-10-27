# Lyr'X V1 functional specification

This document preserves the settled product decisions that future delivery lots
must implement. It is not a statement that these features already exist. Actual
delivery status and proof remain in [progress.md](progress.md).

## Product and identity

- Public name: **Lyr'X**. Technical name: `lyrx`.
- Initial audience: artists and listeners of the Malagasy music scene. Songs may
  use any language.
- The interface is available in French and English from V1, with French as the
  initial value and a remembered language choice. Lyrics stay in their original
  language; V1 does not translate them.
- The approved visual direction uses the latest user-installed TweakCN
  **Caffeine** palette as its semantic shadcn token baseline, superseding the
  earlier Soft Pop tokens while retaining coral `#DF4F55` as the Lyr'X
  brand mark. DM Sans is the interface and long-form editorial family;
  Newsreader is reserved for the landing display headline, and Space Mono is the
  monospace family. The landing hero presents public releases with overlaid
  context and actions, a sharp square cover and its matching active-only blurred
  backdrop. Missing artwork uses themed fallback colors and a music placeholder.
  All adaptations must preserve readable contrast.
- Light, dark, and system preferences are supported and remembered. Lyrics must
  remain comfortable to read.

## Accounts, authentication, and identities

- Better Auth provides email/password and Google sign-in, email verification,
  password reset, sign-out, and session management.
- Better Auth performs implicit account linking only through its verified,
  trusted-provider rules. Lyr’X does not add a manual Google-linking control for
  the normal same-email flow.
- Google is never presented as working without OAuth configuration. Missing
  provider credentials are shown as an explicit limitation.
- After first authentication, a member chooses **Artist** or **Fan**. An
  artist may publish immediately without prior admin verification.
- Keep these concepts separate: account role, credited artist identity, content
  contributor, and optional verified badge. The artist role grants neither
  ownership of another artist page nor a verified badge.
- Profiles include a unique handle, display name, avatar, and bio. Artist
  profiles add banner, presentation, songs, albums, optional Instagram,
  Facebook, TikTok, YouTube and Spotify links, plus labeled custom links.
- Reading and search are public. Publishing, community contributions, likes, comments, and
  saved passages require an account.
- Administrator is a distinct server-assigned role. Bootstrap the first admin
  without a hard-coded secret or public self-promotion path.
- Suspended users are rejected by server-side authorization, not only hidden UI.
- Any signed-in user may delete their own account through Better Auth from the
  profile settings, with an explicit irreversible confirmation. Better Auth
  requires a fresh session or a verified current password. The server derives
  the identity; no client-selected member can be deleted through this flow.
- Account deletion immediately withdraws the member's public profile and
  publications and blocks further writes, including from an unexpired JWT.
  Durable, bounded cleanup then deletes owned publications, legacy lyrics,
  album associations, profile records, upload intents and owned image claims.
  Files still referenced by another account are preserved. A minimal revoked
  auth-identity marker remains; content and email are not retained in it.
  Signing up again with the same email creates a new identity, not a restoration.
- Community contributions owned by a deleted member and their dependent reports
  and decisions are deleted as part of that cascade. Reports or decisions on
  other authors' content keep their private moderation outcome, revision and
  timestamps, but lose the deleted reporter/moderator reference. A deleted
  reporter's free-text reason is replaced with a neutral deletion marker.
  Deleting a reporter or moderator must never restore hidden/removed content.

## Songs, credits, and lyrics

A song can contain:

- title, artwork, primary and guest artists;
- optional album and album position, release date, description, and context;
- optional genre including an “other” value;
- writers, composers, producers, label, and listening links;
- lyrics entered as one multiline source text. A heading on its own line in
  brackets marks a section, for example `[Couplet 1]`, `[Refrain]` or `[Pont]`.

Unknown credits and metadata remain optional. A song may be a standalone single.
The raw lyric text is the canonical authoring source and must be retained without
loss. A parser may derive sections and display lines from it, but this is not an
array of editable line fields. Lyrics are required at creation, update, and
publication, including for historical drafts. Whitespace-only lyrics are rejected
without normalizing the stored source. The song form presents the single/album
context, title, primary artist, and lyrics first, followed by collapsed optional
sections for release/presentation, credits, and listening links. It has no live
read-only lyrics preview. Section headings are optional guidance, not required
formatting; the textarea offers a free-writing placeholder. Primary language is
not collected, stored, inherited or displayed.
The normal song page renders lyrics read-only;
lines have no click, annotation, reordering, or individual deletion action.

An artist can create a draft, preview, publish, edit, and unpublish content they
own. V1 has no artist co-editing.

Artwork can be selected while creating or editing a song or album. New drafts
upload their selected image after the owned resource is saved; an image failure
must retain that draft and form values so retrying does not create duplicates.
Artist preview pages also offer direct cover replacement through a labelled
pencil button, including when no cover exists. Public read-only pages do not
expose this control. Image optimization runs silently; only useful format/size
constraints and actionable errors are displayed.
Editor artwork thumbnails remain compact: 96 px on narrow screens and 160 px
from the desktop breakpoint. Generic Studio introductions are not repeated on
the creation/editing forms.

## Albums

- Album pages include title, artwork, release date, description, available
  artists/credits, and an ordered list linking to song pages.
- A song belongs to at most one album. Song creation starts with an explicit
  choice between a standalone single and an existing album; entering from an
  album preselects it.
- Album artwork, genre, label, and general credits may be inherited by
  a track. Each inherited field can be customized on the track. The track keeps
  its own release date; the album date remains contextual.
- An artist manages their albums and track order with drag-and-drop plus
  keyboard-accessible up/down controls. Existing standalone songs can be
  attached from a searchable selector, or created directly inside the album.
- Publishing an album requires at least one published track. The artist view
  shows each track status, while the public album page lists published tracks
  only.
- Deleting an album keeps its songs. Values currently inherited from the album
  are copied onto each affected song before the associations and album are
  removed.
- A fan contribution may reference an album but never directly modify a public
  album. Administration can correct associations while handling a report.

## Community fan lyrics

- A fan may publish a community lyric contribution directly, without waiting
  for administrator approval. The server requires the authenticated member to
  have the `fan` role, records that fan as the immutable author, and rejects a
  client-selected contributor identity.
- A community contribution is public after publication unless it is hidden or
  removed following a report. Reports create a moderation record; they do not
  turn ordinary publication into a pre-approval queue.
- A fan contribution cannot directly modify an artist-owned official song,
  album, artist profile, credits, or artwork. It is a separate community
  contribution, even when it references an existing artist or song.
- Before publication, search for obvious title/artist matches and warn. Never
  merge homonyms, versions, or potential duplicates automatically.
- A fan must be visibly credited as the contributor. A future feature may let
  the artist claim a contribution and replace it with an official version; that
  claim/replacement workflow is not part of this lot.
- The artist-owned Studio publishes official catalogue content directly. It does
  not depend on the fan contribution workflow or administrator pre-approval.

## Public discovery and search

- Public song lists combine artist-owned songs and Fan community contributions,
  with `Artiste`/`Communauté` origin badges and visible Fan contributor attribution
  on details. There is no separate public Community discovery page in the lot 7
  target. Fan publication/personal contributions and admin moderation remain
  accessible, with their existing ownership and visibility rules.
- The implemented lot 7 interface is the visual reference, retaining the current
  Caffeine colors. Removed local design references need not be restored. Lot 8
  activates the navbar search entry through an accessible search overlay and
  adds a bounded public musical-release slider on the home page, following
  [the lot 8 direction](lot8-direction.md). Other future interactions retain
  their roadmap lots.
- **New releases** sort by first public publication date descending. Ordinary
  edits do not make content new again.
- **Popular** uses a documented, recent activity window, principally deduplicated
  views and likes. Comments and share actions must not cheaply manipulate rank.
- Search covers published title, artist, album, genre, and supported words or
  phrases in lyrics. Lyrics results show song, artist, artwork, and a matching
  excerpt.
- The implemented UI must describe the real Convex search behavior, especially
  for Malagasy and multi-word text; do not promise exact phrase search unless it
  is actually supported.
- Lot 8 uses native relevance search with OR term matching and a prefix on the
  final term only. Exact phrases, arbitrary substrings, typo correction, accent
  folding and Malagasy stemming are not promised. It searches after a short typing
  pause or explicit submission and navigates bounded native cursor pages without a full-result count. Official
  album matches return albums; Fan album references remain reference metadata.
  See [the verified contract](lot8-verification.md) for limits and costs.
- Drafts, hidden or removed content, and private notebooks never enter public
  lists or search. Lists, search, and comments paginate or load incrementally.

## Song interactions

- Likes exist only on songs: one per account/song, idempotent add/remove, public
  count, and a member's liked-song list.
- Comments exist only under songs, are chronological and flat, and have no
  replies, mentions, or private messaging.
- Authors can delete their own comments cleanly. Members can report comments;
  administrators can intervene.
- V1 has no artist follows or release notifications.

## Private lyrics notebook

- A signed-in member selects a passage from a public song and saves the excerpt
  to a private notebook.
- Members create and name collections; every notebook starts with **My passages**.
  They can remove excerpts, manage collections, return to the source song, and
  create a sharing card while the source remains available.
- The notebook is never a public line-like system and is strictly private across
  accounts.
- Store the source song, a source revision or content fingerprint, the selected
  textual range, and enough snapshot context to explain what was saved. A source
  edit must not present the old excerpt as current text. If the source is
  withdrawn, retain only an unavailable entry as needed and stop redistributing
  its content.

## Signed sharing cards

- From a public song or still-available notebook excerpt, a member chooses a
  short passage and previews a vertical story-oriented image.
- The card shows the passage, title, artist, a visible Lyr'X signature, and
  artwork as a blurred/darkened background. Without artwork, use Corail studio.
- Web supports download; Expo uses native save/share capabilities.
- Layout limits are documented, previewed, and fail without clipped text. These
  limits are not a legal guarantee.
- Use application-managed artwork and an export-safe strategy; avoid tainted
  canvas from uncontrolled remote images.
- Withdrawn content cannot generate new cards. Already downloaded files cannot
  be recalled.

## External listening links

- Lyr'X uploads or hosts no audio or video.
- YouTube uses the official web embed when allowed; Spotify uses its official
  integration without promising full playback. MediaFire and other providers
  remain external link buttons.
- Always retain access to the source link when an embed is blocked or unavailable.
  Never autoplay. Load third-party players only on demand to limit data use.
- Expo opens the provider application or browser; V1 has no custom native player.
- Validate useful protocols and recognized provider URLs. Never render arbitrary
  member-supplied embed code.

## Administration and moderation

The V1 web dashboard supports:

- authorized inspection of reported community lyrics and other content;
- hiding or removing a reported community contribution with a reason;
- reports about songs, profiles, and comments;
- hiding or unpublishing content and suspending accounts;
- correcting metadata and artist/album associations;
- administrative verified-badge management, never self-assignment.

Record a minimal audit trail with the moderation decision and its author. Provide
initial community, privacy, rights, and contact/claim pages; these are launch
drafts to personalize, not certifications of legal compliance.

## Data, authorization, concurrency, and cost

- Separate accounts, profiles/artist identities, songs, albums, community
  contributions,
  likes, comments, notebooks, and moderation records.
- Every Convex function enforces ownership, contribution/notebook privacy,
  administration, suspension, and public visibility. A hidden button is not
  authorization.
- Likes, moderation actions, and derived counters remain coherent under
  duplicate clicks and concurrent requests.
- Validate image type, format, and size. Document text/operation limits and add
  reasonable spam protection.
- Hidden or removed community content must not be returned by public readers
  or duplicate-match queries. Reports and moderation reasons remain private.
- Prefer indexed, bounded, paginated queries. Do not rescan the full catalogue
  for each home-page render.

## Required verification by the relevant lots

Tests and real-path checks must cover:

- artist/fan/admin authorization, server-side admin assignment, suspension;
- direct artist publishing versus attributed public fan contributions;
- report/hide/remove without duplicate publication or private-data leakage;
- raw lyric-text round trips, parsing, and snapshot excerpts across lyric
  edits/removal;
- idempotent/concurrent likes;
- notebook isolation between accounts;
- albums and ordered tracks;
- published-lyrics search and hidden-content exclusion;
- flat comments, self-deletion, reports, and moderation;
- secure sign-in, verification, reset, sessions, and Better Auth’s automatic
  same-email linking rules;
- image export with/without artwork and withdrawal blocking;
- French/English plus light/dark/system preferences;
- unavailable external players with a working source-link fallback.

UI verification is owned by the implementing agent and is proportional to the
journey changed: relevant desktop/mobile widths, keyboard behavior, long text,
and loading, empty, error, or forbidden states are exercised where they can
actually occur. Loading skeletons cover dynamic regions while stable page chrome
remains visible; a page is not skeletonized wholesale without a reason. Each
backend lot runs typecheck/tests and a real Convex push when a deployment is
available. Expo web preview alone never proves Android behavior.

## External prerequisites

The project has a Convex cloud development deployment with Google OAuth and
Resend credentials stored in the Convex dashboard. It does not yet have
domain/hosting or EAS/Android signing. Commit examples without secrets and
document exact manual steps.
Continue work that does not need these values; report rather than fake any
integration blocked by them.

## V1 exclusions

No lyrics translation, artist subscriptions or release notifications, nested
comments or mentions, community annotations, artist co-editing, automated
artist-identity claims, hosted audio or video, music recognition, bulk
third-party lyrics import, private messaging, or production publishing without
explicit authorization.
