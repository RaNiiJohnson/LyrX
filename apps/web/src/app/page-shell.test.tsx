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
  expect(trigger.getAttribute("data-size")).toBe("icon-lg")
  expect(trigger.className).toContain("size-9")
  await flush(() => trigger.click())
  const menu = document.querySelector<HTMLElement>('[role="dialog"]')
  if (!menu) throw new Error("Missing account sidebar")
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
  it.each([
    ["artist", "/studio", "Studio"],
    ["fan", "/community/mine", "Contributions"],
  ] as const)(
    "limits the %s header to Home and its own workspace",
    async (role, destination, label) => {
      mocks.account = ready(role)
      await render()
      const headerNav = document.querySelector("header nav")
      expect(hrefs(headerNav!)).toEqual(["/", destination])
      expect(headerNav?.textContent).toContain(label)
      expect(hrefs(headerNav!)).not.toContain("/songs")
      expect(hrefs(headerNav!)).not.toContain("/albums")
      expect(hrefs(headerNav!)).not.toContain("/artists")
    }
  )

  it.each([
    "anonymous",
    "email-unverified",
    "onboarding-required",
    "suspended",
  ] as const)(
    "keeps only Home in the %s header without a ready workspace",
    async (state) => {
      mocks.account = { state }
      await render()
      expect(hrefs(document.querySelector("header nav")!)).toEqual(["/"])
    }
  )

  it("keeps public reading available while only account-dependent slots load", async () => {
    await render()
    expect(document.querySelector("main")?.textContent).toBe(
      "Final page action"
    )
    expect(hrefs(bottomNav())).toEqual(["/", "/songs"])
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(2)
    expect(hrefs(document.querySelector("header nav")!)).toEqual(["/"])
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
      "/",
      "/songs",
      "/albums",
      "/artists",
      "/auth/sign-in",
      "/auth/sign-up",
    ])
    expect(document.querySelector('a[href="/community"]')).toBeNull()
  })

  it.each(["artist", "fan"] as const)(
    "keeps %s tools separate and accessible from the same account sidebar",
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
        expect(links).toContain("/studio/songs/new")
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
      "/studio",
    ])
  })

  it("localizes the mobile navigation and account sidebar in English", async () => {
    window.localStorage.setItem("lyrx-locale", "en")
    mocks.account = ready("fan", true)
    await render()
    expect(bottomNav().textContent).toContain("Contributions")
    const { menu } = await openAccount()
    expect(menu.textContent).toContain("Publish lyrics")
    expect(menu.textContent).toContain("Sign out")
    expect(menu.textContent).toContain("Explore")
    expect(menu.textContent).toContain("Fan space")
    expect(menu.querySelector('[aria-label="Close menu"]')).not.toBeNull()
    expect(menu.textContent).not.toContain("Se déconnecter")
  })

  it("reloads the document after successful logout so session caches cannot reach the next account", async () => {
    const assign = vi
      .spyOn(window.location, "assign")
      .mockImplementation(() => {})
    mocks.account = ready("fan")
    await render()
    const { menu } = await openAccount()
    const item = [...menu.querySelectorAll<HTMLButtonElement>("button")].find(
      (node) => node.textContent.includes("Se déconnecter")
    )!
    await flush(() => item.click())
    expect(mocks.signOut).toHaveBeenCalledOnce()
    expect(assign).toHaveBeenCalledExactlyOnceWith("/")
  })

  it("surfaces a real sign-out failure without replacing the ready account", async () => {
    mocks.account = ready("fan")
    mocks.signOut.mockResolvedValue({ error: { code: "UNKNOWN_ERROR" } })
    await render()
    const { menu } = await openAccount()
    const item = Array.from(
      menu.querySelectorAll<HTMLButtonElement>("button")
    ).find((node) => node.textContent.includes("Se déconnecter"))
    if (!item) throw new Error("Missing sign-out action")
    await flush(() => item.click())
    expect(mocks.signOut).toHaveBeenCalledOnce()
    expect(mocks.toast).toHaveBeenCalledOnce()
    expect(hrefs(bottomNav())).toContain("/profile")
    expect(hrefs(bottomNav())).not.toContain("/auth/sign-in")
  })

  it("groups discovery and account tools, highlights publication and separates sign-out", async () => {
    mocks.account = ready("fan", true)
    await render()
    const { menu } = await openAccount()
    expect(document.querySelector('[data-slot="sheet-overlay"]')).not.toBeNull()
    expect(host.getAttribute("aria-hidden")).toBe("true")
    expect(menu.textContent).toContain("A long account display name")
    const explore = menu.querySelector('nav[aria-label="Explorer"]')
    expect(explore?.className).toContain("gap-3")
    expect(hrefs(explore!)).toEqual(["/", "/songs", "/albums", "/artists"])
    const tools = menu.querySelector('nav[aria-label="Espace Fan"]')
    expect(hrefs(tools!)).toEqual(["/community/new", "/community/mine"])
    expect(
      tools
        ?.querySelector('a[href="/community/new"]')
        ?.getAttribute("data-variant")
    ).toBe("default")
    expect(
      menu.querySelector('[data-slot="sheet-footer"]')?.textContent
    ).toContain("Se déconnecter")
    expect(
      menu.querySelector('[data-slot="sheet-footer"]')?.className
    ).toContain("safe-area-inset-bottom")
    expect(document.querySelector('[role="menu"]')).toBeNull()
  })

  it("closes with Escape and restores focus to its account trigger", async () => {
    mocks.account = ready("fan")
    await render()
    const { trigger, menu } = await openAccount()
    expect(document.activeElement).toBe(
      menu.querySelector('[data-slot="sheet-title"]')
    )
    await flush(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      )
    )
    // Radix focus restoration runs after its close effect.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it("closes after choosing a real destination, including the current page", async () => {
    mocks.account = ready("fan")
    await render()
    const { menu } = await openAccount()
    const link = menu.querySelector<HTMLAnchorElement>('a[href="/profile"]')
    if (!link) throw new Error("Missing profile destination")
    await flush(() => link.click())
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(hrefs(bottomNav())).toContain("/profile")
  })

  it("keeps Tab navigation inside the open sidebar", async () => {
    mocks.account = ready("fan")
    await render()
    const { menu } = await openAccount()
    const first = menu.querySelector<HTMLAnchorElement>('a[href="/"]')
    const last = menu.querySelector<HTMLButtonElement>(
      '[aria-label="Fermer le menu"]'
    )
    if (!first || !last) throw new Error("Missing sidebar focus boundaries")
    last.focus()
    await flush(() =>
      last.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true })
      )
    )
    expect(document.activeElement).toBe(first)
    await flush(() =>
      first.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
        })
      )
    )
    expect(document.activeElement).toBe(last)
  })

  it("disables sign-out while pending without hiding a recoverable sidebar", async () => {
    let finish:
      ((result: { error: null | { code: string } }) => void) | undefined
    mocks.signOut.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    mocks.account = ready("fan")
    await render()
    const { menu } = await openAccount()
    const signOut = menu.querySelector<HTMLButtonElement>(
      '[data-slot="sheet-footer"] button'
    )
    if (!signOut) throw new Error("Missing sign-out action")
    await flush(() => signOut.click())
    expect(signOut.disabled).toBe(true)
    await flush(() => signOut.click())
    expect(mocks.signOut).toHaveBeenCalledOnce()
    await flush(() => finish?.({ error: { code: "UNKNOWN_ERROR" } }))
    expect(signOut.disabled).toBe(false)
    expect(document.querySelector('[role="dialog"]')).toBe(menu)
    expect(mocks.toast).toHaveBeenCalledOnce()
  })

  it("does not expose stale role tools if account state changes while open", async () => {
    mocks.account = ready("artist", true)
    await render()
    await openAccount()
    mocks.account = { state: "suspended" }
    await render()
    const menu = document.querySelector<HTMLElement>('[role="dialog"]')
    expect(menu).not.toBeNull()
    expect(hrefs(menu!)).toContain("/profile")
    expect(hrefs(menu!)).not.toContain("/studio")
    expect(hrefs(menu!)).not.toContain("/studio/songs/new")
    expect(hrefs(menu!)).not.toContain("/admin/community")
  })
})
