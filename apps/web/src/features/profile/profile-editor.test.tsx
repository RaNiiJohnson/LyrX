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
  generateUpload: vi.fn(),
  saveImage: vi.fn(),
  prepareImage: vi.fn(),
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
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(reference)
    if (name.endsWith("updateMyProfile")) return mocks.update
    if (name.endsWith("generateProfileImageUploadUrl"))
      return mocks.generateUpload
    if (name.endsWith("saveProfileImage")) return mocks.saveImage
    return mocks.otherMutation
  },
}))
vi.mock("@/lib/image-upload", () => ({
  prepareImageForUpload: mocks.prepareImage,
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
  mocks.publicProfile.avatarUrl = null
  mocks.publicProfile.artist.bannerUrl = "https://example.com/banner.webp"
  mocks.generateUpload.mockReset().mockResolvedValue({
    uploadIntentId: "intent-id",
    uploadUrl: "https://upload.test/image",
  })
  mocks.saveImage.mockReset().mockResolvedValue({ ok: true })
  mocks.prepareImage.mockReset()
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
    const avatar = document.querySelector('[data-slot="avatar"]')
    expect(avatar?.className).toContain("size-24")
    expect(avatar?.className).toContain("shrink-0")
    expect(avatar?.parentElement?.className).toContain("size-24")
    expect(avatar?.parentElement?.matches('[data-slot="field"]')).toBe(false)
    expect(input("avatar").hidden).toBe(true)
    expect(
      document.querySelector(
        'button[aria-labelledby="avatar-label avatar-action"]'
      )?.className
    ).toContain("border-dashed")
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
    mocks.publicProfile.artist.bannerUrl =
      "https://example.com/replacement.webp"
    await render()
    expect(
      document.querySelector('img[alt="Bannière"]')?.getAttribute("src")
    ).toBe("https://example.com/replacement.webp")
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

  it("prepares the same image again after failure and keeps the established immediate upload pipeline", async () => {
    const file = new File(["source"], "portrait.png", { type: "image/png" })
    const optimized = new File(["prepared"], "portrait.webp", {
      type: "image/webp",
    })
    mocks.prepareImage
      .mockRejectedValueOnce(new Error("Invalid source"))
      .mockResolvedValue(optimized)
    const post = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ storageId: "image-id" }),
    })
    vi.stubGlobal("fetch", post)
    await render()
    const picker = input("avatar")
    const transfer = new DataTransfer()
    transfer.items.add(file)
    Object.defineProperty(picker, "files", {
      configurable: true,
      value: transfer.files,
    })
    await flush(() =>
      picker.dispatchEvent(new Event("change", { bubbles: true }))
    )
    expect(mocks.prepareImage).toHaveBeenCalledWith(file, "avatar")
    expect(mocks.generateUpload).not.toHaveBeenCalled()
    expect(picker.value).toBe("")
    expect(document.querySelector('[role="alert"]')).not.toBeNull()
    await flush(() =>
      picker.dispatchEvent(new Event("change", { bubbles: true }))
    )
    expect(mocks.prepareImage).toHaveBeenCalledTimes(2)
    expect(mocks.generateUpload).toHaveBeenCalledWith({ kind: "avatar" })
    expect(post).toHaveBeenCalledWith("https://upload.test/image", {
      method: "POST",
      headers: { "Content-Type": "image/webp" },
      body: optimized,
    })
    expect(mocks.saveImage).toHaveBeenCalledWith({
      kind: "avatar",
      storageId: "image-id",
      uploadIntentId: "intent-id",
    })
    expect(mocks.update).not.toHaveBeenCalled()
    expect(input("handle").value).toBe("test-handle")
    expect(document.body.textContent).toContain("Account deletion settings")
  })

  it("disables every image chooser while preparation is pending without disabling identity fields", async () => {
    mocks.artist = true
    let resolve: (file: File) => void = () => {}
    const preparation = new Promise<File>((done) => {
      resolve = done
    })
    mocks.prepareImage.mockReturnValue(preparation)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ storageId: "image-id" }),
      })
    )
    await render()
    const file = new File(["source"], "cover.webp", { type: "image/webp" })
    const transfer = new DataTransfer()
    transfer.items.add(file)
    Object.defineProperty(input("banner"), "files", {
      configurable: true,
      value: transfer.files,
    })
    await flush(() =>
      input("banner").dispatchEvent(new Event("change", { bubbles: true }))
    )
    expect(input("avatar").disabled).toBe(true)
    expect(input("banner").disabled).toBe(true)
    for (const id of ["avatar", "banner"]) {
      expect(
        document.querySelector<HTMLButtonElement>(
          `button[aria-labelledby="${id}-label ${id}-action"]`
        )?.disabled
      ).toBe(true)
    }
    expect(input("handle").disabled).toBe(false)
    expect(document.querySelector('[role="status"]')?.textContent).toContain(
      "Préparation"
    )
    await flush(() => resolve(file))
    expect(mocks.saveImage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "banner" })
    )
    expect(input("avatar").disabled).toBe(false)
  })
})
