// @vitest-environment happy-dom

import { act, type ComponentProps, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LocaleProvider } from "./locale-provider"
import { PageShell } from "./page-shell"

type Account =
  | {
      state:
        "anonymous" | "email-unverified" | "onboarding-required" | "suspended"
    }
  | {
      state: "ready"
      member: { role: "artist" | "fan"; isAdmin: boolean }
      profile: { displayName: string }
    }

const mocks = vi.hoisted(() => ({
  account: undefined as Account | undefined,
  configured: true,
  query: vi.fn(),
  signOut: vi.fn<() => Promise<{ error: null | { code: string } }>>(),
  toast: vi.fn(),
}))
vi.mock("convex/react", () => ({
  useQuery: () => {
    mocks.query()
    return mocks.account
  },
}))
vi.mock("@/lib/runtime-config", () => ({
  getPublicRuntimeConfig: () =>
    mocks.configured ? { configured: true } : null,
}))
vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: mocks.signOut },
}))
vi.mock("@lyrx/ui/lib/toast", () => ({ toast: { error: mocks.toast } }))
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    activeOptions,
    activeProps,
    ...props
  }: ComponentProps<"a"> & {
    to: string
    activeOptions?: unknown
    activeProps?: unknown
  }) => {
    void activeOptions
    void activeProps
    return <a {...props} href={to} />
  },
}))
vi.mock("./locale-menu", () => ({ LocaleMenu: () => null }))
vi.mock("./theme-menu", () => ({ ThemeMenu: () => null }))

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement

async function flush(work: () => void) {
  await act(async () => {
    work()
    await Promise.resolve()
  })
}

async function render(
  children: ReactNode = <button>Final page action</button>
) {
  await flush(() =>
    root.render(
      <LocaleProvider>
        <PageShell footerBelowFold width="wide">
          {children}
        </PageShell>
      </LocaleProvider>
    )
  )
}

function ready(role: "artist" | "fan", isAdmin = false): Account {
  return {
    state: "ready",
    member: { role, isAdmin },
    profile: { displayName: "A long account display name" },
  }
}

function bottomNav() {
  const nav = document.querySelector<HTMLElement>(
    'nav[aria-label="Navigation mobile"], nav[aria-label="Mobile navigation"]'
  )
  if (!nav) throw new Error("Missing mobile navigation")
  return nav
}

function hrefs(container: ParentNode) {
  return Array.from(container.querySelectorAll("a")).map((a) =>
    a.getAttribute("href")
  )
}

