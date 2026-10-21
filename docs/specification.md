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
- The approved visual direction uses the TweakCN **Soft Pop** preset as its
  semantic shadcn token baseline while retaining coral `#DF4F55` as the Lyr'X
  brand mark. DM Sans is the interface and editorial family; Space Mono is the
  monospace family. The landing hero uses locally served editorial music
  photography instead of decorative gradients. All adaptations must preserve
  readable contrast.
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
- Reading and search are public. Publishing, proposals, likes, comments, saved
  passages, and explanation support require an account.
- Administrator is a distinct server-assigned role. Bootstrap the first admin
  without a hard-coded secret or public self-promotion path.
- Suspended users are rejected by server-side authorization, not only hidden UI.

## Songs, credits, and structured lyrics

A song can contain:

- title, artwork, primary and guest artists;
- optional album and album position, release date, description, and context;
- primary language, optional genre including an “other” value;
- writers, composers, producers, label, and listening links;
- lyrics organized into intro, verse, chorus, bridge, outro, and custom sections;
- artist explanations attached to one or more stable lyric lines.

Unknown credits and metadata remain optional. A song may be a standalone single.
Sections and lines use stable identifiers. Editing text must never silently move
an explanation, saved excerpt, or request onto a different passage.

An artist can create a draft, preview, publish, edit, and unpublish content they
own. V1 has no artist co-editing. Only the owning artist publishes explanations;
explanations are public and receive no separate likes or comments.

## Albums

- Album pages include title, artwork, release date, description, available
  artists/credits, and an ordered list linking to song pages.
- An artist manages their albums and track order.
- A fan proposal may name an album but never directly modify a public album.
  Administration can correct associations while reviewing the proposal.

## Fan proposals

- A fan may propose a complete song with credited artist, title, lyrics,
  fan-uploaded artwork, available metadata, and links.
- Proposals have `draft`, `pending`, `accepted`, or `rejected` status. Drafts and
  pending/rejected proposals, including private artwork, are visible only to the
  author and authorized administrators. Rejections display their reason.
- Acceptance publishes once, credits the contributor, and does not transfer the
  credited artist identity to that contributor.
- Before creation, search for obvious title/artist matches and warn. Never merge
  homonyms, versions, or potential duplicates automatically.
- A self-declared artist cannot claim a fan-created artist page by matching a
  name. Automated claims and co-editing are deferred; disputes go to admin.
- Artists and fans affirm at submission that they hold the necessary rights or
  authorization for lyrics and images.

## Public discovery and search

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
- Drafts, rejected or hidden content, and private proposals never enter public
  lists or search. Lists, search, and comments paginate or load incrementally.

## Song interactions

- Likes exist only on songs: one per account/song, idempotent add/remove, public
  count, and a member's liked-song list.
- Comments exist only under songs, are chronological and flat, and have no
  replies, mentions, or private messaging.
- Authors can delete their own comments cleanly. Members can report comments;
  administrators can intervene.
- V1 has no artist follows or release notifications.

## Explanation requests

- A signed-in listener selects an unexplained stable line range and chooses
  “I want to understand.” They can support or withdraw support.
- One account contributes at most once to the same stable selection; identical
  selections are consolidated rather than duplicated.
- The artist dashboard ranks the most requested passages. Publishing a public
  explanation marks the matching request explained.
- If targeted text is removed or materially changed, the request must not appear
  to concern new text without warning. V1 promises no notifications.

## Private lyrics notebook

- A signed-in member selects lines from a public song and saves the excerpt to a
  private notebook.
- Members create and name collections; every notebook starts with **My passages**.
  They can remove excerpts, manage collections, return to the source song, and
  create a sharing card while the source remains available.
- The notebook is never a public line-like system and is strictly private across
  accounts.
- Store a stable source reference and enough snapshot context to explain what
  was saved. A source edit must not present the old excerpt as current text. If
  the source is withdrawn, retain only an unavailable entry as needed and stop
  redistributing its content.

## Signed sharing cards

- From a public song or still-available notebook excerpt, a member chooses a
  short passage and previews a vertical story-oriented image.
- The card shows the passage, title, artist, a visible Lyr'X signature, and
  artwork as a blurred/darkened background. Without artwork, use Corail studio.
- Web supports download; Expo uses native save/share capabilities. V1 adds no
  dedication or personal message.
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

- pending proposal preview, single acceptance or rejection with a reason;
- authorized inspection of drafts/proposals;
- reports about songs, profiles, comments, and explanations;
- hiding or unpublishing content and suspending accounts;
- correcting metadata and artist/album associations;
- administrative verified-badge management, never self-assignment.

Record a minimal audit trail with the moderation decision and its author. Provide
initial community, privacy, rights, and contact/claim pages; these are launch
drafts to personalize, not certifications of legal compliance.

## Data, authorization, concurrency, and cost

- Separate accounts, profiles/artist identities, songs, albums, proposals,
  explanations, likes, comments, notebooks, requests, and moderation records.
- Every Convex function enforces ownership, proposal/notebook privacy,
  administration, suspension, and public visibility. A hidden button is not
  authorization.
- Likes, request support, proposal acceptance, and derived counters remain
  coherent under duplicate clicks and concurrent requests.
- Validate image type, format, and size. Document text/operation limits and add
  reasonable spam protection.
- Private proposal images must not be distributed through public URLs.
- Prefer indexed, bounded, paginated queries. Do not rescan the full catalogue
  for each home-page render.

## Required verification by the relevant lots

Tests and real-path checks must cover:

- artist/fan/admin authorization, server-side admin assignment, suspension;
- direct artist publishing versus private fan proposals;
- accept/reject without duplicate publication or private-data leakage;
- stable annotations, requests, and excerpts across lyrics edits/removal;
- idempotent/concurrent likes and explanation support;
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

No lyrics translation, artist subscriptions or release notifications, personal
dedications, nested comments or mentions, explanation likes, community
annotations, artist co-editing, automated artist-identity claims, hosted audio or
video, music recognition, bulk third-party lyrics import, private messaging, or
production publishing without explicit authorization.
