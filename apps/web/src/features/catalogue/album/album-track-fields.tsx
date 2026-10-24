import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react"

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

type SortableTrackProps = {
  index: number
  isFirst: boolean
  isLast: boolean
  onMoveDown: () => void
  onMoveUp: () => void
  onRemove: () => void
  song: SongSummary
}

function SortableTrack({
  index,
  isFirst,
  isLast,
  onMoveDown,
  onMoveUp,
  onRemove,
  song,
}: SortableTrackProps) {
  const { t } = useLocale()
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: song._id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded-xl border bg-background p-3 data-[dragging=true]:z-10 data-[dragging=true]:shadow-lg"
      data-dragging={isDragging}
    >
      <Button
        ref={setActivatorNodeRef}
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
        aria-label={`${t("studio.albumTracks")}: ${song.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical />
      </Button>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted font-mono text-sm">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{song.title}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("catalogue.moveUp")}
        disabled={isFirst}
        onClick={onMoveUp}
      >
        <ArrowUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("catalogue.moveDown")}
        disabled={isLast}
        onClick={onMoveDown}
      >
        <ArrowDown />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("studio.removeTrack")}
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

export const AlbumTrackFields = withForm({
  ...albumFormOptions,
  props: {
    loadMore: (_count: number) => {},
    songs: [] as Array<SongSummary>,
    status: "Exhausted" as PaginationStatus,
  },
  render: function AlbumTrackFieldsView({ form, loadMore, songs, status }) {
    const { t } = useLocale()
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: { distance: 6 },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    )
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
              (song) =>
                song.albumId === null &&
                !tracksField.state.value.includes(song._id)
            )

            function handleDragEnd(event: DragEndEvent) {
              const { active, over } = event
              if (!over || active.id === over.id) return

              const oldIndex = tracksField.state.value.indexOf(
                active.id as SongSummary["_id"]
              )
              const newIndex = tracksField.state.value.indexOf(
                over.id as SongSummary["_id"]
              )
              if (oldIndex === -1 || newIndex === -1) return

              tracksField.moveValue(oldIndex, newIndex)
            }

            return (
              <div className="space-y-3">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedSongs.map((song) => song._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {selectedSongs.map((song, index) => (
                        <SortableTrack
                          key={song._id}
                          song={song}
                          index={index}
                          isFirst={index === 0}
                          isLast={index === selectedSongs.length - 1}
                          onMoveUp={() =>
                            tracksField.moveValue(index, index - 1)
                          }
                          onMoveDown={() =>
                            tracksField.moveValue(index, index + 1)
                          }
                          onRemove={() => tracksField.removeValue(index)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
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