async function openAccount() {
  const trigger = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Compte"], button[aria-label="Account"]'
  )
  if (!trigger) throw new Error("Missing account trigger")
  await flush(() =>
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    )
  )
  const menu = document.querySelector<HTMLElement>('[role="menu"]')
  if (!menu) throw new Error("Missing account menu")
  return { trigger, menu }
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  window.localStorage.clear()
  mocks.account = undefined
  mocks.configured = true
  mocks.query.mockClear()
  mocks.signOut.mockReset().mockResolvedValue({ error: null })
  mocks.toast.mockClear()
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await flush(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe("role-aware shared navigation", () => {
  it("keeps public reading available while only account-dependent slots load", async () => {
    await render()
    expect(document.querySelector("main")?.textContent).toBe(
      "Final page action"
    )
    expect(hrefs(bottomNav())).toEqual(["/", "/songs"])
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(2)
    expect(document.querySelector('a[href="/auth/sign-in"]')).toBeNull()
    expect(document.querySelector('a[href="/community"]')).toBeNull()

    mocks.account = ready("fan")
    await render()
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(0)
    expect(hrefs(bottomNav())).toEqual([
      "/",
      "/songs",
      "/community/mine",
      "/profile",
    ])
    expect(document.querySelector('a[href="/auth/sign-in"]')).toBeNull()
  })

  it("exposes the unified catalogue and anonymous auth actions without Fan tools", async () => {
    mocks.account = { state: "anonymous" }
    await render()
    expect(hrefs(bottomNav())).toEqual([
      "/",
      "/songs",
      "/artists",
      "/auth/sign-in",
    ])
    const { menu } = await openAccount()
    expect(hrefs(menu)).toEqual([
      "/auth/sign-in",
      "/auth/sign-up",
      "/songs",
      "/albums",
      "/artists",
    ])
    expect(document.querySelector('a[href="/community"]')).toBeNull()
  })

  it.each(["artist", "fan"] as const)(
    "keeps %s tools separate and accessible from the same account menu",
    async (role) => {
      mocks.account = ready(role)
      await render()
      const { menu } = await openAccount()
      const links = hrefs(menu)
      expect(links).toContain("/profile")
      expect(links).toContain("/songs")
      expect(links).not.toContain("/auth/sign-in")
      expect(links).not.toContain("/admin/community")
      if (role === "artist") {
        expect(links).toContain("/studio")
        expect(links).not.toContain("/community/new")
        expect(hrefs(bottomNav())).toContain("/studio")
      } else {
        expect(links).toContain("/community/mine")
        expect(links).toContain("/community/new")
        expect(links).not.toContain("/studio")
        expect(hrefs(bottomNav())).toContain("/community/mine")
      }
      expect(menu.textContent).toContain("Se déconnecter")
    }
  )

  it.each(["artist", "fan"] as const)(
    "retains moderation independently of the %s role",
    async (role) => {
      mocks.account = ready(role, true)
      await render()
      const { menu } = await openAccount()
      expect(hrefs(menu)).toContain("/admin/community")
    }
  )

  it.each([
    ["email-unverified", "/auth/verify-email"],
    ["onboarding-required", "/onboarding"],
    ["suspended", "/profile"],
  ] as const)(
    "routes the %s account to its real next step",
    async (state, href) => {
      mocks.account = { state }
      await render()
      expect(hrefs(bottomNav())).toEqual(["/", "/songs", "/artists", href])
      const { menu } = await openAccount()
      expect(hrefs(menu)).toContain(href)
      expect(hrefs(menu)).not.toContain("/studio")
      expect(hrefs(menu)).not.toContain("/community/new")
      expect(hrefs(menu)).not.toContain("/auth/sign-in")
    }
  )

  it("uses anonymous navigation without querying an unavailable backend", async () => {
    mocks.configured = false
    await render()
    expect(mocks.query).not.toHaveBeenCalled()
    expect(hrefs(bottomNav())).toContain("/auth/sign-in")
  })

  it("keeps desktop footer in flow and reserves mobile safe-area/action clearance", async () => {
    mocks.account = ready("artist")
    await render()
    const footer = document.querySelector("footer")
    const main = document.querySelector("main")
    expect(footer?.className).toContain("hidden")
    expect(footer?.className).toContain("lg:block")
    expect(footer?.className).not.toContain("fixed")
    expect(main?.className).toContain(
      "pb-[calc(6rem+env(safe-area-inset-bottom))]"
    )
    expect(main?.className).not.toContain("min-h-[calc")
    expect(main?.className).not.toContain("overflow-y")
    expect(bottomNav().className).toContain("fixed")
    expect(bottomNav().className).toContain("lg:hidden")
    expect(bottomNav().className).toContain("pb-[env(safe-area-inset-bottom)]")
    // Keep fixed navigation outside the backdrop-filter header containing block.
    expect(bottomNav().closest("header")).toBeNull()
    expect(document.querySelector("header nav")?.className).toContain("lg:flex")
    expect(hrefs(document.querySelector("header nav")!)).toEqual([
      "/",
      "/songs",
      "/albums",
      "/artists",
    ])
  })

  it("localizes the mobile navigation and account menu in English", async () => {
    window.localStorage.setItem("lyrx-locale", "en")
    mocks.account = ready("fan", true)
    await render()
    expect(bottomNav().textContent).toContain("Contributions")
    const { menu } = await openAccount()
    expect(menu.textContent).toContain("Publish lyrics")
    expect(menu.textContent).toContain("Sign out")
    expect(menu.textContent).not.toContain("Se déconnecter")
  })

  it("surfaces a real sign-out failure without replacing the ready account", async () => {
    mocks.account = ready("fan")
    mocks.signOut.mockResolvedValue({ error: { code: "UNKNOWN_ERROR" } })
    await render()
    const { menu } = await openAccount()
    const item = Array.from(
      menu.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((node) => node.textContent.includes("Se déconnecter"))
    if (!item) throw new Error("Missing sign-out action")
    await flush(() => item.click())
    expect(mocks.signOut).toHaveBeenCalledOnce()
    expect(mocks.toast).toHaveBeenCalledOnce()
    expect(hrefs(bottomNav())).toContain("/profile")
    expect(hrefs(bottomNav())).not.toContain("/auth/sign-in")
  })
})
