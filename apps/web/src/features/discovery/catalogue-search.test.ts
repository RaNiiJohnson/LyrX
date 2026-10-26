import { describe, expect, it } from "vitest"
import {
  catalogueSearch,
  changeCatalogueFilter,
  visiblePages,
} from "./catalogue-search"

describe("catalogue URL state", () => {
  it("normalizes invalid pages, sort and filters", () => {
    expect(
      catalogueSearch({
        page: "-4",
        sort: "bad",
        genre: "bad",
        origin: "admin",
      })
    ).toEqual({
      page: 1,
      sort: "newest",
      genre: undefined,
      origin: undefined,
      artist: undefined,
    })
    for (const page of [
      Infinity,
      NaN,
      0,
      1.2,
      "not-a-page",
      Number.MAX_SAFE_INTEGER + 1,
    ])
      expect(catalogueSearch({ page }).page).toBe(1)
  })
  it("round trips shareable numbered filters", () => {
    expect(
      catalogueSearch(
        Object.fromEntries(
          new URLSearchParams(
            "page=3&sort=popular&genre=hip-hop&origin=community"
          )
        )
      )
    ).toEqual({
      page: 3,
      sort: "popular",
      genre: "hip-hop",
      origin: "community",
      artist: undefined,
    })
  })
  it("resets page on each changed filter and retains the other filters", () => {
    const search = catalogueSearch({
      page: 6,
      sort: "title",
      origin: "artist",
      genre: "jazz",
    })
    expect(changeCatalogueFilter(search, { genre: undefined })).toEqual({
      ...search,
      genre: undefined,
      page: 1,
    })
    expect(changeCatalogueFilter(search, { origin: "community" }).page).toBe(1)
    expect(changeCatalogueFilter(search, { sort: "newest" }).page).toBe(1)
  })
  it("keeps owner catalogue scope without treating credited artist text as ownership", () => {
    expect(catalogueSearch({ artist: "artist-handle" }).artist).toBe(
      "artist-handle"
    )
    expect(catalogueSearch({ artist: "a".repeat(101) }).artist).toBeUndefined()
  })
  it("bounds numbered controls even for large catalogues", () => {
    expect(visiblePages(500, 1000)).toEqual([1, 499, 500, 501, 1000])
    expect(visiblePages(1, 2)).toEqual([1, 2])
    expect(visiblePages(1, 0)).toEqual([])
  })
})
