import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"

import { Button } from "@lyrx/ui/components/button"
import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@lyrx/ui/components/field"

import { useLocale } from "@/app/locale-provider"
import { OptionalLabel } from "@/features/catalogue/shared/optional-label"
import { withForm } from "@/lib/app-form"
import { albumFormOptions } from "./album-form-options"
import type { SongSummary } from "./album-types"

type PaginationStatus = "CanLoadMore" | "LoadingMore" | "Exhausted"

export const AlbumTrackFields = withForm({
  ...albumFormOptions,
  props: {
    loadMore: (_count: number) => {},
    songs: [] as Array<SongSummary>,
    status: "Exhausted" as PaginationStatus,
  },
  render: function AlbumTrackFieldsView({ form, loadMore, songs, status }) {
    const { t } = useLocale()
    return (
      <FieldSet>
        <div className="flex items-center gap-3">
          <FieldLegend>{t("studio.albumTracks")}</FieldLegend>
          <OptionalLabel />
        </div>
        <FieldDescription>
          {t("studio.albumTracksDescription")}
        </FieldDescription>
        <form.Field name="trackIds" mode="array">
          {(tracksField) => {
            const selectedSongs = tracksField.state.value.flatMap((id) => {
              const song = songs.find((candidate) => candidate._id === id)
              return song ? [song] : []
            })
            const availableSongs = songs.filter(
              (song) => !tracksField.state.value.includes(song._id)
            )
            return (
              <div className="space-y-3">
                {selectedSongs.map((song, index) => (
                  <div
                    key={song._id}
                    className="flex items-center gap-2 rounded-xl border p-3"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted font-mono text-sm">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {song.title}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("catalogue.moveUp")}
                      disabled={index === 0}
                      onClick={() => tracksField.moveValue(index, index - 1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("catalogue.moveDown")}
                      disabled={index === selectedSongs.length - 1}
                      onClick={() => tracksField.moveValue(index, index + 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("studio.removeTrack")}
                      onClick={() => tracksField.removeValue(index)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                {availableSongs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("studio.noAvailableTracks")}
                  </p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {availableSongs.map((song) => (
                      <Button
                        key={song._id}
                        type="button"
                        variant="outline"
                        className="min-w-0 justify-start"
                        title={song.title}
                        onClick={() => tracksField.pushValue(song._id)}
                      >
                        <Plus />
                        <span className="min-w-0 truncate">{song.title}</span>
                      </Button>
                    ))}
                  </div>
                )}
                {status !== "Exhausted" ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={status === "LoadingMore"}
                    onClick={() => loadMore(50)}
                  >
                    {status === "LoadingMore"
                      ? t("common.loading")
                      : t("common.loadMore")}
                  </Button>
                ) : null}
              </div>
            )
          }}
        </form.Field>
      </FieldSet>
    )
  },
})
