import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Chip, Segmented, Sheet, Skeleton, TOUCH } from "@/components/kit"
import {
  ArtistRow,
  Body,
  GUTTER,
  Heading,
  Message,
  SongRow,
} from "@/components/ui"
import {
  activeFilterCount,
  CATALOGUE_KINDS,
  DEFAULT_FILTERS,
  GENRE_LABEL_KEYS,
  SONG_GENRES,
  sortFor,
  sortsFor,
  type CatalogueFilters,
  type CatalogueKind,
  type CatalogueSort,
} from "@/lib/catalogue"
import { t } from "@/lib/i18n"
import { fonts, radius, space, useTheme } from "@/lib/theme"
import { useCatalogue, type CatalogueItem } from "@/lib/use-catalogue"

const KIND_LABELS = {
  songs: "discovery.songs",
  albums: "discovery.albums",
  artists: "discovery.artists",
} as const

const SORT_LABELS = {
  newest: "discovery.sortNewest",
  title: "discovery.sortTitle",
  popular: "discovery.sortPopular",
} as const

const COUNT_LABELS = {
  songs: "discovery.songsCount",
  albums: "discovery.albumsCount",
  artists: "discovery.artistsCount",
} as const

function Row({ item }: { item: CatalogueItem }) {
  if (item.kind === "artist")
    return (
      <ArtistRow
        href={item.href}
        avatarUrl={item.avatarUrl}
        name={item.name}
        handle={item.handle}
        songCount={item.songCount}
      />
    )
  const subtitle =
    item.kind === "album"
      ? `${item.subtitle} · ${t(item.trackCount === 1 ? "catalogue.trackOne" : "catalogue.trackMany", { count: item.trackCount })}`
      : `${item.subtitle} · ${t(item.badge === "community" ? "discovery.sourceCommunity" : "discovery.sourceArtist")}`
  return (
    <SongRow
      href={item.href}
      artworkUrl={item.artworkUrl}
      title={item.title}
      subtitle={subtitle}
    />
  )
}

function RowsSkeleton() {
  return (
    <View style={{ gap: space.md, paddingTop: space.sm }}>
      {Array.from({ length: 6 }, (_, index) => (
        <View
          key={index}
          style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}
        >
          <Skeleton width={64} height={64} rounded={radius.md} />
          <View style={{ flex: 1, gap: space.sm }}>
            <Skeleton width="70%" height={16} />
            <Skeleton width="45%" height={14} />
          </View>
        </View>
      ))}
    </View>
  )
}

function FilterSheet({
  visible,
  onClose,
  kind,
  filters,
  onChange,
}: {
  visible: boolean
  onClose: () => void
  kind: CatalogueKind
  filters: CatalogueFilters
  onChange: (filters: CatalogueFilters) => void
}) {
  const theme = useTheme()
  const sorts = sortsFor(kind)
  const sort = sortFor(kind, filters.sort)
  return (
    <Sheet visible={visible} onClose={onClose} title={t("discovery.filters")}>
      <View style={{ gap: space.sm }}>
        <Text
          style={{ color: theme.mutedForeground, fontFamily: fonts.sansMedium }}
        >
          {t("discovery.sort")}
        </Text>
        <Segmented<CatalogueSort>
          label={t("discovery.sort")}
          value={sort}
          onChange={(next) => onChange({ ...filters, sort: next })}
          options={sorts.map((value) => ({
            value,
            label: t(SORT_LABELS[value]),
          }))}
        />
      </View>
      {kind === "songs" ? (
        <>
          <View style={{ gap: space.sm }}>
            <Text
              style={{
                color: theme.mutedForeground,
                fontFamily: fonts.sansMedium,
              }}
            >
              {t("discovery.origin")}
            </Text>
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
            >
              <Chip
                label={t("discovery.allOrigins")}
                selected={!filters.origin}
                onPress={() => onChange({ ...filters, origin: undefined })}
              />
              <Chip
                label={t("discovery.sourceArtist")}
                selected={filters.origin === "artist"}
                onPress={() => onChange({ ...filters, origin: "artist" })}
              />
              <Chip
                label={t("discovery.sourceCommunity")}
                selected={filters.origin === "community"}
                onPress={() => onChange({ ...filters, origin: "community" })}
              />
            </View>
          </View>
          <View style={{ gap: space.sm }}>
            <Text
              style={{
                color: theme.mutedForeground,
                fontFamily: fonts.sansMedium,
              }}
            >
              {t("discovery.genre")}
            </Text>
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
            >
              <Chip
                label={t("discovery.allGenres")}
                selected={!filters.genre}
                onPress={() => onChange({ ...filters, genre: undefined })}
              />
              {SONG_GENRES.map((genre) => (
                <Chip
                  key={genre}
                  label={t(GENRE_LABEL_KEYS[genre])}
                  selected={filters.genre === genre}
                  onPress={() => onChange({ ...filters, genre })}
                />
              ))}
            </View>
          </View>
        </>
      ) : null}
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange(DEFAULT_FILTERS)}
          style={{
            flex: 1,
            minHeight: TOUCH,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: theme.outline,
          }}
        >
          <Text
            style={{ color: theme.foreground, fontFamily: fonts.sansSemibold }}
          >
            {t("discovery.reset")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={{
            flex: 1,
            minHeight: TOUCH,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius.pill,
            backgroundColor: theme.primary,
          }}
        >
          <Text
            style={{
              color: theme.primaryForeground,
              fontFamily: fonts.sansSemibold,
            }}
          >
            {t("common.close")}
          </Text>
        </Pressable>
      </View>
    </Sheet>
  )
}

