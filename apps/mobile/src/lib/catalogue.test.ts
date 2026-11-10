import { describe, expect, it } from "vitest"
import {
  activeFilterCount,
  appendPage,
  catalogueArgs,
  flattenPages,
  hasMorePages,
  sortFor,
} from "@/lib/catalogue"

describe("catalogueArgs", () => {
  it("keeps song filters on the songs tab", () => {
    expect(
      catalogueArgs(
        "songs",
        { sort: "popular", origin: "community", genre: "pop" },
        2
      )
    ).toEqual({
      page: 2,
      pageSize: 24,
      sort: "popular",
      origin: "community",
      genre: "pop",
      artistHandle: undefined,
    })
  })

  it("forces the artist origin and drops the genre when filtering by artist", () => {
    expect(
      catalogueArgs(
        "songs",
        { sort: "newest", origin: "community", genre: "rock" },
        1,
        "niavou"
      )
    ).toMatchObject({
      origin: "artist",
      genre: undefined,
      artistHandle: "niavou",
    })
  })

  it("never sends song-only filters or the popular sort to albums and artists", () => {
    const filters = {
      sort: "popular",
      origin: "artist",
      genre: "jazz",
    } as const
    expect(catalogueArgs("albums", filters, 1, "niavou")).toEqual({
      page: 1,
      pageSize: 24,
      sort: "newest",
      artistHandle: "niavou",
    })
    expect(catalogueArgs("artists", filters, 3)).toEqual({
      page: 3,
      pageSize: 24,
      sort: "newest",
    })
  })
})

describe("sortFor and activeFilterCount", () => {
  it("keeps popular only for songs", () => {
    expect(sortFor("songs", "popular")).toBe("popular")
    expect(sortFor("albums", "popular")).toBe("newest")
    expect(sortFor("artists", "title")).toBe("title")
  })

  it("counts origin and genre on songs only", () => {
    expect(
      activeFilterCount("songs", {
        sort: "newest",
        origin: "artist",
        genre: "pop",
      })
    ).toBe(2)
    expect(activeFilterCount("songs", { sort: "title" })).toBe(0)
    expect(activeFilterCount("albums", { sort: "newest", genre: "pop" })).toBe(
      0
    )
  })
})

describe("page accumulation", () => {
  const page = (n: number, pageCount: number, items: Array<string>) => ({
    page: n,
    pageCount,
    items,
  })

  it("starts over on page one and appends the next page", () => {
    const one = appendPage([], page(1, 3, ["a", "b"]))
    const two = appendPage(one, page(2, 3, ["c"]))
    expect(flattenPages(two)).toEqual(["a", "b", "c"])
    expect(hasMorePages(two)).toBe(true)
    expect(appendPage(two, page(1, 3, ["z"]))).toEqual([page(1, 3, ["z"])])
  })

  it("replaces a repeated last page instead of duplicating it", () => {
    const shown = appendPage(
      appendPage([], page(1, 2, ["a"])),
      page(2, 2, ["b"])
    )
    const retried = appendPage(shown, page(2, 2, ["b2"]))
    expect(flattenPages(retried)).toEqual(["a", "b2"])
    expect(hasMorePages(retried)).toBe(false)
  })

  it("restarts from a page that skips ahead", () => {
    const shown = appendPage([], page(1, 5, ["a"]))
    expect(flattenPages(appendPage(shown, page(4, 5, ["d"])))).toEqual(["d"])
  })

  it("reports no more pages for an empty catalogue", () => {
    expect(hasMorePages([])).toBe(false)
    expect(hasMorePages([page(1, 0, [])])).toBe(false)
  })
})
