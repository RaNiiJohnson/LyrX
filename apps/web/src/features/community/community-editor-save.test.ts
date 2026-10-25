import { describe, expect, it, vi } from "vitest"
import {
  saveCommunityContribution,
  type CommunitySaveState,
} from "./community-editor-save"

describe("community text and artwork save retries", () => {
  it("remembers public text before artwork failure and retries only the image", async () => {
    const state: CommunitySaveState<string> = {}
    const save = vi.fn().mockResolvedValue({ id: "contribution", revision: 1 })
    const upload = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined)
    await expect(
      saveCommunityContribution(state, "text", save, upload)
    ).rejects.toThrow("offline")
    expect(state).toEqual({
      id: "contribution",
      revision: 1,
      signature: "text",
    })
    await expect(
      saveCommunityContribution(state, "text", save, upload)
    ).resolves.toBe("contribution")
    expect(save).toHaveBeenCalledTimes(1)
    expect(upload).toHaveBeenCalledTimes(2)
    expect(state.revision).toBe(2)
  })

  it("uses the remembered incremented revision when text changes after image failure", async () => {
    const state = { id: "existing", revision: 7, signature: "old" }
    const save = vi.fn((_id, revision) =>
      Promise.resolve({ id: "existing", revision: revision + 1 })
    )
    const upload = vi
      .fn()
      .mockRejectedValueOnce(new Error("bad image"))
      .mockResolvedValueOnce(undefined)
    await expect(
      saveCommunityContribution(state, "edited", save, upload)
    ).rejects.toThrow()
    await saveCommunityContribution(state, "edited again", save, upload)
    expect(save.mock.calls).toEqual([
      ["existing", 7],
      ["existing", 8],
    ])
    expect(state.revision).toBe(10)
  })

  it("does not repeat an existing text update on image-only retry", async () => {
    const state = { id: "existing", revision: 2, signature: "old" }
    const save = vi.fn().mockResolvedValue({ id: "existing", revision: 3 })
    const fail = () => Promise.reject(new Error("upload failed"))
    await expect(
      saveCommunityContribution(state, "new text", save, fail)
    ).rejects.toThrow()
    await saveCommunityContribution(state, "new text", save, () =>
      Promise.resolve()
    )
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith("existing", 2)
    expect(state.revision).toBe(4)
  })

  it("can continue without the image without publishing text again", async () => {
    const state: CommunitySaveState<string> = {}
    const save = vi.fn().mockResolvedValue({ id: "created", revision: 1 })
    await expect(
      saveCommunityContribution(state, "text", save, () =>
        Promise.reject(new Error("upload"))
      )
    ).rejects.toThrow()
    await expect(saveCommunityContribution(state, "text", save)).resolves.toBe(
      "created"
    )
    expect(save).toHaveBeenCalledTimes(1)
  })

  it("does not upload or change the checkpoint when the text mutation fails", async () => {
    const state = { id: "existing", revision: 2, signature: "old" }
    const upload = vi.fn()
    await expect(
      saveCommunityContribution(
        state,
        "new",
        () => Promise.reject(new Error("revision conflict")),
        upload
      )
    ).rejects.toThrow("revision conflict")
    expect(state).toEqual({ id: "existing", revision: 2, signature: "old" })
    expect(upload).not.toHaveBeenCalled()
  })
})
