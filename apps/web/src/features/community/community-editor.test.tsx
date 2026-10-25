import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LocaleProvider } from "@/app/locale-provider"
import { CommunityAccess } from "./community-access"
import { CommunityEditor } from "./community-editor"

const state = vi.hoisted(() => ({
  account: undefined as
    undefined | { state: string; member?: { role: string; isAdmin: boolean } },
}))
vi.mock("convex/react", () => ({
  useQuery: (_query: unknown, args: unknown) =>
    args === "skip" ? undefined : state.account,
  useMutation: () => vi.fn(),
  useConvex: () => ({ query: vi.fn() }),
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  useNavigate: () => vi.fn(),
}))

const render = (children: ReactNode) =>
  renderToStaticMarkup(<LocaleProvider>{children}</LocaleProvider>)

describe("community authoring access and fields", () => {
  beforeEach(() => {
    state.account = { state: "ready", member: { role: "fan", isAdmin: false } }
  })

  it("shows a targeted loading state before the account is known", () => {
    state.account = undefined
    const html = render(<CommunityEditor />)
    expect(html).toContain('aria-label="Chargement…"')
    expect(html).not.toContain("<form")
  })

  it("does not render the Fan form for artist accounts", () => {
    state.account = {
      state: "ready",
      member: { role: "artist", isAdmin: false },
    }
    const html = render(<CommunityEditor />)
    expect(html).toContain("Compte Fan requis")
    expect(html).not.toContain("<form")
  })

  it("requires lyrics and identifies immediate community publication without accepting an author identity", () => {
    const html = render(<CommunityEditor />)
    const textarea = html.match(/<textarea[^>]*>/)?.[0]
    expect(textarea).toContain('name="lyricsText"')
    expect(textarea).toContain("required")
    expect(textarea).toContain("Vos paroles")
    expect(html).toContain("publique immédiatement")
    expect(html).toContain("Contribution communautaire")
    expect(html).not.toContain('name="authorMemberId"')
    expect(html).not.toContain('name="primaryLanguage"')
    expect(html).not.toContain("validation préalable")
  })

  it("does not expose report administration to an ordinary Fan", () => {
    const html = render(
      <CommunityAccess admin>
        <p>Private report data</p>
      </CommunityAccess>
    )
    expect(html).toContain("Accès administrateur requis")
    expect(html).not.toContain("Private report data")
  })
})
