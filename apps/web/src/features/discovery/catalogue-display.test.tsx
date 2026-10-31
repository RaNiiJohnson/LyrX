import type * as RouterModule from "@tanstack/react-router"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  formatMessage,
  type MessageKey,
  type SupportedLocale,
} from "@lyrx/shared"
import { CataloguePage, CataloguePagination } from "@/test/catalogue-screen"
import { PublicProfile, FoundationPage } from "@/test/route-screens"

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
// Feature tests stub reads; cache lifecycle is covered by backend-provider.test.tsx.
vi.mock("convex-helpers/react/cache", async () => {
  const convex = await import("convex/react")
  return convex
})
vi.mock("convex/react", () => ({
  useQuery: (_query: unknown, args: unknown) => {
    state.calls.push(args)
    return state.data
  },
}))
vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: (options: { queryKey: Array<unknown> }) => {
    if (String(options.queryKey[1]).includes("members:"))
      return { data: state.profile }
    state.calls.push(options.queryKey[2])
    return { data: state.data }
  },
}))
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof RouterModule>()),
  Link: ({
    children,
    to,
    "aria-current": current,
    className,
  }: {
    children: ReactNode
    to: string
    "aria-current"?: "page"
    className?: string
  }) => (
    <a href={to} aria-current={current} className={className}>
      {children}
    </a>
  ),
}))
vi.mock("@/app/locale-provider", () => ({
  useLocale: () => ({
    locale: state.locale,
    t: (key: MessageKey, values?: Record<string, string | number>) =>
      formatMessage(state.locale, key, values),
  }),
}))
const search = { page: 1, sort: "newest" as const }
describe("discovery public display states", () => {
  beforeEach(() => {
    state.data = { ready: false }
    state.profile = null
    state.locale = "fr"
    state.calls = []
  })
  it.each([
    ["fr", "songs"],
    ["en", "songs"],
    ["fr", "albums"],
    ["en", "albums"],
    ["fr", "artists"],
    ["en", "artists"],
  ] as const)(
    "does not show false empty/counts during %s %s backfill",
    (locale, kind) => {
      state.locale = locale
      state.data = { ready: false, items: [], total: 0, pageCount: 0, page: 1 }
      const html = renderToStaticMarkup(
        <CataloguePage kind={kind} search={search} onSearch={vi.fn()} />
      )
      expect(html).toContain('data-slot="skeleton"')
      expect(html).not.toContain(formatMessage(locale, "discovery.emptyTitle"))
      expect(html).not.toContain(
        formatMessage(locale, `discovery.${kind}Count`, { count: 0 })
      )
      expect(html).not.toContain('<p role="status"')
      expect(html).toContain(formatMessage(locale, `discovery.${kind}`))
    }
  )
  it("renders genuine empty state only after the projection is ready", () => {
    state.data = { ready: true, items: [], total: 0, pageCount: 0, page: 1 }
    const html = renderToStaticMarkup(
      <CataloguePage kind="songs" search={search} onSearch={vi.fn()} />
    )
    expect(html).toContain(formatMessage("fr", "discovery.emptyTitle"))
    expect(html).toContain("0 morceaux")
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
  it("shows loading without false releases while home discovery initializes", () => {
    state.data = { ready: false, songs: [], albums: [], artists: [] }
    const html = renderToStaticMarkup(<FoundationPage />)
    expect(html).toContain('data-slot="skeleton"')
    expect(html).not.toContain(formatMessage("fr", "discovery.emptyTitle"))
    expect(html).not.toContain(formatMessage("fr", "home.titleLead"))
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
    expect(html).toContain("3 morceaux")
    expect(html.indexOf("First fan song")).toBeLessThan(
      html.indexOf("Second artist song")
    )
    expect(html.indexOf("Second artist song")).toBeLessThan(
      html.indexOf("Third fan song")
    )
    expect(html.match(/data-slot="badge"/g)).toHaveLength(3)
  })
  it.each([
    ["fr", "songs"],
    ["en", "albums"],
    ["fr", "artists"],
  ] as const)(
    "places the real %s %s count above the local catalogue navigation",
    (locale, kind) => {
      state.locale = locale
      state.data = { ready: true, items: [], total: 42, pageCount: 1, page: 1 }
      const html = renderToStaticMarkup(
        <CataloguePage kind={kind} search={search} onSearch={vi.fn()} />
      )
      const count = formatMessage(locale, `discovery.${kind}Count`, {
        count: 42,
      })
      expect(html).toContain(count)
      expect(html).toContain("<header")
      expect(html.indexOf(count)).toBeLessThan(html.indexOf("</header>"))
      expect(html.match(/<h1\b/g)).toHaveLength(1)
      const nav = html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/)?.[0]
      expect(nav).toBeDefined()
      expect(html.indexOf("</header>")).toBeLessThan(html.indexOf("<nav"))
      expect(nav).toContain(
        `aria-label="${formatMessage(locale, "discovery.catalogue")}"`
      )
      expect(nav?.match(/<a\b/g)).toHaveLength(3)
      expect(nav?.match(/aria-current="page"/g)).toHaveLength(1)
      expect(nav).toContain(`href="/${kind}" aria-current="page"`)
      expect(nav).toContain("border-b-2")
      expect(nav).not.toContain("bg-primary")
      expect(nav).not.toContain("42")
      expect(html).not.toContain("<input")
      expect(html).toContain(
        `aria-label="${formatMessage(locale, "discovery.sort")}"`
      )
    }
  )
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

vi.mock("@/app/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => children,
}))
