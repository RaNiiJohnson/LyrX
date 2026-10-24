import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import imageCompression from "browser-image-compression"

import { prepareImageForUpload } from "./image-upload"

vi.mock("browser-image-compression", () => ({ default: vi.fn() }))
const compress = vi.mocked(imageCompression)
const original = () =>
  new File([new Uint8Array(4096)], "cover.JPEG", {
    type: "image/jpeg",
    lastModified: 123,
  })

beforeEach(() => {
  vi.stubGlobal("window", { location: { href: "https://lyrx.example/studio" } })
  compress.mockResolvedValue(
    new File([new Uint8Array(100)], "output", { type: "image/webp" })
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

describe("image upload preparation", () => {
  it.each([
    ["avatar", 512, 250 / 1024],
    ["banner", 1920, 750 / 1024],
    ["artwork", 1600, 750 / 1024],
  ] as const)(
    "uses the %s policy and a bundled worker",
    async (kind, dimension, size) => {
      const source = original()
      const result = await prepareImageForUpload(source, kind)
      expect(compress).toHaveBeenCalledWith(
        source,
        expect.objectContaining({
          maxSizeMB: size,
          maxWidthOrHeight: dimension,
          fileType: "image/webp",
          useWebWorker: true,
          preserveExif: false,
          initialQuality: 0.85,
        })
      )
      const options = compress.mock.calls[0]?.[1]
      expect(new URL(options?.libURL ?? "").origin).toBe("https://lyrx.example")
      expect(result).not.toBe(source)
      expect(result.name).toBe("cover.webp")
      expect(result.type).toBe("image/webp")
      expect(result.size).toBe(100)
      expect(result.lastModified).toBe(123)
      expect(source.size).toBe(4096)
      expect(source.type).toBe("image/jpeg")
    }
  )

  it.each(["image/png", "image/jpeg"])(
    "keeps actual output type %s when WebP is unsupported",
    async (type) => {
      compress.mockResolvedValue(new File(["encoded"], "output", { type }))
      const result = await prepareImageForUpload(original(), "artwork")
      expect(result.type).toBe(type)
      expect(result.name).toBe(type === "image/png" ? "cover.png" : "cover.jpg")
    }
  )

  it.each([
    ["application/pdf", 100, "artwork"],
    ["image/svg+xml", 100, "artwork"],
    ["image/jpeg", 0, "banner"],
    ["image/png", 5 * 1024 * 1024 + 1, "avatar"],
    ["image/webp", 10 * 1024 * 1024 + 1, "artwork"],
  ] as const)(
    "rejects invalid input (%s, %d bytes, %s) before encoding",
    async (type, size, kind) => {
      const file = new File([new Uint8Array(size)], "image", { type })
      await expect(prepareImageForUpload(file, kind)).rejects.toMatchObject({
        code: "INVALID_IMAGE",
      })
      expect(compress).not.toHaveBeenCalled()
    }
  )

  it("fails closed on decoding/worker/encoding errors", async () => {
    compress.mockRejectedValue(new Error("Broken image"))
    await expect(
      prepareImageForUpload(original(), "artwork")
    ).rejects.toMatchObject({ code: "IMAGE_OPTIMIZATION_FAILED" })
  })

  it.each([
    ["image/gif", 100],
    ["image/webp", 0],
    ["image/webp", 5 * 1024 * 1024 + 1],
  ])("rejects unusable encoder output (%s, %d bytes)", async (type, size) => {
    compress.mockResolvedValue(
      new File([new Uint8Array(size)], "output", { type })
    )
    await expect(
      prepareImageForUpload(original(), "avatar")
    ).rejects.toMatchObject({ code: "IMAGE_OPTIMIZATION_FAILED" })
  })
})
