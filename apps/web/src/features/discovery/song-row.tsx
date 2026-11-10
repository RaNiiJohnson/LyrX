import { useLocale } from "@/app/locale-provider"
import type { CatalogueSearch } from "./catalogue-search"
import { SongCard, SongCollection, type DiscoverySong } from "./discovery-cards"
import { DiscoveryEmpty } from "./discovery-states"
import { HorizontalRow } from "./horizontal-row"

/** Songs row: same scroller as albums and artists, or a plain list. */
export function SongRow({
  title,
  songs,
  popular = false,
  seeAllSearch,
  mode = "cards",
}: {
  title: string
  songs: Array<DiscoverySong>
  popular?: boolean
  /** Filter applied by "See all", e.g. one artist's songs. */
  seeAllSearch?: Partial<CatalogueSearch>
  /** "list" shows one song per line instead of the cover scroller. */
  mode?: "cards" | "list"
}) {
  const { t } = useLocale()
  return (
    <HorizontalRow
      title={title}
      href="/songs"
      description={popular ? t("discovery.popularDescription") : undefined}
      empty={songs.length === 0}
      layout={mode === "list" ? "list" : "row"}
      seeAllSearch={
        seeAllSearch ?? (popular ? { sort: "popular", page: 1 } : undefined)
      }
    >
      {songs.length === 0 ? (
        <DiscoveryEmpty />
      ) : mode === "list" ? (
        <SongCollection mode="list" songs={songs} />
      ) : (
        songs.map((song) => (
          <SongCard
            key={`${song.origin}:${song.id}`}
            song={song}
            presentation="cover"
          />
        ))
      )}
    </HorizontalRow>
  )
}
