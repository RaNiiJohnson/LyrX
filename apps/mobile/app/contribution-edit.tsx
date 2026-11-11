import { useRef, useState } from "react"
import { Text, View } from "react-native"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { useConvex, useMutation, useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { MAX_LYRICS_TEXT_LENGTH } from "@lyrx/shared"
import { Button, TextField } from "@/components/form"
import { Chip } from "@/components/kit"
import { MemberGate } from "@/components/member-gate"
import { genreLabel } from "@/components/song-page"
import { Loading, Message, Screen } from "@/components/ui"
import {
  EMPTY_CONTRIBUTION,
  GENRES,
  clearFlags,
  contributionErrors,
  contributionInput,
  valuesFromSaved,
  type ContributionValues,
} from "@/lib/contribution-form"
import { appErrorKey } from "@/lib/errors"
import { t } from "@/lib/i18n"
import { nativeHref } from "@/lib/routes"
import { fonts, space, useTheme } from "@/lib/theme"

type Match = {
  id: string
  kind: "official" | "community"
  title: string
  primaryArtist: string
}

function Editor({
  initial,
  saved,
}: {
  initial: ContributionValues
  /** Present when editing; absent when publishing a new contribution. */
  saved?: { id: Id<"communityContributions">; revision: number }
}) {
  const theme = useTheme()
  const router = useRouter()
  const convex = useConvex()
  const publish = useMutation(api.community.write.publish)
  const update = useMutation(api.community.write.update)
  const [values, setValues] = useState(initial)
  const [showErrors, setShowErrors] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matches, setMatches] = useState<Array<Match> | null>(null)
  // Same key on every retry of one publish, so a lost response never duplicates it.
  const requestId = useRef<string | null>(null)
  const errors = showErrors ? contributionErrors(values) : {}
  const set = <TKey extends keyof ContributionValues>(
    key: TKey,
    value: ContributionValues[TKey]
  ) => setValues((current) => ({ ...current, [key]: value }))
  const required = (field: string) => t("studio.requiredField", { field })

  const submit = async (skipMatches: boolean) => {
    setShowErrors(true)
    if (Object.keys(contributionErrors(values)).length) return
    setPending(true)
    setError(null)
    try {
      const input = contributionInput(values)
      if (saved) {
        await update({
          ...input,
          ...clearFlags(values),
          contributionId: saved.id,
          expectedRevision: saved.revision,
        })
        router.back()
        return
      }
      if (!skipMatches) {
        const found = await convex.query(api.community.read.findMatches, {
          title: input.title,
          primaryArtist: input.primaryArtist,
        })
        if (found.length) {
          setMatches(found)
          return
        }
      }
      requestId.current ??= `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
      await publish({ ...input, requestId: requestId.current })
      router.replace("/contributions")
    } catch (caught) {
      setError(t(appErrorKey(caught)))
    } finally {
      setPending(false)
    }
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: saved ? t("community.edit") : t("community.publish"),
        }}
      />
      {saved ? null : (
        <Text
          style={{
            color: theme.mutedForeground,
            fontFamily: fonts.sans,
            lineHeight: 22,
          }}
        >
          {t("community.publishDescription")}
        </Text>
      )}
      <TextField
        label={t("studio.songTitle")}
        value={values.title}
        onChangeText={(value) => {
          set("title", value)
          setMatches(null)
        }}
        maxLength={160}
        autoCapitalize="sentences"
        error={errors.title ? required(t("studio.songTitle")) : null}
      />
      <TextField
        label={t("studio.primaryArtist")}
        value={values.primaryArtist}
        onChangeText={(value) => {
          set("primaryArtist", value)
          setMatches(null)
        }}
        maxLength={120}
        autoCapitalize="words"
        error={
          errors.primaryArtist ? required(t("studio.primaryArtist")) : null
        }
      />
      <TextField
        label={t("studio.album")}
        value={values.albumTitle}
        onChangeText={(value) => set("albumTitle", value)}
        maxLength={160}
        autoCapitalize="sentences"
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
      {matches ? (
        <Message
          title={t("community.matches")}
          description={t("community.matchesDescription")}
        />
      ) : null}
      {matches?.map((match) => {
        const target = nativeHref(
          `/${match.kind === "official" ? "songs" : "community"}/${match.id}`
        )
        return (
          <Text
            key={match.id}
            accessibilityRole="link"
            onPress={target ? () => router.push(target) : undefined}
            style={{ color: theme.brand, fontFamily: fonts.sansMedium }}
          >
            {match.title} · {match.primaryArtist}
          </Text>
        )
      })}
      {error ? <Message title={t("error.title")} description={error} /> : null}
      <Button
        label={
          matches
            ? t("community.publishAnyway")
            : saved
              ? t("notebook.save")
              : t("community.publish")
        }
        loading={pending}
        onPress={() => void submit(matches !== null)}
      />
    </Screen>
  )
}

function EditExisting({ id }: { id: Id<"communityContributions"> }) {
  const detail = useQuery(api.community.read.getMine, { contributionId: id })
  if (detail === undefined)
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  return (
    <Editor
      key={id}
      initial={valuesFromSaved(detail)}
      saved={{ id, revision: detail.revision }}
    />
  )
}

export default function ContributionEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  return (
    <MemberGate role="fan" signInTitle={t("community.publish")}>
      {id ? (
        <EditExisting id={id as Id<"communityContributions">} />
      ) : (
        <Editor initial={EMPTY_CONTRIBUTION} />
      )}
    </MemberGate>
  )
}
