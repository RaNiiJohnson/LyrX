import { describe, expect, it, vi } from "vitest"

import { saveCatalogueDraft } from "./save-catalogue-draft"

describe("draft creation with artwork", () => {
  it("remembers the saved id before starting the owner-bound upload", async () => {
    const draft: { id: string | undefined } = { id: undefined }
    const save = vi.fn(() => Promise.resolve("new-song"))
    const upload = vi.fn((id: string) => {
      expect(draft.id).toBe(id)
      return Promise.resolve(true)
    })
    await expect(saveCatalogueDraft(draft, save, upload)).resolves.toEqual({
      id: "new-song",
      artworkSaved: true,
    })
    expect(save).toHaveBeenCalledWith(undefined)
    expect(upload).toHaveBeenCalledWith("new-song")
  })

  it("reuses the same draft after a failed upload instead of duplicating it", async () => {
    const draft: { id: string | undefined } = { id: undefined }
    const create = vi.fn(() => Promise.resolve("album"))
    const update = vi.fn((id: string) => Promise.resolve(id))
    const save = (id: string | undefined) => (id ? update(id) : create())
    expect(
      await saveCatalogueDraft(draft, save, () => Promise.resolve(false))
    ).toEqual({
      id: "album",
      artworkSaved: false,
    })
    expect(
      await saveCatalogueDraft(draft, save, () => Promise.resolve(true))
    ).toEqual({
      id: "album",
      artworkSaved: true,
    })
    expect(create).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith("album")
  })

  it("never starts an upload if saving the draft fails", async () => {
    const draft: { id: string | undefined } = { id: undefined }
    const upload = vi.fn(() => Promise.resolve(true))
    await expect(
      saveCatalogueDraft(
        draft,
        () => Promise.reject(new Error("Forbidden")),
        upload
      )
    ).rejects.toThrow("Forbidden")
    expect(upload).not.toHaveBeenCalled()
    expect(draft.id).toBeUndefined()
  })

  it("keeps the id if an unexpected upload exception occurs", async () => {
    const draft: { id: string | undefined } = { id: undefined }
    await expect(
      saveCatalogueDraft(
        draft,
        () => Promise.resolve("saved"),
        () => Promise.reject(new Error("Offline"))
      )
    ).rejects.toThrow("Offline")
    expect(draft.id).toBe("saved")
  })

  it("allows continuing without artwork, including after clearing a failed selection", async () => {
    const draft = { id: "saved" }
    const save = vi.fn(() => Promise.resolve("saved"))
    await expect(saveCatalogueDraft(draft, save)).resolves.toEqual({
      id: "saved",
      artworkSaved: true,
    })
    expect(save).toHaveBeenCalledWith("saved")
  })
})
