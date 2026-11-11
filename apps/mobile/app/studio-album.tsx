import { useState } from "react"
import { Text, View } from "react-native"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { ArtworkField } from "@/components/artwork-field"
import { ConfirmSheet } from "@/components/confirm-sheet"
import { Button, TextField } from "@/components/form"
import { Chip, IconButton, Sheet } from "@/components/kit"
import { MemberGate } from "@/components/member-gate"
import { genreLabel } from "@/components/song-page"
import { Eyebrow, Loading, Message, Screen } from "@/components/ui"
import { GENRES } from "@/lib/contribution-form"
import { appErrorKey } from "@/lib/errors"
import { t } from "@/lib/i18n"
import {
  EMPTY_ALBUM,
  albumErrors,
  albumInput,
  albumValuesFromSaved,
  moveItem,
  type AlbumValues,
} from "@/lib/studio-form"
import { fonts, radius, space, useTheme } from "@/lib/theme"

type Track = { songId: Id<"songs">; title: string; status: string }

// Existing singles keep their own metadata when attached, as on the web.
const PRESERVE = {
  inheritArtwork: false,
  inheritGenre: false,
  inheritLabel: false,
  inheritCredits: false,
} as const

function AttachSheet({
  albumId,
  visible,
  onClose,
  onError,
}: {
  albumId: Id<"albums">
  visible: boolean
  onClose: () => void
  onError: (message: string) => void
}) {
  const theme = useTheme()
  const attach = useMutation(api.catalogue.albums.attachSongToAlbum)
  const [pending, setPending] = useState<string | null>(null)
  const songs = usePaginatedQuery(
    api.catalogue.read.listMySongs,
    visible ? {} : "skip",
    { initialNumItems: 50 }
  )
  const singles = songs.results.filter((song) => song.albumId === null)
  return (
    <Sheet visible={visible} onClose={onClose} title={t("studio.attachSong")}>
      {songs.status === "LoadingFirstPage" ? (
        <Text style={{ color: theme.mutedForeground }}>…</Text>
      ) : null}
      {songs.status !== "LoadingFirstPage" && singles.length === 0 ? (
        <Text style={{ color: theme.mutedForeground, fontFamily: fonts.sans }}>
          {t("studio.noAvailableTracks")}
        </Text>
      ) : null}
      {singles.map((song) => (
        <View
          key={song._id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                color: theme.foreground,
                fontFamily: fonts.sansSemibold,
              }}
            >
              {song.title}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: theme.mutedForeground, fontFamily: fonts.sans }}
            >
              {song.primaryArtist}
            </Text>
          </View>
          <Button
            variant="outline"
            label={t("studio.attach")}
            loading={pending === song._id}
            disabled={pending !== null}
            onPress={() => {
              setPending(song._id)
              attach({ albumId, songId: song._id, inheritance: PRESERVE })
                .then(onClose)
                .catch((caught: unknown) => onError(t(appErrorKey(caught))))
                .finally(() => setPending(null))
            }}
          />
        </View>
      ))}
      {songs.status === "CanLoadMore" ? (
        <Button
          variant="outline"
          label={t("studio.loadMoreSongs")}
          onPress={() => songs.loadMore(50)}
        />
      ) : null}
    </Sheet>
  )
}

