import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  formatMessage,
  type MessageKey,
  type SupportedLocale,
} from "@lyrx/shared"
import { CataloguePage, CataloguePagination } from "./catalogue-page"
import { PublicProfile } from "@/features/profile/public-profile"
import { FoundationPage } from "@/features/home/foundation-page"

type State = {
  data: unknown
  profile: unknown
  locale: SupportedLocale
  calls: Array<unknown>
}
const state = vi.hoisted<State>(() => ({
  data: undefined,
  profile: null,
  locale: "fr",
  calls: [],
}))
vi.mock("convex/react", () => ({
  useQuery: (_query: unknown, args: unknown) => {
    state.calls.push(args)
    return state.data
  },
}))
vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: () => ({ data: state.profile }),
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))
vi.mock("@/app/locale-provider", () => ({
  useLocale: () => ({
    locale: state.locale,
    t: (key: MessageKey, values?: Record<string, string | number>) =>
      formatMessage(state.locale, key, values),
  }),
}))
vi.mock("@/app/backend-required", () => ({
  BackendRequired: ({ children }: { children: ReactNode }) => children,
}))

const search = { page: 1, sort: "newest" as const }
describe("discovery public display states", () => {
  beforeEach(() => {
    state.data = undefined
    state.profile = null
    state.locale = "fr"
    state.calls = []
  })
  it.each(["fr", "en"] as const)(
    "does not show false empty/counts during %s backfill",
    (locale) => {
      state.locale = locale
      state.data = { ready: false, items: [], total: 0, pageCount: 0, page: 1 }
      const html = renderToStaticMarkup(
        <CataloguePage kind="songs" search={search} onSearch={vi.fn()} />
      )
      expect(html).toContain('data-slot="skeleton"')
      expect(html).not.toContain(formatMessage(locale, "discovery.emptyTitle"))
      expect(html).not.toContain("0 ·")
    }
  )
  it("renders genuine empty state only after the projection is ready", () => {
    state.data = { ready: true, items: [], total: 0, pageCount: 0, page: 1 }
    const html = renderToStaticMarkup(
      <CataloguePage kind="songs" search={search} onSearch={vi.fn()} />
    )
    expect(html).toContain(formatMessage("fr", "discovery.emptyTitle"))
    expect(html).toContain("0 · Morceaux")
    expect(html).not.toContain('data-slot="pagination"')
  })
  it("passes owner scope, unified ordering and URL page to the public API", () => {
    renderToStaticMarkup(
      <CataloguePage
        kind="songs"
        search={{
          page: 4,
          sort: "popular",
          artist: "the-artist",
          origin: "community",
          genre: "rock",
        }}
        onSearch={vi.fn()}
      />
    )
    expect(state.calls).toContainEqual({
      page: 4,
      sort: "popular",
      artistHandle: "the-artist",
      origin: "artist",
      genre: undefined,
    })
  })
  it("makes search visibly unavailable with no dead submitting form", () => {
    const html = renderToStaticMarkup(<FoundationPage />)
    expect(html).toContain(formatMessage("fr", "discovery.searchUnavailable"))
    expect(html).toContain('id="home-search"')
    expect(html).toContain("disabled")
    expect(html).not.toContain("<form")
    expect(html).toContain("bg-card p-3 text-card-foreground")
  })
  it("keeps the home hero available without false results during backfill", () => {
    state.data = { ready: false, songs: [], albums: [], artists: [] }
    const html = renderToStaticMarkup(<FoundationPage />)
    expect(html).toContain('id="home-search"')
    expect(html).toContain('data-slot="skeleton"')
    expect(html).not.toContain(formatMessage("fr", "discovery.emptyTitle"))
  })
  it("renders the server's unified order and total without regrouping origins", () => {
    state.data = {
      ready: true,
      total: 3,
      page: 1,
      pageCount: 1,
      items: [
        {
          id: "one",
          origin: "community",
          href: "/community/one",
          title: "First fan song",
          primaryArtist: "Credited",
          artworkUrl: null,
        },
        {
          id: "two",
          origin: "artist",
          href: "/songs/two",
          title: "Second artist song",
          primaryArtist: "Credited",
          artworkUrl: null,
        },
        {
          id: "three",
          origin: "community",
          href: "/community/three",
          title: "Third fan song",
          primaryArtist: "Credited",
          artworkUrl: null,
        },
      ],
    }
    const html = renderToStaticMarkup(
      <CataloguePage kind="songs" search={search} onSearch={vi.fn()} />
    )
    expect(html).toContain("3 · Morceaux")
    expect(html.indexOf("First fan song")).toBeLessThan(
      html.indexOf("Second artist song")
    )
    expect(html.indexOf("Second artist song")).toBeLessThan(
      html.indexOf("Third fan song")
    )
    expect(html.match(/data-slot="badge"/g)).toHaveLength(3)
  })
  it("retains stable artist identity while catalogue counts are unavailable", () => {
    state.profile = {
      role: "artist",
      handle: "author",
      displayName: "Artist identity",
      avatarUrl: null,
      bio: "Stable biography",
      artist: { bannerUrl: null },
    }
    state.data = {
      ready: false,
      songCount: 0,
      albumCount: 0,
      songs: [],
      albums: [],
    }
    const html = renderToStaticMarkup(<PublicProfile handle="author" />)
    expect(html).toContain("Artist identity")
    expect(html).toContain("Stable biography")
    expect(html).toContain('data-slot="skeleton"')
    expect(html).not.toContain('role="tablist"')
    expect(html).not.toContain(formatMessage("fr", "discovery.emptyTitle"))
  })
  it("renders localized bounded numbered controls and the current page", () => {
    const html = renderToStaticMarkup(
      <CataloguePagination page={50} pageCount={100} onPage={vi.fn()} />
    )
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('aria-label="Page 50"')
    expect(html).toContain('aria-label="Page précédente"')
    expect(html).not.toContain('aria-label="Page 2"')
  })
  it("preserves artist presentation and every supported social/custom link", () => {
    state.profile = {
      role: "artist",
      handle: "author",
      displayName: "The Artist",
      avatarUrl: null,
      bio: "Artist biography",
      artist: {
        bannerUrl: null,
        presentation: "Full presentation",
        instagramUrl: "https://instagram.com/artist",
        facebookUrl: "https://facebook.com/artist",
        tiktokUrl: "https://tiktok.com/@artist",
        youtubeUrl: "https://youtube.com/@artist",
        spotifyUrl: "https://open.spotify.com/artist/example",
        customLinks: [{ label: "My site", url: "https://example.com" }],
      },
    }
    state.data = {
      ready: true,
      songCount: 20,
      albumCount: 3,
      songs: [],
      albums: [],
    }
    const html = renderToStaticMarkup(<PublicProfile handle="author" />)
    for (const text of [
      "Artist biography",
      "Full presentation",
      "Instagram",
      "Facebook",
      "TikTok",
      "YouTube",
      "Spotify",
      "My site",
      "Morceaux",
      "Albums",
      "À propos",
    ])
      expect(html).toContain(text)
    expect(html).toContain('role="tablist"')
    expect(html).toContain("20")
    expect(html).toContain('href="/songs"')
  })
})
