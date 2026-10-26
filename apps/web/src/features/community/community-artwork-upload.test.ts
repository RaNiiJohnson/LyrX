import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { prepareImageForUpload } from "@/lib/image-upload"
import { uploadCommunityArtwork } from "./community-artwork-upload"
import type { CommunityArtworkAttempt } from "./community-artwork-upload"

vi.mock("@/lib/image-upload", () => ({ prepareImageForUpload: vi.fn() }))
const contributionId = "contribution" as Id<"communityContributions">
const intentId = "intent" as Id<"communityArtworkUploadIntents">
const source = new File(["original"], "cover.jpg", { type: "image/jpeg" })
const optimized = new File(["optimized"], "cover.webp", { type: "image/webp" })

describe("community owner-bound optimized artwork upload", () => {
  afterEach(() => vi.unstubAllGlobals())
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(prepareImageForUpload).mockResolvedValue(optimized)
  })

  it("prepares the image before the intent and atomically saves only the optimized storage id", async () => {
    const generate = vi
      .fn()
      .mockResolvedValue({ intentId, uploadUrl: "https://upload.test" })
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ storageId: "storage" }),
    })
    vi.stubGlobal("fetch", fetch)
    const save = vi.fn().mockResolvedValue(null)
    await uploadCommunityArtwork(source, contributionId, generate, save)
    expect(prepareImageForUpload).toHaveBeenCalledWith(source, "artwork")
    expect(
      vi.mocked(prepareImageForUpload).mock.invocationCallOrder[0]
    ).toBeLessThan(generate.mock.invocationCallOrder[0]!)
    expect(generate).toHaveBeenCalledWith({ contributionId })
    expect(fetch).toHaveBeenCalledWith("https://upload.test", {
      method: "POST",
      headers: { "Content-Type": "image/webp" },
      body: optimized,
    })
    expect(save).toHaveBeenCalledWith({
      contributionId,
      intentId,
      storageId: "storage",
    })
    vi.unstubAllGlobals()
  })

  it("does not request an intent after failed preparation", async () => {
    vi.mocked(prepareImageForUpload).mockRejectedValue(
      new Error("invalid image")
    )
    const generate = vi.fn(),
      save = vi.fn()
    await expect(
      uploadCommunityArtwork(source, contributionId, generate, save)
    ).rejects.toThrow("invalid image")
    expect(generate).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
  })

  it("retries the exact saved claim after a lost attachment response without uploading again", async () => {
    const generate = vi
      .fn()
      .mockResolvedValue({ intentId, uploadUrl: "https://upload.test" })
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ storageId: "storage" }),
    })
    vi.stubGlobal("fetch", fetch)
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("response lost"))
      .mockResolvedValueOnce(null)
    const attempt: CommunityArtworkAttempt = {}
    await expect(
      uploadCommunityArtwork(source, contributionId, generate, save, attempt)
    ).rejects.toThrow("response lost")
    expect(attempt.storageId).toBe("storage")
    await uploadCommunityArtwork(
      source,
      contributionId,
      generate,
      save,
      attempt
    )
    expect(save.mock.calls[0]).toEqual(save.mock.calls[1])
    expect(generate).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(prepareImageForUpload).toHaveBeenCalledTimes(1)
    expect(attempt.storageId).toBeUndefined()
  })

  it.each([
    { ok: false },
    { ok: true, json: () => Promise.resolve({ wrong: "shape" }) },
  ])("does not save malformed or unsuccessful uploads", async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response))
    const generate = vi
      .fn()
      .mockResolvedValue({ intentId, uploadUrl: "https://upload.test" })
    const save = vi.fn()
    await expect(
      uploadCommunityArtwork(source, contributionId, generate, save)
    ).rejects.toThrow()
    expect(save).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