function TrackList({
  albumId,
  tracks,
  onError,
  onNotice,
}: {
  albumId: Id<"albums">
  tracks: Array<Track>
  onError: (message: string | null) => void
  onNotice: (message: string | null) => void
}) {
  const theme = useTheme()
  const router = useRouter()
  const reorder = useMutation(api.catalogue.albums.reorderAlbumTracks)
  const detach = useMutation(api.catalogue.albums.detachSongFromAlbum)
  const [pending, setPending] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)

  const run = async (work: () => Promise<unknown>, notice?: string) => {
    setPending(true)
    onError(null)
    onNotice(null)
    try {
      await work()
      if (notice) onNotice(notice)
    } catch (caught) {
      onError(t(appErrorKey(caught)))
    } finally {
      setPending(false)
    }
  }

  return (
    <View style={{ gap: space.md }}>
      <Eyebrow>{t("studio.albumTracks")}</Eyebrow>
      {tracks.length === 0 ? (
        <Message
          title={t("studio.emptyAlbumTitle")}
          description={t("studio.emptyAlbumDescription")}
        />
      ) : (
        <Text style={{ color: theme.mutedForeground, fontFamily: fonts.sans }}>
          {t("studio.albumTracksDescription")}
        </Text>
      )}
      {tracks.map((track, index) => (
        <View
          key={track.songId}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.xs,
            paddingLeft: space.md,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
          }}
        >
          <Text
            accessibilityRole="link"
            numberOfLines={2}
            onPress={() =>
              router.push({
                pathname: "/studio-song",
                params: { id: track.songId },
              })
            }
            style={{
              flex: 1,
              color: theme.foreground,
              fontFamily: fonts.sansMedium,
            }}
          >
            {index + 1}. {track.title}
          </Text>
          <IconButton
            icon="arrow-up-outline"
            label={t("catalogue.moveUp")}
            disabled={pending || index === 0}
            onPress={() =>
              void run(
                () =>
                  reorder({
                    albumId,
                    songIds: moveItem(
                      tracks.map((item) => item.songId),
                      index,
                      -1
                    ),
                  }),
                t("studio.trackOrderSaved")
              )
            }
          />
          <IconButton
            icon="arrow-down-outline"
            label={t("catalogue.moveDown")}
            disabled={pending || index === tracks.length - 1}
            onPress={() =>
              void run(
                () =>
                  reorder({
                    albumId,
                    songIds: moveItem(
                      tracks.map((item) => item.songId),
                      index,
                      1
                    ),
                  }),
                t("studio.trackOrderSaved")
              )
            }
          />
          <IconButton
            icon="close-outline"
            label={t("studio.removeTrack")}
            disabled={pending}
            onPress={() =>
              void run(() => detach({ albumId, songId: track.songId }))
            }
          />
        </View>
      ))}
      <View style={{ gap: space.sm }}>
        <Button
          variant="outline"
          label={t("studio.attachExistingSong")}
          disabled={pending}
          onPress={() => setAttachOpen(true)}
        />
        <Button
          variant="outline"
          label={t("studio.createForAlbum")}
          onPress={() =>
            router.push({ pathname: "/studio-song", params: { albumId } })
          }
        />
      </View>
      <AttachSheet
        albumId={albumId}
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onError={(message) => onError(message)}
      />
    </View>
  )
}

type Saved = {
  id: Id<"albums">
  status: "draft" | "published"
  artworkUrl: string | null
  tracks: Array<Track>
}

