import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { LocaleProvider } from "./locale-provider"
import { PageShell } from "./page-shell"

const state = vi.hoisted(() => ({
  account: undefined as
    undefined | { state: string; member?: { role: string; isAdmin: boolean } },
}))
vi.mock("convex/react", () => ({ useQuery: () => state.account }))
vi.mock("@/lib/runtime-config", () => ({
  getPublicRuntimeConfig: () => ({ configured: true }),
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))
vi.mock("./locale-menu", () => ({ LocaleMenu: () => null }))
vi.mock("./theme-menu", () => ({ ThemeMenu: () => null }))

describe("community navigation breakpoint", () => {
  it.each(["loading", "anonymous", "fan", "admin"])(
    "keeps the %s navigation compact until the same large breakpoint",
    (account) => {
      state.account =
        account === "loading"
          ? undefined
          : account === "anonymous"
            ? { state: "anonymous" }
            : {
                state: "ready",
                member: { role: "fan", isAdmin: account === "admin" },
              }
      const html = renderToStaticMarkup(
        <LocaleProvider>
          <PageShell>Public content</PageShell>
        </LocaleProvider>
      )
      expect(html).toContain("lg:flex")
      expect(html).toContain("lg:hidden")
      expect(html).not.toMatch(/md:(?:flex|hidden)/)
      expect(html).toContain('href="/community"')
      expect(html).toContain("Public content")
      if (account === "fan" || account === "admin")
        expect(html).toContain('href="/community/mine"')
      if (account === "admin") expect(html).toContain('href="/admin/community"')
    }
  )
})
