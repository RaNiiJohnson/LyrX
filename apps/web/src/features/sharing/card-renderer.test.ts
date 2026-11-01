// @vitest-environment happy-dom
import { describe, expect, it, vi, afterEach } from "vitest"
import {
  CardRenderError,
  cardBlob,
  renderCard,
  wrapCardText,
} from "./card-renderer"
import { downloadPng, sameCard } from "./download-card"

const measure = (text: string) => Array.from(text).length * 10
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
describe("sharing card layout and export", () => {
  it("wraps words, preserves explicit lines and never splits a grapheme", () => {
    expect(wrapCardText("hello world\r\nnext", measure, 60)).toEqual([
      "hello",
      "world",
      "next",
    ])
    expect(wrapCardText("abcdefgh", measure, 30)).toEqual(["abc", "def", "gh"])
    expect(wrapCardText("aa áb", measure, 30).join("")).toContain("á")
    expect(wrapCardText("one\n\ntwo", measure, 100)).toEqual(["one", "", "two"])
    expect(() => wrapCardText("😀", () => 100, 50)).toThrow(CardRenderError)
  })
  it("refuses oversized excerpts before starting image or font work", async () => {
    await expect(
      renderCard({
        text: "x".repeat(361),
        title: "Title",
        primaryArtist: "Artist",
        artworkUrl: null,
      })
    ).rejects.toMatchObject({ code: "text" })
    await expect(
      renderCard({
        text: " ",
        title: "Title",
        primaryArtist: "Artist",
        artworkUrl: null,
      })
    ).rejects.toMatchObject({ code: "text" })
  })
  it("fails closed when the browser refuses PNG creation or the canvas is tainted", async () => {
    const canvas = document.createElement("canvas")
    vi.spyOn(canvas, "toBlob").mockImplementation((callback) => callback(null))
    await expect(cardBlob(canvas)).rejects.toMatchObject({ code: "render" })
    vi.spyOn(canvas, "toBlob").mockImplementation(() => {
      throw new DOMException("Tainted", "SecurityError")
    })
    await expect(cardBlob(canvas)).rejects.toMatchObject({ code: "render" })
  })
  it("compares version, selected text, attribution and artwork before export", () => {
    const card = {
      text: "Words",
      title: "Song",
      primaryArtist: "Artist",
      version: "v1",
      artworkId: null,
      artworkUrl: null,
    }
    expect(sameCard(null, card)).toBe(false)
    expect(sameCard({ ...card, version: "v2" }, card)).toBe(false)
    expect(sameCard({ ...card, title: "Changed title" }, card)).toBe(false)
    expect(sameCard({ ...card, text: "Changed words" }, card)).toBe(false)
    expect(sameCard(card, card)).toBe(true)
  })
  it("downloads a PNG with a safe filename and releases its temporary URL", () => {
    vi.useFakeTimers()
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-card")
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
    let filename = ""
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      filename = this.download
    })
    downloadPng(new Blob(["PNG"], { type: "image/png" }), "../../Song/Title")
    expect(filename).toBe("lyrx--Song-Title.png")
    vi.runAllTimers()
    expect(revoke).toHaveBeenCalledWith("blob:test-card")
    expect(document.querySelector("a[download]")).toBeNull()
  })
})
