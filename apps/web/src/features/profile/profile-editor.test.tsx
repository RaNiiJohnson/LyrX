// @vitest-environment happy-dom

import { getFunctionName } from "convex/server"
import { act, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LocaleProvider } from "@/app/locale-provider"
import { ProfileEditor } from "./profile-editor"

const mocks = vi.hoisted(() => ({
  artist: false,
  publicProfile: {
    avatarUrl: null as string | null,
    artist: { bannerUrl: "https://example.com/banner.webp" },
  },
  update: vi.fn(),
  otherMutation: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock("convex/react", () => ({
  useQuery: (reference: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(reference).endsWith("publicByHandle")
      ? mocks.publicProfile
      : {
          state: "ready",
          member: { role: mocks.artist ? "artist" : "fan", isAdmin: false },
          profile: {
            handle: "test-handle",
            displayName: "A member",
            bio: "An existing bio",
          },
          artistProfile: mocks.artist
            ? {
                presentation: "An existing presentation",
                instagramUrl: "https://www.instagram.com/test",
                customLinks: [],
              }
            : null,
        },
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(reference).endsWith("updateMyProfile")
      ? mocks.update
      : mocks.otherMutation,
}))
vi.mock("@/features/account/account-deletion", () => ({
  AccountDeletion: () => <section>Account deletion settings</section>,
}))
vi.mock("@lyrx/ui/lib/toast", () => ({
  toast: { success: mocks.success, error: mocks.error },
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    ...props
  }: ComponentProps<"a"> & { to: string; params?: { handle: string } }) => (
    <a {...props} href={to.replace("$handle", params?.handle ?? "")} />
  ),
}))

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement
async function flush(work: () => void) {
  await act(async () => {
    work()
    await Promise.resolve()
  })
}
async function render() {
  await flush(() =>
    root.render(
      <LocaleProvider>
        <ProfileEditor />
      </LocaleProvider>
    )
  )
}
function input(id: string) {
  const node = document.getElementById(id)
  if (!(node instanceof HTMLInputElement))
    throw new Error(`Missing input ${id}`)
  return node
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  window.localStorage.clear()
  mocks.artist = false
  mocks.update.mockReset().mockResolvedValue(null)
  mocks.otherMutation.mockReset()
  mocks.success.mockClear()
  mocks.error.mockClear()
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await flush(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe("profile form design adaptation", () => {
  it("groups Fan images and identity without exposing Artist fields or changing text limits", async () => {
    await render()
    expect(document.querySelector("h1")?.textContent).toBe("Mon profil")
    expect(
      Array.from(document.querySelectorAll("legend")).map(
        (node) => node.textContent
      )
    ).toEqual(["Images du profil", "Identité"])
    expect(input("avatar").accept).toBe("image/jpeg,image/png,image/webp")
    expect(document.getElementById("banner")).toBeNull()
    expect(document.getElementById("presentation")).toBeNull()
    expect(input("handle").required).toBe(true)
    expect(input("displayName").required).toBe(true)
    expect(document.querySelector<HTMLTextAreaElement>("#bio")?.maxLength).toBe(
      500
    )
    expect(
      document.querySelector('[data-slot="avatar-fallback"]')
    ).not.toBeNull()
    expect(document.body.textContent).toContain("Account deletion settings")
    expect(
      document.querySelector('a[href="/profiles/test-handle"]')
    ).not.toBeNull()
  })

  it("keeps every Artist field, optional upload and custom link in responsive groups", async () => {
    mocks.artist = true
    await render()
    const legends = Array.from(document.querySelectorAll("legend")).map(
      (node) => node.textContent
    )
    expect(legends).toContain("Identité artiste")
    expect(legends).toContain("Réseaux et liens d’écoute")
    expect(legends).toContain("Liens personnalisés")
    expect(input("banner").accept).toBe("image/jpeg,image/png,image/webp")
    expect(
      document.querySelector<HTMLTextAreaElement>("#presentation")?.maxLength
    ).toBe(2000)
    for (const name of [
      "instagram",
      "facebook",
      "tiktok",
      "youtube",
      "spotify",
    ])
      expect(input(name).type).toBe("url")
    expect(
      input("handle").closest('[data-slot="field-group"]')?.className
    ).toContain("sm:grid-cols-2")
    const banner = document.querySelector<HTMLImageElement>(
      'img[alt="Bannière"]'
    )
    expect(banner?.getAttribute("src")).toBe("https://example.com/banner.webp")
    await flush(() => banner?.dispatchEvent(new Event("error")))
    expect(document.querySelector('img[alt="Bannière"]')).toBeNull()
    const add = Array.from(document.querySelectorAll("button")).find(
      (node) => node.textContent === "Ajouter un lien"
    )
    if (!add) throw new Error("Missing add-link action")
    await flush(() => add.click())
    expect(
      document.querySelector('input[name="customLinks[0].label"]')
    ).not.toBeNull()
    expect(
      document.querySelector('input[name="customLinks[0].url"]')
    ).not.toBeNull()
    expect(mocks.otherMutation).not.toHaveBeenCalled()
  })

  it.each([false, true])(
    "preserves the %s Artist payload through the same form submit",
    async (artist) => {
      mocks.artist = artist
      await render()
      await flush(() =>
        document
          .querySelector("form")
          ?.dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true })
          )
      )
      expect(mocks.update).toHaveBeenCalledWith({
        handle: "test-handle",
        displayName: "A member",
        bio: "An existing bio",
        artist: artist
          ? {
              presentation: "An existing presentation",
              instagramUrl: "https://www.instagram.com/test",
              facebookUrl: undefined,
              tiktokUrl: undefined,
              youtubeUrl: undefined,
              spotifyUrl: undefined,
              customLinks: [],
            }
          : undefined,
      })
      expect(mocks.success).toHaveBeenCalledOnce()
    }
  )

  it("keeps a real save error visible while preserving identity and deletion access", async () => {
    mocks.update.mockRejectedValue(new Error("Server unavailable"))
    await render()
    await flush(() =>
      document
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        )
    )
    expect(document.querySelector('[role="alert"]')).not.toBeNull()
    expect(input("handle").value).toBe("test-handle")
    expect(document.body.textContent).toContain("Account deletion settings")
    expect(mocks.error).toHaveBeenCalledOnce()
    expect(mocks.success).not.toHaveBeenCalled()
  })
})
