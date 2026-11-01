import { useState } from "react"
import { Pressable, Text, TextInput, View } from "react-native"
import { usePaginatedQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Body, Loading, Message, Screen, SongRow } from "@/components/ui"
import { t } from "@/lib/i18n"
import { fonts, radius, space, useTheme } from "@/lib/theme"

/** Mirrors the server bounds so an invalid request shows guidance instead of an error screen. */
function validSearch(text: string) {
  const terms = text.split(/\s+/).filter(Boolean)
  return (
    text.length > 0 &&
    text.length <= 200 &&
    terms.length > 0 &&
    terms.length <= 16 &&
    terms.every((term) => term.length <= 32)
  )
}

export default function SearchScreen() {
  const theme = useTheme()
  const [draft, setDraft] = useState("")
  const [submitted, setSubmitted] = useState("")
  const valid = validSearch(submitted)
  const results = usePaginatedQuery(
    api.discovery.read.search,
    valid ? { text: submitted } : "skip",
    { initialNumItems: 12 }
  )
  const submit = () => setSubmitted(draft.trim())
  return (
    <Screen underTopBar>
      <View style={{ gap: space.sm }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          placeholder={t("search.placeholder")}
          placeholderTextColor={theme.mutedForeground}
          accessibilityLabel={t("search.title")}
          returnKeyType="search"
          autoCorrect={false}
          style={{
            color: theme.foreground,
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: radius.pill,
            paddingHorizontal: space.md + 4,
            paddingVertical: 12,
            fontFamily: fonts.sans,
            fontSize: 16,
          }}
        />
        <Pressable
          accessibilityRole="button"
          onPress={submit}
          style={{
            alignItems: "center",
            padding: 12,
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
            {t("search.submit")}
          </Text>
        </Pressable>
      </View>
      {!submitted ? <Body muted>{t("search.start")}</Body> : null}
      {submitted && !valid ? <Message title={t("search.invalid")} /> : null}
      {valid && results.status === "LoadingFirstPage" ? <Loading /> : null}
      {valid && results.status !== "LoadingFirstPage" ? (
        results.results.length ? (
          <View accessibilityLabel={t("search.resultsLabel")}>
            {results.results.map((item) => (
              <SongRow
                key={`${item.kind}-${item.id}-${item.href}`}
                href={item.href}
                artworkUrl={item.artworkUrl}
                title={item.title}
                subtitle={item.context}
              />
            ))}
            {results.status === "CanLoadMore" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => results.loadMore(12)}
                style={{ alignItems: "center", padding: space.sm }}
              >
                <Text
                  style={{ color: theme.brand, fontFamily: fonts.sansBold }}
                >
                  {t("common.loadMore")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Message title={t("search.empty")} />
        )
      ) : null}
    </Screen>
  )
}
