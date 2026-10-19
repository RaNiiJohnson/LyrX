# Lyr'X product scope

Lyr'X is a lyrics and music-discovery platform launching around the Malagasy
music scene. Songs may be written in any language. The product name is **Lyr'X**
and the technical identifier is `lyrx`.

## V1 audiences and platforms

- Artists publish songs, structured lyrics, albums, artwork, credits, links,
  and explanations.
- Fans discover public music, contribute private proposals for moderation,
  interact with songs, request explanations, and keep private lyric excerpts.
- Administrators moderate proposals, reports, accounts, metadata, and badges.
- The web product is delivered first. An Expo Android application follows on
  the same Convex backend and authorization rules.
- The interface is French-first with English available. Lyrics remain in their
  source language and are not translated in V1.

## Product invariants

- Public reading and search require no account. Publishing, proposing, liking,
  commenting, saving excerpts, and supporting explanation requests do.
- A self-declared artist may publish immediately but gains no ownership of
  another artist identity and no verified badge.
- Fan proposals and their images remain private until an administrator accepts
  them. Acceptance credits the contributor without transferring artist identity.
- Drafts, rejected or hidden content, private proposals, and notebooks never
  appear in public queries or search.
- Stable section and line identifiers protect annotations, requests, and saved
  excerpts from silent reassignment when lyrics change.
- Audio and video remain external. Lyr'X stores no audio or video files.

## V1 capabilities

The complete V1 includes account and profile management, artist publishing,
albums, fan proposals, public discovery and lyrics search, artist explanations,
explanation requests, song likes, flat comments, moderation, private excerpt
collections, and signed vertical sharing cards. The settled behavior and
acceptance rules live in [specification.md](specification.md); delivery order and
lot boundaries live in [roadmap.md](roadmap.md).

## Explicitly deferred

Lyrics translation, artist subscriptions and release notifications, personalized
dedications, nested comments and mentions, likes on explanations, community
annotations, artist co-editing, automated artist-identity claims, hosted audio or
video, music recognition, bulk third-party lyrics imports, private messaging,
and production publication are outside V1.

## Visual direction

The approved direction is **Corail studio**: warm, musical, editorial, and
comfortable for long-form lyrics. Core references are coral `#DF4F55`, light
background `#FFF8F5`, night background `#161218`, and light selection
`#FFE8E7`. Complete accessible semantic tokens arrive in the dedicated visual
system lot rather than the foundation lot.
