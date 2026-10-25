import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { formatMessage } from "@lyrx/shared"
import type { MessageKey, SupportedLocale } from "@lyrx/shared"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { CommunityList, MyContributions } from "./community-list"
import { CommunityModeration } from "./community-moderation"
import { CommunityReader } from "./community-reader"

type DisplayState = {
  locale: SupportedLocale
  account:
    undefined | { state: string; member?: { role: string; isAdmin: boolean } }
  reports: Array<{ _id: string; createdAt: number; reason: string }>
}

const state = vi.hoisted<DisplayState>(() => ({
  locale: "fr",
  account: undefined,
  reports: [],
}))

vi.mock("@/app/locale-provider", () => ({
  useLocale: () => ({
    locale: state.locale,
    t: (key: MessageKey) => formatMessage(state.locale, key),
  }),
}))
vi.mock("convex/react", () => ({
  useQuery: () => state.account,
  useMutation: () => vi.fn(),
  usePaginatedQuery: () => ({
    status: "Exhausted",
    results: state.reports,
    loadMore: vi.fn(),
  }),
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))
vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: () => ({
    data: {
      title: "Shared lyric",
      primaryArtist: "Credited artist",
      lyricsText: "A lyric line",
      contributor: { handle: "contributor", displayName: "Credited Fan" },
    },
  }),
}))
vi.mock("@/features/catalogue/song/song-read-only", () => ({
  SongReadOnly: () => <article>Shared lyric content</article>,
}))

const contributionId = "contribution" as Id<"communityContributions">

describe("community display states", () => {
  beforeEach(() => {
    state.locale = "fr"
    state.account = {
      state: "ready",
      member: { role: "fan", isAdmin: false },
    }
    state.reports = []
    vi.restoreAllMocks()
  })

  it.each(["fr", "en"] as const)(
    "keeps private reports out of the %s public empty-list explanation",
    (locale) => {
      state.locale = locale
      const html = renderToStaticMarkup(<CommunityList />)
      expect(html).toContain(
        formatMessage(locale, "community.emptyDescription")
      )
      expect(html).not.toContain(
        formatMessage(locale, "community.emptyReportsDescription")
      )
      expect(html.toLowerCase()).not.toMatch(/signalement|report/)
    }
  )

  it.each(["fr", "en"] as const)(
    "uses an author-specific %s empty state for My contributions",
    (locale) => {
      state.locale = locale
      const html = renderToStaticMarkup(<MyContributions />)
      expect(html).toContain(
        formatMessage(locale, "community.emptyMineDescription")
      )
      expect(html).not.toContain(
        formatMessage(locale, "community.emptyReportsDescription")
      )
    }
  )

  it("uses a report-specific empty state only in the authorized moderation view", () => {
    state.account = {
      state: "ready",
      member: { role: "fan", isAdmin: true },
    }
    const html = renderToStaticMarkup(<CommunityModeration />)
    expect(html).toContain(
      formatMessage("fr", "community.emptyReportsDescription")
    )
    expect(html).not.toContain(
      formatMessage("fr", "community.emptyDescription")
    )
  })

  it.each(["fr", "en"] as const)(
    "formats report dates with the selected %s locale and a stable UTC day",
    (locale) => {
      state.locale = locale
      state.account = {
        state: "ready",
        member: { role: "fan", isAdmin: true },
      }
      const createdAt = Date.UTC(2026, 0, 2, 0, 15)
      state.reports = [{ _id: "report", createdAt, reason: "Report reason" }]
      const expectedDate = new Date(createdAt).toLocaleDateString(locale, {
        timeZone: "UTC",
      })
      const format = vi.spyOn(Date.prototype, "toLocaleDateString")
      const html = renderToStaticMarkup(<CommunityModeration />)
      expect(html).toContain(expectedDate)
      expect(format).toHaveBeenCalledWith(locale, { timeZone: "UTC" })
    }
  )

  it("does not flash a sign-in prompt while the report account query is loading", () => {
    state.account = undefined
    const html = renderToStaticMarkup(
      <CommunityReader contributionId={contributionId} />
    )
    expect(html).toContain("Shared lyric content")
    expect(html).toContain("Credited Fan")
    expect(html).toContain('aria-label="Chargement du compte"')
    expect(html).toContain('data-slot="skeleton"')
    expect(html).not.toContain(formatMessage("fr", "community.signInToReport"))
    expect(html).not.toContain("<form")
  })

  it("shows the sign-in action when the report account query is anonymous", () => {
    state.account = { state: "anonymous" }
    const html = renderToStaticMarkup(
      <CommunityReader contributionId={contributionId} />
    )
    expect(html).toContain(formatMessage("fr", "community.signInToReport"))
    expect(html).not.toContain('aria-label="Chargement du compte"')
    expect(html).not.toContain("<form")
  })

  it("shows the report form for a ready member without replacing the public lyric", () => {
    const html = renderToStaticMarkup(
      <CommunityReader contributionId={contributionId} />
    )
    expect(html).toContain("Shared lyric content")
    expect(html).toContain('id="reportReason"')
    expect(html).not.toContain(formatMessage("fr", "community.signInToReport"))
    expect(html).not.toContain('aria-label="Chargement du compte"')
  })
})
