import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { usePaginatedQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { TOUCH } from "@/components/kit"
import { Body, GUTTER, Message, SongRow } from "@/components/ui"
import { t } from "@/lib/i18n"
import { SEARCH_DEBOUNCE_MS, validSearch } from "@/lib/search-text"
import { fonts, radius, space, useTheme } from "@/lib/theme"

const PAGE = 12

export default function SearchScreen() {
  const theme = useTheme()
  const [draft, setDraft] = useState("")
  const [query, setQuery] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => setQuery(draft.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft])
  const valid = validSearch(query)
  const results = usePaginatedQuery(
    api.discovery.read.search,
    valid ? { text: query } : "skip",
    { initialNumItems: PAGE }
  )

  const status = !query
    ? "start"
    : !valid
      ? "invalid"
      : results.status === "LoadingFirstPage"
        ? "loading"
        : results.results.length
          ? "results"
          : "empty"

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={status === "results" ? results.results : []}
        keyExtractor={(item) => `${item.kind}-${item.id}-${item.href}`}
        renderItem={({ item }) => (
          <SongRow
            href={item.href}
            artworkUrl={item.artworkUrl}
            title={item.title}
            subtitle={item.context}
          />
        )}
        accessibilityLabel={t("search.resultsLabel")}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingTop: space.md,
          paddingBottom: space.xl,
        }}
        ListHeaderComponent={
          <View style={{ paddingBottom: space.md }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                minHeight: TOUCH + 4,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                paddingLeft: space.md,
              }}
            >
              <Ionicons
                name="search-outline"
                size={20}
                color={theme.mutedForeground}
              />
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t("search.placeholder")}
                placeholderTextColor={theme.mutedForeground}
                accessibilityLabel={t("search.title")}
                returnKeyType="search"
                autoFocus
                autoCorrect={false}
                autoCapitalize="none"
                onSubmitEditing={() => setQuery(draft.trim())}
                style={{
                  flex: 1,
                  color: theme.foreground,
                  fontFamily: fonts.sans,
                  fontSize: 16,
                  paddingHorizontal: space.sm,
                  paddingVertical: 12,
                }}
              />
              {draft ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("common.remove")}
                  hitSlop={8}
                  onPress={() => setDraft("")}
                  style={{
                    width: TOUCH,
                    height: TOUCH,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={theme.mutedForeground}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          status === "start" ? (
            <Body muted>{t("search.start")}</Body>
          ) : status === "invalid" ? (
            <Message title={t("search.invalid")} />
          ) : status === "loading" ? (
            <View style={{ padding: space.xl }}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : (
            <Message title={t("search.empty")} />
          )
        }
        ListFooterComponent={
          status === "results" && results.status === "CanLoadMore" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => results.loadMore(PAGE)}
              style={{
                minHeight: TOUCH,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: theme.brand, fontFamily: fonts.sansBold }}>
                {t("common.loadMore")}
              </Text>
            </Pressable>
          ) : status === "results" && results.status === "LoadingMore" ? (
            <View style={{ padding: space.lg }}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : undefined
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (results.status === "CanLoadMore") results.loadMore(PAGE)
        }}
      />
    </View>
  )
}
