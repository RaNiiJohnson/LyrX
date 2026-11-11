import { useState } from "react"
import { FlatList, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Button } from "@/components/form"
import { Chip, Segmented } from "@/components/kit"
import { MemberGate } from "@/components/member-gate"
import { Badge, Cover, GUTTER, Loading, Message } from "@/components/ui"
import { appErrorKey } from "@/lib/errors"
import { t } from "@/lib/i18n"
import { fonts, radius, space, useTheme } from "@/lib/theme"

const PAGE = 20

type Kind = "songs" | "albums"
type Status = "all" | "draft" | "published"

type Row = {
  id: string
  kind: Kind
  title: string
  subtitle: string
  artworkUrl: string | null
  status: "draft" | "published"
}

function StudioRow({
  row,
  onError,
}: {
  row: Row
  onError: (message: string) => void
}) {
  const theme = useTheme()
  const router = useRouter()
  const publishSong = useMutation(api.catalogue.songs.publishSong)
  const unpublishSong = useMutation(api.catalogue.songs.unpublishSong)
  const publishAlbum = useMutation(api.catalogue.albums.publishAlbum)
  const unpublishAlbum = useMutation(api.catalogue.albums.unpublishAlbum)
  const [pending, setPending] = useState(false)
  const published = row.status === "published"

  const toggle = async () => {
    setPending(true)
    try {
      if (row.kind === "songs") {
        const songId = row.id as Id<"songs">
        await (published ? unpublishSong({ songId }) : publishSong({ songId }))
      } else {
        const albumId = row.id as Id<"albums">
        await (published
          ? unpublishAlbum({ albumId })
          : publishAlbum({ albumId }))
      }
    } catch (caught) {
      onError(t(appErrorKey(caught)))
    } finally {
      setPending(false)
    }
  }

  return (
    <View
      style={{
        gap: space.md,
        padding: space.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.outline,
        backgroundColor: theme.card,
      }}
    >
      <View
        style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}
      >
        <Cover uri={row.artworkUrl} label={row.title} size={64} />
        <View style={{ flex: 1, gap: space.xs }}>
          <Text
            numberOfLines={2}
            style={{
              color: theme.foreground,
              fontFamily: fonts.sansSemibold,
              fontSize: 16,
            }}
          >
            {row.title}
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: theme.mutedForeground, fontFamily: fonts.sans }}
          >
            {row.subtitle}
          </Text>
          <View style={{ flexDirection: "row" }}>
            <Badge
              label={
                published ? t("catalogue.published") : t("catalogue.draft")
              }
            />
          </View>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            variant="outline"
            label={t("catalogue.edit")}
            onPress={() =>
              router.push({
                pathname:
                  row.kind === "songs" ? "/studio-song" : "/studio-album",
                params: { id: row.id },
              })
            }
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            variant={published ? "outline" : "primary"}
            label={
              published ? t("catalogue.unpublish") : t("catalogue.publish")
            }
            loading={pending}
            onPress={() => void toggle()}
          />
        </View>
      </View>
    </View>
  )
}

function StudioList() {
  const theme = useTheme()
  const router = useRouter()
  const [kind, setKind] = useState<Kind>("songs")
  const [status, setStatus] = useState<Status>("all")
  const [error, setError] = useState<string | null>(null)
  const counts = useQuery(api.catalogue.read.getMyCatalogueCounts, {})
  const statusArg = status === "all" ? undefined : status
  const songs = usePaginatedQuery(
    api.catalogue.read.listMySongs,
    kind === "songs" ? { status: statusArg } : "skip",
    { initialNumItems: PAGE }
  )
  const albums = usePaginatedQuery(
    api.catalogue.read.listMyAlbums,
    kind === "albums" ? { status: statusArg } : "skip",
    { initialNumItems: PAGE }
  )
  const list = kind === "songs" ? songs : albums
  const rows: Array<Row> =
    kind === "songs"
      ? songs.results.map((song) => ({
          id: song._id,
          kind,
          title: song.title,
          subtitle: song.albumTitle
            ? `${song.primaryArtist} · ${song.albumTitle}`
            : song.primaryArtist,
          artworkUrl: song.artworkUrl,
          status: song.status,
        }))
      : albums.results.map((album) => ({
          id: album._id,
          kind,
          title: album.title,
          subtitle: t("studio.trackCount", { count: album.trackCount }),
          artworkUrl: album.artworkUrl,
          status: album.status,
        }))
  const drafts = counts ? counts.songs.draft + counts.albums.draft : 0

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={rows}
        keyExtractor={(row) => `${row.kind}-${row.id}`}
        renderItem={({ item }) => <StudioRow row={item} onError={setError} />}
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingTop: space.md,
          paddingBottom: space.xl,
          gap: space.md,
        }}
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
            {drafts > 0 ? (
              <Message
                title={
                  drafts === 1
                    ? t("studio.pendingDraftSong")
                    : t("studio.pendingDraftSongs", { count: drafts })
                }
                description={t("studio.pendingDraftsHint")}
              />
            ) : null}
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  label={t("studio.newSong")}
                  onPress={() => router.push("/studio-song")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  variant="outline"
                  label={t("studio.newAlbum")}
                  onPress={() => router.push("/studio-album")}
                />
              </View>
            </View>
            <Segmented<Kind>
              label={t("studio.title")}
              value={kind}
              onChange={setKind}
              options={[
                {
                  value: "songs",
                  label: `${t("studio.songs")}${counts ? ` · ${counts.songs.all}` : ""}`,
                },
                {
                  value: "albums",
                  label: `${t("studio.albums")}${counts ? ` · ${counts.albums.all}` : ""}`,
                },
              ]}
            />
            <View
              accessibilityLabel={t("catalogue.filterByStatus")}
              style={{ flexDirection: "row", gap: space.sm }}
            >
              {(
                [
                  ["all", t("catalogue.all")],
                  ["draft", t("catalogue.drafts")],
                  ["published", t("catalogue.publishedPlural")],
                ] as const
              ).map(([value, label]) => (
                <Chip
                  key={value}
                  label={label}
                  selected={status === value}
                  onPress={() => setStatus(value)}
                />
              ))}
            </View>
            {error ? (
              <Message title={t("catalogue.saveError")} description={error} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          list.status === "LoadingFirstPage" ? (
            <Loading />
          ) : (
            <Message
              title={
                kind === "songs"
                  ? t("studio.emptySongs")
                  : t("studio.emptyAlbums")
              }
              description={
                kind === "songs"
                  ? t("studio.emptySongsDescription")
                  : t("studio.emptyAlbumsDescription")
              }
            />
          )
        }
        ListFooterComponent={
          <>
            {list.status === "CanLoadMore" ? (
              <Button
                variant="outline"
                label={t("community.loadMore")}
                onPress={() => list.loadMore(PAGE)}
              />
            ) : null}
          </>
        }
      />
    </View>
  )
}

export default function StudioScreen() {
  return (
    <MemberGate role="artist" signInTitle={t("studio.title")}>
      <StudioList />
    </MemberGate>
  )
}
