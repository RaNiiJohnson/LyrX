import { useMemo, useState } from "react"
import { Pressable, Share, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useMutation, useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { MAX_SHARE_LINES, MAX_SHARE_TEXT_LENGTH } from "@lyrx/shared"
import { Button } from "@/components/form"
import { Chip, Sheet } from "@/components/kit"
import { Lyrics } from "@/components/lyrics"
import {
  useActiveMember,
  type SongSourceId,
} from "@/components/song-interactions"
import { Heading, Message } from "@/components/ui"
import { appErrorKey } from "@/lib/errors"
import { t } from "@/lib/i18n"
import { lyricLines, selectLines } from "@/lib/lyric-lines"
import { fonts, radius, space, useTheme } from "@/lib/theme"

/** Server limit for a saved passage, in UTF-16 units. */
export const MAX_PASSAGE_LENGTH = 1000

function SaveSheet({
  visible,
  onClose,
  sourceId,
  lyricsText,
  range,
}: {
  visible: boolean
  onClose: () => void
  sourceId: SongSourceId
  lyricsText: string
  range: { start: number; end: number }
}) {
  const router = useRouter()
  const collections = useQuery(
    api.notebook.read.collections,
    visible ? {} : "skip"
  )
  const save = useMutation(api.notebook.write.save)
  const [collectionId, setCollectionId] =
    useState<Id<"notebookCollections"> | null>(null)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const close = () => {
    setSaved(false)
    setError(null)
    onClose()
  }
  return (
    <Sheet visible={visible} onClose={close} title={t("notebook.savePassage")}>
      {saved ? (
        <>
          <Message title={t("notebook.saved")} />
          <Button
            label={t("notebook.view")}
            onPress={() => {
              close()
              router.push("/notebook")
            }}
          />
          <Button variant="outline" label={t("common.close")} onPress={close} />
        </>
      ) : (
        <>
          <Text accessibilityRole="header" style={{ fontSize: 15 }}>
            {t("notebook.collection")}
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
          >
            <Chip
              label={t("notebook.default")}
              selected={collectionId === null}
              onPress={() => setCollectionId(null)}
            />
            {(collections ?? []).map((collection) => (
              <Chip
                key={collection.id}
                label={collection.name}
                selected={collectionId === collection.id}
                onPress={() => setCollectionId(collection.id)}
              />
            ))}
          </View>
          {error ? <Message title={error} /> : null}
          <Button
            label={t("notebook.save")}
            loading={pending}
            onPress={() => {
              setPending(true)
              setError(null)
              save({
                sourceId,
                collectionId,
                sourceText: lyricsText,
                start: range.start,
                end: range.end,
              })
                .then(() => setSaved(true))
                .catch((caught: unknown) => setError(t(appErrorKey(caught))))
                .finally(() => setPending(false))
            }}
          />
        </>
      )}
    </Sheet>
  )
}

function SelectionBar({
  sourceId,
  title,
  primaryArtist,
  lyricsText,
  selection,
}: {
  sourceId: SongSourceId
  title: string
  primaryArtist: string
  lyricsText: string
  selection: NonNullable<ReturnType<typeof selectLines>>
}) {
  const theme = useTheme()
  const { ready } = useActiveMember()
  const [saving, setSaving] = useState(false)
  const lineCount = selection.last - selection.first + 1
  const shareable =
    selection.end - selection.start <= MAX_SHARE_TEXT_LENGTH &&
    lineCount <= MAX_SHARE_LINES
  return (
    <View
      style={{
        gap: space.sm,
        padding: space.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.brand,
        backgroundColor: theme.card,
      }}
    >
      <Text
        numberOfLines={4}
        style={{
          color: theme.foreground,
          fontFamily: fonts.serifItalic,
          fontSize: 16,
          lineHeight: 24,
        }}
      >
        {selection.text}
      </Text>
      <Text
        style={{
          color: selection.tooLong ? theme.destructive : theme.mutedForeground,
          fontFamily: fonts.sans,
          fontSize: 13,
        }}
      >
        {selection.tooLong
          ? t("notebook.limit")
          : t("notebook.selectionCount", {
              count: selection.end - selection.start,
            })}
      </Text>
      {ready ? (
        <Button
          label={t("notebook.savePassage")}
          disabled={selection.tooLong}
          onPress={() => setSaving(true)}
        />
      ) : (
        <Text
          style={{
            color: theme.mutedForeground,
            fontFamily: fonts.sans,
            fontSize: 13,
          }}
        >
          {t("notebook.signInSave")}
        </Text>
      )}
      <Button
        variant="outline"
        label={t("common.share")}
        disabled={!shareable}
        onPress={() => {
          void Share.share({
            message: `“${selection.text}”\n— ${primaryArtist}, ${title}`,
          }).catch(() => undefined)
        }}
      />
      {!shareable && !selection.tooLong ? (
        <Text
          style={{
            color: theme.mutedForeground,
            fontFamily: fonts.sans,
            fontSize: 13,
          }}
        >
          {t("sharing.limits", {
            count: selection.end - selection.start,
            max: MAX_SHARE_TEXT_LENGTH,
          })}
        </Text>
      ) : null}
      {ready ? (
        <SaveSheet
          visible={saving}
          onClose={() => setSaving(false)}
          sourceId={sourceId}
          lyricsText={lyricsText}
          range={selection}
        />
      ) : null}
    </View>
  )
}

/**
 * Lyrics with a line-selection mode: tap one line, then another to extend, then save the
 * passage to the notebook or share it as text. Offsets are computed on the raw text, which
 * is what the server validates against.
 */
export function PassageLyrics({
  sourceId,
  title,
  primaryArtist,
  lyricsText,
}: {
  sourceId: SongSourceId
  title: string
  primaryArtist: string
  lyricsText: string
}) {
  const theme = useTheme()
  const lines = useMemo(() => lyricLines(lyricsText), [lyricsText])
  const [selecting, setSelecting] = useState(false)
  const [range, setRange] = useState<{ anchor: number; focus: number } | null>(
    null
  )
  const selection = range
    ? selectLines(lines, range.anchor, range.focus, MAX_PASSAGE_LENGTH)
    : null

  return (
    <View style={{ gap: space.md }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.sm,
        }}
      >
        <Heading>{t("studio.lyrics")}</Heading>
        <Chip
          label={selecting ? t("notebook.close") : t("notebook.selectTitle")}
          selected={selecting}
          onPress={() => {
            setSelecting((value) => !value)
            setRange(null)
          }}
        />
      </View>
      {selecting ? (
        <>
          <Text
            style={{
              color: theme.mutedForeground,
              fontFamily: fonts.sans,
              fontSize: 14,
            }}
          >
            {selection ? t("notebook.preview") : t("notebook.noSelection")}
          </Text>
          <View>
            {lines.map((line) => {
              const inside =
                selection !== null &&
                line.index >= selection.first &&
                line.index <= selection.last
              return (
                <View key={line.index} style={{ gap: space.sm }}>
                  {line.text.trim() === "" ? (
                    <View style={{ height: space.md }} />
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: inside }}
                      onPress={() =>
                        setRange((current) =>
                          current && current.anchor === current.focus
                            ? { anchor: current.anchor, focus: line.index }
                            : { anchor: line.index, focus: line.index }
                        )
                      }
                      style={{
                        minHeight: 36,
                        justifyContent: "center",
                        paddingHorizontal: space.sm,
                        borderRadius: radius.sm,
                        backgroundColor: inside ? theme.muted : "transparent",
                        borderLeftWidth: 3,
                        borderLeftColor: inside ? theme.brand : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          color: theme.foreground,
                          fontFamily: fonts.sans,
                          fontSize: 18,
                          lineHeight: 28,
                        }}
                      >
                        {line.text}
                      </Text>
                    </Pressable>
                  )}
                  {selection && line.index === selection.last ? (
                    <SelectionBar
                      sourceId={sourceId}
                      title={title}
                      primaryArtist={primaryArtist}
                      lyricsText={lyricsText}
                      selection={selection}
                    />
                  ) : null}
                </View>
              )
            })}
          </View>
        </>
      ) : (
        <Lyrics text={lyricsText} />
      )}
    </View>
  )
}