function Editor({ initial, saved }: { initial: AlbumValues; saved?: Saved }) {
  const theme = useTheme()
  const router = useRouter()
  const create = useMutation(api.catalogue.albums.createAlbum)
  const update = useMutation(api.catalogue.albums.updateAlbum)
  const publish = useMutation(api.catalogue.albums.publishAlbum)
  const unpublish = useMutation(api.catalogue.albums.unpublishAlbum)
  const remove = useMutation(api.catalogue.albums.deleteAlbum)
  const [values, setValues] = useState(initial)
  const [showErrors, setShowErrors] = useState(false)
  const [pending, setPending] = useState<null | "save" | "toggle" | "delete">(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const errors = showErrors ? albumErrors(values) : {}
  const set = <TKey extends keyof AlbumValues>(
    key: TKey,
    value: AlbumValues[TKey]
  ) => setValues((current) => ({ ...current, [key]: value }))
  const required = (field: string) => t("studio.requiredField", { field })

  const save = async () => {
    setShowErrors(true)
    if (Object.keys(albumErrors(values)).length) return
    setPending("save")
    setError(null)
    setNotice(null)
    try {
      const input = albumInput(values)
      if (saved) {
        await update({
          albumId: saved.id,
          songIds: saved.tracks.map((track) => track.songId),
          ...input,
        })
        setNotice(t("catalogue.saved"))
      } else {
        const id = await create(input)
        router.replace({ pathname: "/studio-album", params: { id } })
      }
    } catch (caught) {
      setError(t(appErrorKey(caught)))
    } finally {
      setPending(null)
    }
  }

  const toggle = async () => {
    if (!saved) return
    setPending("toggle")
    setError(null)
    setNotice(null)
    try {
      if (saved.status === "published") {
        await unpublish({ albumId: saved.id })
        setNotice(t("catalogue.unpublishedNotice"))
      } else {
        await publish({ albumId: saved.id })
        setNotice(t("catalogue.publishedNotice"))
      }
    } catch (caught) {
      setError(t(appErrorKey(caught)))
    } finally {
      setPending(null)
    }
  }

  const destroy = async () => {
    if (!saved) return
    setPending("delete")
    try {
      await remove({ albumId: saved.id })
      setConfirmDelete(false)
      router.back()
    } catch (caught) {
      setConfirmDelete(false)
      setError(t(appErrorKey(caught)))
      setPending(null)
    }
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: saved ? t("studio.albumEditTitle") : t("studio.albumNewTitle"),
        }}
      />
      {saved ? (
        <Message
          title={
            saved.status === "published"
              ? t("studio.publishedBannerTitle")
              : t("studio.draftBannerTitle")
          }
          description={
            saved.status === "published"
              ? undefined
              : t("studio.draftBannerDescription")
          }
          action={
            saved.status === "published"
              ? {
                  label: t("studio.viewPublicPage"),
                  onPress: () => router.push(`/albums/${saved.id}`),
                }
              : undefined
          }
        />
      ) : null}
      <Eyebrow>{t("studio.albumDetails")}</Eyebrow>
      <TextField
        label={t("studio.songTitle")}
        value={values.title}
        onChangeText={(value) => set("title", value)}
        maxLength={160}
        autoCapitalize="sentences"
        error={errors.title ? required(t("studio.songTitle")) : null}
      />
      <TextField
        label={t("studio.albumDescription")}
        value={values.description}
        onChangeText={(value) => set("description", value)}
        multiline
        autoCapitalize="sentences"
        autoCorrect
      />
      <TextField
        label={t("studio.releaseDate")}
        value={values.releaseDate}
        onChangeText={(value) => set("releaseDate", value)}
        placeholder="2024-03-05"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        error={errors.releaseDate ? t("error.invalidInput") : null}
      />
      <View style={{ gap: space.sm }}>
        <Text
          style={{
            color: theme.foreground,
            fontFamily: fonts.sansMedium,
            fontSize: 14,
          }}
        >
          {t("studio.genre")}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {GENRES.map((genre) => (
            <Chip
              key={genre}
              label={
                genre === "other"
                  ? t("studio.genreOtherOption")
                  : (genreLabel(genre) ?? genre)
              }
              selected={values.genre === genre}
              onPress={() => set("genre", values.genre === genre ? "" : genre)}
            />
          ))}
        </View>
      </View>
      {values.genre === "other" ? (
        <TextField
          label={t("studio.genreOther")}
          value={values.otherGenre}
          onChangeText={(value) => set("otherGenre", value)}
          autoCapitalize="sentences"
          error={errors.otherGenre ? required(t("studio.genreOther")) : null}
        />
      ) : null}
      <TextField
        label={t("studio.label")}
        value={values.label}
        onChangeText={(value) => set("label", value)}
        autoCapitalize="words"
      />
      <TextField
        label={t("studio.albumCredits")}
        hint={t("studio.creditsDescription")}
        value={values.credits}
        onChangeText={(value) => set("credits", value)}
        multiline
        autoCapitalize="words"
        error={errors.credits ? t("error.invalidCatalogue") : null}
      />
      {saved ? (
        <>
          <ArtworkField
            resource={{ kind: "album", id: saved.id }}
            uri={saved.artworkUrl}
            label={values.title}
          />
          <TrackList
            albumId={saved.id}
            tracks={saved.tracks}
            onError={setError}
            onNotice={setNotice}
          />
        </>
      ) : (
        <Text style={{ color: theme.mutedForeground, fontFamily: fonts.sans }}>
          {t("catalogue.artworkAfterSave")}
        </Text>
      )}
      {error ? (
        <Message title={t("catalogue.saveError")} description={error} />
      ) : null}
      {notice ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: theme.brand, fontFamily: fonts.sansMedium }}
        >
          {notice}
        </Text>
      ) : null}
      <View style={{ gap: space.sm }}>
        <Button
          label={t("studio.saveDraft")}
          loading={pending === "save"}
          disabled={pending !== null}
          onPress={() => void save()}
        />
        {saved ? (
          <>
            <Button
              variant="outline"
              label={
                saved.status === "published"
                  ? t("catalogue.unpublish")
                  : t("catalogue.publish")
              }
              loading={pending === "toggle"}
              disabled={pending !== null}
              onPress={() => void toggle()}
            />
            <Button
              variant="destructive"
              label={t("common.remove")}
              disabled={pending !== null}
              onPress={() => setConfirmDelete(true)}
            />
          </>
        ) : null}
      </View>
      <ConfirmSheet
        visible={confirmDelete}
        title={t("studio.deleteAlbumTitle")}
        description={t("studio.deleteAlbumDescription")}
        confirmLabel={t("common.remove")}
        pending={pending === "delete"}
        onConfirm={() => void destroy()}
        onClose={() => setConfirmDelete(false)}
      />
    </Screen>
  )
}

function EditExisting({ id }: { id: Id<"albums"> }) {
  const detail = useQuery(api.catalogue.read.getMyAlbum, { albumId: id })
  if (detail === undefined)
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  return (
    <Editor
      key={id}
      initial={albumValuesFromSaved(detail.album)}
      saved={{
        id,
        status: detail.album.status,
        artworkUrl: detail.artworkUrl,
        tracks: detail.tracks.map(({ song }) => ({
          songId: song._id,
          title: song.title,
          status: song.status,
        })),
      }}
    />
  )
}

export default function StudioAlbumScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  return (
    <>
      <Stack.Screen options={{ title: t("studio.title") }} />
      <MemberGate role="artist" signInTitle={t("studio.title")}>
        {id ? (
          <EditExisting id={id as Id<"albums">} />
        ) : (
          <Editor initial={EMPTY_ALBUM} />
        )}
      </MemberGate>
    </>
  )
}
