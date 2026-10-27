# Lyr'X product scope

Lyr'X is a lyrics and music-discovery platform launching around the Malagasy
music scene. Songs may be written in any language. The product name is **Lyr'X**
and the technical identifier is `lyrx`.

## V1 audiences and platforms

- Artists publish songs, raw multiline lyrics, albums, artwork, credits, and
  listening links.
- Fans discover public music, publish attributed community lyrics, interact with
  songs, and keep private lyric excerpts.
- Administrators moderate reports, accounts, metadata, and badges after a
  signalement; ordinary fan lyrics do not wait for pre-publication approval.
- The web product is delivered first. An Expo Android application follows on
  the same Convex backend and authorization rules.
- The interface is French-first with English available. Lyrics remain in their
  source language and are not translated in V1.

## Product invariants

- Public reading and search require no account. Publishing, contributing,
  liking, commenting, and saving excerpts do.
- A self-declared artist may publish immediately but gains no ownership of
  another artist identity and no verified badge.
- A fan community lyric is attributed to the authenticated fan who published
  it. The server verifies the member's `fan` role and derives the author from
  the authenticated session; a client cannot submit another member's identity.
  The contribution cannot silently become part of an artist-owned official
  catalogue.
- Public song discovery combines artist publications and Fan contributions in
  the same lists, distinguished by origin badges. Fan contributor attribution
  remains visible; shared discovery does not transfer ownership or permissions.
- Drafts, hidden or removed content, reports, and notebooks never appear in
  public queries or search. A reported community lyric remains public until a
  moderator hides or removes it.
- Lyrics are authored and retained as their original multiline text. Section
  headings in brackets are part of that source, not a set of separate form
  fields.
- Audio and video remain external. Lyr'X stores no audio or video files.

## V1 capabilities

The complete V1 includes account and profile management, artist publishing,
albums, community fan lyrics, public discovery and lyrics search, song likes, flat
comments, moderation, private excerpt collections, and signed vertical sharing
cards. The settled behavior and acceptance rules live in
[specification.md](specification.md); delivery order and lot boundaries live in
[roadmap.md](roadmap.md).

## Explicitly deferred

Lyrics translation, artist subscriptions and release notifications, nested
comments and mentions, community annotations, artist co-editing, automated
artist-identity claims or artist replacement of fan lyrics, hosted audio or video, music recognition, bulk
third-party lyrics imports, private messaging, and production publication are
outside V1.

## Visual direction

The approved direction uses the latest user-installed TweakCN **Caffeine**
preset as its semantic token baseline, adapted for a warm, musical, editorial
product. Lyr'X retains
coral `#DF4F55` as its brand mark, uses DM Sans for interface and long-form
editorial text, Newsreader for the landing display headline, and Space Mono for
code-like labels. Landing imagery favors real, tactile music photography over
decorative gradients. All token adaptations must preserve readable contrast and
comfortable long-form lyrics in light and dark modes.

The implemented interface after lot 7 is the design reference for future screens;
the current Caffeine theme and colors remain unchanged. The removed local
`design/` images and design-guidance document are no longer prerequisites. Public
song discovery remains unified across Artist/Fan publications. Lot 8 activates
search with a navbar overlay and adds a public musical-release slider on the home
page, following [the lot 8 direction](lot8-direction.md).