export default function CatalogueScreen() {
  const theme = useTheme()
  const [kind, setKind] = useState<CatalogueKind>("songs")
  const [filters, setFilters] = useState<CatalogueFilters>(DEFAULT_FILTERS)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const feed = useCatalogue(kind, filters)
  const count = activeFilterCount(kind, filters)

  const header = useMemo(
    () => (
      <View style={{ gap: space.md, paddingBottom: space.sm }}>
        <Heading level={1}>{t("discovery.catalogue")}</Heading>
        <Segmented<CatalogueKind>
          label={t("discovery.catalogue")}
          value={kind}
          onChange={setKind}
          options={CATALOGUE_KINDS.map((value) => ({
            value,
            label: t(KIND_LABELS[value]),
          }))}
        />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Body muted>
            {feed.status === "ready"
              ? t(COUNT_LABELS[kind], { count: feed.total })
              : " "}
          </Body>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("discovery.filters")}
            onPress={() => setSheetOpen(true)}
            style={{
              minHeight: TOUCH,
              paddingHorizontal: space.md,
              flexDirection: "row",
              alignItems: "center",
              gap: space.xs,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: count ? theme.primary : theme.outline,
              backgroundColor: theme.card,
            }}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={theme.foreground}
            />
            <Text
              style={{
                color: theme.foreground,
                fontFamily: fonts.sansMedium,
                fontSize: 14,
              }}
            >
              {t("discovery.filters")}
              {count ? ` · ${count}` : ""}
            </Text>
          </Pressable>
        </View>
        {count ? (
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
          >
            {filters.origin ? (
              <Chip
                selected
                label={t(
                  filters.origin === "artist"
                    ? "discovery.sourceArtist"
                    : "discovery.sourceCommunity"
                )}
                onPress={() => undefined}
                onClear={() => setFilters({ ...filters, origin: undefined })}
              />
            ) : null}
            {filters.genre ? (
              <Chip
                selected
                label={t(GENRE_LABEL_KEYS[filters.genre])}
                onPress={() => undefined}
                onClear={() => setFilters({ ...filters, genre: undefined })}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    ),
    [theme, kind, filters, feed.status, feed.total, count]
  )

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={feed.status === "ready" ? feed.items : []}
        keyExtractor={(item) => `${item.kind}-${item.key}`}
        renderItem={({ item }) => <Row item={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          feed.status === "loading" ? (
            <RowsSkeleton />
          ) : feed.status === "ready" ? (
            <Message
              title={t("discovery.emptyTitle")}
              description={t("discovery.emptyDescription")}
            />
          ) : (
            <Message
              title={t("discovery.errorTitle")}
              description={
                feed.status === "unavailable"
                  ? t("search.unavailable")
                  : undefined
              }
              action={{
                label: t("discovery.retry"),
                onPress: () => void feed.reload(),
              }}
            />
          )
        }
        ListFooterComponent={
          feed.loadingMore ? (
            <View style={{ padding: space.lg }}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : feed.moreFailed ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void feed.loadMore()}
              style={{
                minHeight: TOUCH,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: theme.brand, fontFamily: fonts.sansBold }}>
                {t("discovery.retry")}
              </Text>
            </Pressable>
          ) : undefined
        }
        onEndReachedThreshold={0.6}
        onEndReached={() => void feed.loadMore()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.mutedForeground}
            onRefresh={() => {
              setRefreshing(true)
              feed.reload().finally(() => setRefreshing(false))
            }}
          />
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingTop: space.md,
          paddingBottom: space.xl,
        }}
        initialNumToRender={10}
        windowSize={9}
        removeClippedSubviews
      />
      <FilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        kind={kind}
        filters={filters}
        onChange={setFilters}
      />
    </View>
  )
}
