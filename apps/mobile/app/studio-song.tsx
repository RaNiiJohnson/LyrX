import { useState } from "react"
import { Text, View } from "react-native"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { useMutation, useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { MAX_LYRICS_TEXT_LENGTH } from "@lyrx/shared"
import { ArtworkField } from "@/components/artwork-field"
import { ConfirmSheet } from "@/components/confirm-sheet"
import { Button, TextField } from "@/components/form"
import { Chip, IconButton } from "@/components/kit"
import { MemberGate } from "@/components/member-gate"
import { genreLabel } from "@/components/song-page"
import { Eyebrow, Loading, Message, Screen } from "@/components/ui"
import { GENRES } from "@/lib/contribution-form"
import { appErrorKey } from "@/lib/errors"
import { t } from "@/lib/i18n"
import {
  EMPTY_SONG,
  LISTENING_PROVIDERS,
  MAX_LISTENING_LINKS,
  songErrors,
  songInput,
  songValuesFromSaved,
  type ListeningLink,
  type SongValues,
} from "@/lib/studio-form"
import { fonts, space, useTheme } from "@/lib/theme"

type Inheritance = {
  inheritArtwork: boolean
  inheritGenre: boolean
  inheritLabel: boolean
  inheritCredits: boolean
}

type Saved = {
  id: Id<"songs">
  status: "draft" | "published"
  artworkUrl: string | null
  albumId: Id<"albums"> | null
  inheritance: Inheritance
}

const providerLabel = (provider: string) =>
  provider === "other"
    ? t("studio.providerOther")
    : (
        {
          spotify: "Spotify",
          "apple-music": "Apple Music",
          youtube: "YouTube",
          deezer: "Deezer",
          soundcloud: "SoundCloud",
          mediafire: "MediaFire",
        } as Record<string, string>
      )[provider]!

function ListeningLinksEditor({
  links,
  invalid,
  onChange,
}: {
  links: Array<ListeningLink>
  invalid: boolean
  onChange: (links: Array<ListeningLink>) => void
}) {
  const theme = useTheme()
  return (
    <View style={{ gap: space.md }}>
      <Eyebrow>{t("studio.listeningLinks")}</Eyebrow>
      {links.length === 0 ? (
        <Text style={{ color: theme.mutedForeground, fontFamily: fonts.sans }}>
          {t("studio.listeningLinksEmpty")}
        </Text>
      ) : null}
      {links.map((link, index) => (
        <View key={index} style={{ gap: space.sm }}>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
          >
            {LISTENING_PROVIDERS.map((provider) => (
              <Chip
                key={provider}
                label={providerLabel(provider)}
                selected={link.provider === provider}
                onPress={() =>
                  onChange(
                    links.map((item, at) =>
                      at === index ? { ...item, provider } : item
                    )
                  )
                }
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <TextField
                label={t("studio.url")}
                value={link.url}
                onChangeText={(url) =>
                  onChange(
                    links.map((item, at) =>
                      at === index ? { ...item, url } : item
                    )
                  )
                }
                placeholder="https://"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                error={
                  invalid && !/^https:\/\/\S+$/i.test(link.url.trim())
                    ? t("error.invalidUrlProtocol")
                    : null
                }
              />
            </View>
            <View style={{ justifyContent: "center", paddingTop: space.lg }}>
              <IconButton
                icon="trash-outline"
                label={t("common.remove")}
                onPress={() => onChange(links.filter((_, at) => at !== index))}
              />
            </View>
          </View>
        </View>
      ))}
      {links.length < MAX_LISTENING_LINKS ? (
        <Button
          variant="outline"
          label={t("catalogue.add")}
          onPress={() => onChange([...links, { provider: "spotify", url: "" }])}
        />
      ) : null}
    </View>
  )
}

function Editor({
  initial,
  saved,
  createForAlbum,
}: {
  initial: SongValues
  saved?: Saved
  /** Creating a new song directly inside this album (inherits its metadata). */
  createForAlbum?: Id<"albums">
}) {
  const theme = useTheme()
  const router = useRouter()
  const create = useMutation(api.catalogue.songs.createSong)
  const update = useMutation(api.catalogue.songs.updateSong)
  const publish = useMutation(api.catalogue.songs.publishSong)
  const unpublish = useMutation(api.catalogue.songs.unpublishSong)
  const remove = useMutation(api.catalogue.songs.deleteSong)
  const [values, setValues] = useState(initial)
  const [showErrors, setShowErrors] = useState(false)
  const [pending, setPending] = useState<
    null | "draft" | "publish" | "toggle" | "delete"
  >(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const errors = showErrors ? songErrors(values) : {}
  const set = <TKey extends keyof SongValues>(
    key: TKey,
    value: SongValues[TKey]
  ) => setValues((current) => ({ ...current, [key]: value }))
  const required = (field: string) => t("studio.requiredField", { field })

  const inheritance: Inheritance | null = createForAlbum
    ? {
        inheritArtwork: true,
        inheritGenre: true,
        inheritLabel: true,
        inheritCredits: true,
      }
    : saved?.albumId
      ? saved.inheritance
      : null
  const albumId = createForAlbum ?? saved?.albumId ?? null
  const albumContext =
    albumId && inheritance ? { albumId, inheritance } : undefined

  const run = async (
    mode: "draft" | "publish",
    action: () => Promise<Id<"songs">>
  ) => {
    setShowErrors(true)
    if (Object.keys(songErrors(values)).length) return
    setPending(mode)
    setError(null)
    setNotice(null)
    try {
      const id = await action()
      if (mode === "publish") await publish({ songId: id })
      if (saved) {
        setNotice(
          mode === "publish"
            ? t("catalogue.publishedNotice")
            : t("catalogue.saved")
        )
      } else {
        router.replace({ pathname: "/studio-song", params: { id } })
      }
    } catch (caught) {
      setError(t(appErrorKey(caught)))
    } finally {
      setPending(null)
    }
  }

  const save = (mode: "draft" | "publish") =>
    run(mode, async () => {
      const input = songInput(values)
      if (saved) {
        await update({ songId: saved.id, ...input, albumContext })
        return saved.id
      }
      return create({ ...input, albumContext })
    })

  const toggle = async () => {
    if (!saved) return
    setPending("toggle")
    setError(null)
    setNotice(null)
    try {
      if (saved.status === "published") {
        await unpublish({ songId: saved.id })
        setNotice(t("catalogue.unpublishedNotice"))
      } else {
        await publish({ songId: saved.id })
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
      await remove({ songId: saved.id })
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
          title: saved ? t("studio.songEditTitle") : t("studio.songNewTitle"),
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
              ? t("studio.publishedBannerDescription")
              : t("studio.draftBannerDescription")
          }
          action={
            saved.status === "published"
              ? {
                  label: t("studio.viewPublicPage"),
                  onPress: () => router.push(`/songs/${saved.id}`),
                }
              : undefined
          }
        />
      ) : null}
      <Eyebrow>{t("studio.essentialInformation")}</Eyebrow>
      <TextField
        label={t("studio.songTitle")}
        value={values.title}
        onChangeText={(value) => set("title", value)}
        maxLength={160}
        autoCapitalize="sentences"
        error={errors.title ? required(t("studio.songTitle")) : null}
      />
      <TextField
        label={t("studio.primaryArtist")}
        value={values.primaryArtist}
        onChangeText={(value) => set("primaryArtist", value)}
        maxLength={120}
        autoCapitalize="words"
        error={
          errors.primaryArtist ? required(t("studio.primaryArtist")) : null
        }
      />
      <TextField
        label={t("studio.guestArtists")}
        hint={t("studio.creditsDescription")}
        value={values.guestArtists}
        onChangeText={(value) => set("guestArtists", value)}
        multiline
        autoCapitalize="words"
        error={errors.lists ? t("error.invalidCatalogue") : null}
      />
      <TextField
        label={t("studio.lyricsEditor")}
        value={values.lyricsText}
        onChangeText={(value) => set("lyricsText", value)}
        maxLength={MAX_LYRICS_TEXT_LENGTH}
        multiline
        autoCapitalize="sentences"
        autoCorrect
        error={errors.lyricsText ? t("studio.lyricsRequired") : null}
      />
      <TextField
        label={t("studio.context")}
        value={values.context}
        onChangeText={(value) => set("context", value)}
        multiline
        autoCapitalize="sentences"
        autoCorrect
      />
      <TextField
        label={t("studio.songDescription")}
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
      {inheritance ? <Message title={t("studio.inheritedMetadata")} /> : null}
      {inheritance?.inheritGenre ? null : (
        <>
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
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
            >
              {GENRES.map((genre) => (
                <Chip
                  key={genre}
                  label={
                    genre === "other"
                      ? t("studio.genreOtherOption")
                      : (genreLabel(genre) ?? genre)
                  }
                  selected={values.genre === genre}
                  onPress={() =>
                    set("genre", values.genre === genre ? "" : genre)
                  }
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
              error={
                errors.otherGenre ? required(t("studio.genreOther")) : null
              }
            />
          ) : null}
        </>
      )}
      {inheritance?.inheritLabel ? null : (
        <TextField
          label={t("studio.label")}
          value={values.label}
          onChangeText={(value) => set("label", value)}
          autoCapitalize="words"
        />
      )}
      {inheritance?.inheritCredits ? null : (
        <>
          <Eyebrow>{t("studio.songCredits")}</Eyebrow>
          <TextField
            label={t("studio.writers")}
            hint={t("studio.creditsDescription")}
            value={values.writers}
            onChangeText={(value) => set("writers", value)}
            multiline
            autoCapitalize="words"
          />
          <TextField
            label={t("studio.composers")}
            hint={t("studio.creditsDescription")}
            value={values.composers}
            onChangeText={(value) => set("composers", value)}
            multiline
            autoCapitalize="words"
          />
          <TextField
            label={t("studio.producers")}
            hint={t("studio.creditsDescription")}
            value={values.producers}
            onChangeText={(value) => set("producers", value)}
            multiline
            autoCapitalize="words"
          />
          <TextField
            label={t("studio.additionalMetadata")}
            hint={t("studio.creditsDescription")}
            value={values.additionalCredits}
            onChangeText={(value) => set("additionalCredits", value)}
            multiline
            autoCapitalize="words"
          />
        </>
      )}
      <ListeningLinksEditor
        links={values.listeningLinks}
        invalid={Boolean(errors.listeningLinks)}
        onChange={(links) => set("listeningLinks", links)}
      />
      {inheritance?.inheritArtwork ? null : saved ? (
        <ArtworkField
          resource={{ kind: "song", id: saved.id }}
          uri={saved.artworkUrl}
          label={values.title}
        />
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
          variant="outline"
          label={t("studio.saveDraft")}
          loading={pending === "draft"}
          disabled={pending !== null}
          onPress={() => void save("draft")}
        />
        <Button
          label={t("studio.saveAndPublish")}
          loading={pending === "publish"}
          disabled={pending !== null}
          onPress={() => void save("publish")}
        />
        <Text
          style={{
            color: theme.mutedForeground,
            fontFamily: fonts.sans,
            fontSize: 13,
            lineHeight: 19,
          }}
        >
          {t("studio.publishHint")}
        </Text>
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
        title={t("catalogue.deleteSongTitle")}
        description={t("catalogue.deleteSongDescription")}
        confirmLabel={t("common.remove")}
        pending={pending === "delete"}
        onConfirm={() => void destroy()}
        onClose={() => setConfirmDelete(false)}
      />
    </Screen>
  )
}

function EditExisting({ id }: { id: Id<"songs"> }) {
  const detail = useQuery(api.catalogue.read.getMySong, { songId: id })
  if (detail === undefined)
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  const track = detail.albumTrack
  return (
    <Editor
      key={id}
      initial={songValuesFromSaved(detail.song, detail.lyricsText)}
      saved={{
        id,
        status: detail.song.status,
        artworkUrl: detail.artworkUrl ?? detail.albumArtworkUrl,
        albumId: track?.albumId ?? null,
        inheritance: {
          inheritArtwork: track?.inheritArtwork ?? false,
          inheritGenre: track?.inheritGenre ?? false,
          inheritLabel: track?.inheritLabel ?? false,
          inheritCredits: track?.inheritCredits ?? false,
        },
      }}
    />
  )
}

export default function StudioSongScreen() {
  const { id, albumId } = useLocalSearchParams<{
    id?: string
    albumId?: string
  }>()
  return (
    <>
      <Stack.Screen options={{ title: t("studio.title") }} />
      <MemberGate role="artist" signInTitle={t("studio.title")}>
        {id ? (
          <EditExisting id={id as Id<"songs">} />
        ) : (
          <Editor
            initial={EMPTY_SONG}
            createForAlbum={albumId ? (albumId as Id<"albums">) : undefined}
          />
        )}
      </MemberGate>
    </>
  )
}
