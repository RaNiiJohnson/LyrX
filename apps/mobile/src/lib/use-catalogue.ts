import { useCallback, useEffect, useRef, useState } from "react"
import { useConvex } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import {
  appendPage,
  catalogueArgs,
  flattenPages,
  hasMorePages,
  type CatalogueFilters,
  type CatalogueKind,
} from "@/lib/catalogue"

export type CatalogueItem =
  | {
      kind: "song"
      key: string
      href: string
      artworkUrl: string | null
      title: string
      subtitle: string
      badge: string
    }
  | {
      kind: "album"
      key: string
      href: string
      artworkUrl: string | null
      title: string
      subtitle: string
      trackCount: number
    }
  | {
      kind: "artist"
      key: string
      href: string
      avatarUrl: string | null
      name: string
      handle: string
      songCount: number
    }

type Fetched = {
  ready: boolean
  total: number
  page: number
  pageCount: number
  items: Array<CatalogueItem>
}

async function fetchPage(
  convex: ReturnType<typeof useConvex>,
  kind: CatalogueKind,
  filters: CatalogueFilters,
  page: number,
  artistHandle: string | undefined
): Promise<Fetched> {
  const args = catalogueArgs(kind, filters, page, artistHandle)
  if (kind === "songs") {
    const result = await convex.query(api.discovery.read.listSongs, {
      ...args,
    })
    return {
      ...result,
      items: result.items.map((song) => ({
        kind: "song" as const,
        key: `${song.origin}-${song.id}`,
        href: song.href,
        artworkUrl: song.artworkUrl,
        title: song.title,
        subtitle: song.primaryArtist,
        badge: song.origin,
      })),
    }
  }
  if (kind === "albums") {
    const result = await convex.query(api.discovery.read.listAlbums, {
      ...args,
    })
    return {
      ...result,
      items: result.items.map((album) => ({
        kind: "album" as const,
        key: album.id,
        href: album.href,
        artworkUrl: album.artworkUrl,
        title: album.title,
        subtitle: album.artistName,
        trackCount: album.trackCount,
      })),
    }
  }
  const result = await convex.query(api.discovery.read.listArtists, {
    ...args,
  })
  return {
    ...result,
    items: result.items.map((artist) => ({
      kind: "artist" as const,
      key: artist.handle,
      href: artist.href,
      avatarUrl: artist.avatarUrl,
      name: artist.displayName,
      handle: artist.handle,
      songCount: artist.songCount,
    })),
  }
}

type FeedPage = {
  page: number
  pageCount: number
  items: ReadonlyArray<CatalogueItem>
}

type Status = "loading" | "ready" | "unavailable" | "error"

/**
 * Accumulating, page-based catalogue feed. The backend pages by number, so each page is
 * fetched once (not subscribed) and appended; refresh refetches page 1. A newer filter
 * set supersedes any request still in flight.
 */
export function useCatalogue(
  kind: CatalogueKind,
  filters: CatalogueFilters,
  artistHandle?: string
) {
  const convex = useConvex()
  const [pages, setPages] = useState<Array<FeedPage>>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<Status>("loading")
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreFailed, setMoreFailed] = useState(false)
  const generation = useRef(0)
  const busy = useRef(false)
  const pagesRef = useRef(pages)
  pagesRef.current = pages

  const { sort, origin, genre } = filters
  const signature = `${kind}|${sort}|${origin ?? ""}|${genre ?? ""}|${artistHandle ?? ""}`

  const reload = useCallback(async () => {
    const current = ++generation.current
    busy.current = false
    setLoadingMore(false)
    setMoreFailed(false)
    try {
      const result = await fetchPage(
        convex,
        kind,
        { sort, origin, genre },
        1,
        artistHandle
      )
      if (current !== generation.current) return
      if (!result.ready) {
        setPages([])
        setStatus("unavailable")
        return
      }
      setPages([result])
      setTotal(result.total)
      setStatus("ready")
    } catch {
      if (current !== generation.current) return
      setStatus((previous) => (previous === "ready" ? previous : "error"))
    }
  }, [convex, kind, sort, origin, genre, artistHandle])

  useEffect(() => {
    setPages([])
    setStatus("loading")
    void reload()
    // `signature` captures every input of `reload`; a change starts a fresh feed.
  }, [signature, reload])

  const loadMore = useCallback(async () => {
    const shown = pagesRef.current
    if (busy.current || !hasMorePages(shown)) return
    const last = shown.at(-1)
    if (!last) return
    busy.current = true
    const current = generation.current
    setLoadingMore(true)
    setMoreFailed(false)
    try {
      const result = await fetchPage(
        convex,
        kind,
        { sort, origin, genre },
        last.page + 1,
        artistHandle
      )
      if (current !== generation.current) return
      setPages((previous) => appendPage(previous, result))
    } catch {
      if (current === generation.current) setMoreFailed(true)
    } finally {
      if (current === generation.current) {
        busy.current = false
        setLoadingMore(false)
      }
    }
  }, [convex, kind, sort, origin, genre, artistHandle])

  return {
    items: flattenPages(pages),
    total,
    status,
    hasMore: hasMorePages(pages),
    loadingMore,
    moreFailed,
    loadMore,
    reload,
  }
}
