import { useState } from "react"
import { FlatList, Text, View } from "react-native"
import { Stack, useRouter } from "expo-router"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { ConfirmSheet } from "@/components/confirm-sheet"
import { Button, TextField } from "@/components/form"
import { Chip, IconButton, Sheet } from "@/components/kit"
import { MemberGate } from "@/components/member-gate"
import { Badge, GUTTER, Loading, Message } from "@/components/ui"
import { appErrorKey } from "@/lib/errors"
import { t } from "@/lib/i18n"
import { nativeHref } from "@/lib/routes"
import { fonts, radius, space, useTheme } from "@/lib/theme"

const PAGE = 20
type CollectionId = Id<"notebookCollections">
/** "all" lists every passage, null the default collection. */
type Filter = "all" | null | CollectionId

type Passage = {
  id: Id<"notebookPassages">
  collectionId: CollectionId | null
  text: string | null
  state: "current" | "changed" | "unavailable"
  source: { href: string; title: string; primaryArtist: string } | null
}

function NameSheet({
  visible,
  collection,
  onClose,
  onDone,
}: {
  visible: boolean
  /** Collection being renamed; null creates a new one. */
  collection: { id: CollectionId; name: string } | null
  onClose: () => void
  onDone: (id: CollectionId | null) => void
}) {
  const create = useMutation(api.notebook.write.createCollection)
  const rename = useMutation(api.notebook.write.renameCollection)
  const [name, setName] = useState(collection?.name ?? "")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={collection ? t("notebook.rename") : t("notebook.newCollection")}
    >
      <TextField
        label={t("notebook.name")}
        value={name}
        onChangeText={setName}
        maxLength={60}
        autoCapitalize="sentences"
        hint={t("notebook.nameHint")}
        error={error}
      />
      <Button
        label={t("notebook.save")}
        loading={pending}
        disabled={name.trim() === ""}
        onPress={() => {
          setPending(true)
          setError(null)
          const request = collection
            ? rename({ collectionId: collection.id, name: name.trim() }).then(
                () => collection.id
              )
            : create({ name: name.trim() })
          request
            .then((id) => {
              setName("")
              onDone(id)
            })
            .catch((caught: unknown) => setError(t(appErrorKey(caught))))
            .finally(() => setPending(false))
        }}
      />
    </Sheet>
  )
}

function PassageSheet({
  passage,
  collections,
  onClose,
}: {
  passage: Passage | null
  collections: ReadonlyArray<{ id: CollectionId; name: string }>
  onClose: () => void
}) {
  const move = useMutation(api.notebook.write.move)
  const remove = useMutation(api.notebook.write.remove)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = (action: Promise<unknown>, after?: () => void) => {
    setPending(true)
    setError(null)
    action
      .then(() => {
        after?.()
        onClose()
      })
      .catch((caught: unknown) => setError(t(appErrorKey(caught))))
      .finally(() => setPending(false))
  }
  return (
    <>
      <Sheet
        visible={passage !== null && !confirming}
        onClose={onClose}
        title={t("notebook.options")}
      >
        {error ? <Message title={error} /> : null}
        <Text accessibilityRole="header" style={{ fontSize: 15 }}>
          {t("notebook.move")}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          <Chip
            label={t("notebook.default")}
            selected={passage?.collectionId === null}
            onPress={() =>
              passage &&
              run(move({ passageId: passage.id, collectionId: null }))
            }
          />
          {collections.map((collection) => (
            <Chip
              key={collection.id}
              label={collection.name}
              selected={passage?.collectionId === collection.id}
              onPress={() =>
                passage &&
                run(
                  move({ passageId: passage.id, collectionId: collection.id })
                )
              }
            />
          ))}
        </View>
        <Button
          variant="outline"
          label={t("notebook.remove")}
          onPress={() => setConfirming(true)}
        />
      </Sheet>
      <ConfirmSheet
        visible={passage !== null && confirming}
        title={t("notebook.remove")}
        description={t("notebook.removeHint")}
        confirmLabel={t("notebook.remove")}
        pending={pending}
        onClose={() => setConfirming(false)}
        onConfirm={() =>
          passage &&
          run(remove({ passageId: passage.id }), () => setConfirming(false))
        }
      />
    </>
  )
}

function PassageCard({
  passage,
  onOptions,
}: {
  passage: Passage
  onOptions: () => void
}) {
  const theme = useTheme()
  const router = useRouter()
  const target = passage.source ? nativeHref(passage.source.href) : null
  return (
    <View
      style={{
        gap: space.sm,
        padding: space.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
      }}
    >
      {passage.state === "unavailable" || passage.text === null ? (
        <>
          <Text
            style={{ color: theme.foreground, fontFamily: fonts.sansSemibold }}
          >
            {t("notebook.unavailable")}
          </Text>
          <Text
            style={{ color: theme.mutedForeground, fontFamily: fonts.sans }}
          >
            {t("notebook.unavailableHint")}
          </Text>
        </>
      ) : (
        <>
          <Text
            selectable
            style={{
              color: theme.foreground,
              fontFamily: fonts.serifItalic,
              fontSize: 18,
              lineHeight: 28,
            }}
          >
            {passage.text}
          </Text>
          {passage.state === "changed" ? (
            <View style={{ gap: space.xs, alignItems: "flex-start" }}>
              <Badge label={t("notebook.changed")} />
              <Text
                style={{
                  color: theme.mutedForeground,
                  fontFamily: fonts.sans,
                  fontSize: 13,
                }}
              >
                {t("notebook.changedHint")}
              </Text>
            </View>
          ) : null}
        </>
      )}
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}
      >
        <View style={{ flex: 1 }}>
          {passage.source ? (
            <Text
              numberOfLines={1}
              accessibilityRole={target ? "link" : undefined}
              onPress={target ? () => router.push(target) : undefined}
              style={{
                color: target ? theme.brand : theme.mutedForeground,
                fontFamily: fonts.sansMedium,
                fontSize: 14,
              }}
            >
              {passage.source.title} · {passage.source.primaryArtist}
            </Text>
          ) : null}
        </View>
        <IconButton
          icon="ellipsis-horizontal"
          label={t("notebook.options")}
          onPress={onOptions}
        />
      </View>
    </View>
  )
}

function NotebookBody() {
  const theme = useTheme()
  const collections = useQuery(api.notebook.read.collections, {})
  const [filter, setFilter] = useState<Filter>("all")
  const [naming, setNaming] = useState<"new" | "rename" | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState<Passage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const deleteCollection = useMutation(api.notebook.write.deleteCollection)
  const passages = usePaginatedQuery(
    api.notebook.read.passages,
    filter === "all" ? {} : { collectionId: filter },
    { initialNumItems: PAGE }
  )
  const current = collections?.find((collection) => collection.id === filter)

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={passages.results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PassageCard passage={item} onOptions={() => setSelected(item)} />
        )}
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingTop: space.md,
          paddingBottom: space.xl,
          gap: space.md,
        }}
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
            <Text
              style={{
                color: theme.mutedForeground,
                fontFamily: fonts.sans,
                fontSize: 14,
              }}
            >
              {t("notebook.private")}
            </Text>
            <View
              accessibilityLabel={t("notebook.collections")}
              style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
            >
              <Chip
                label={t("notebook.all")}
                selected={filter === "all"}
                onPress={() => setFilter("all")}
              />
              <Chip
                label={t("notebook.default")}
                selected={filter === null}
                onPress={() => setFilter(null)}
              />
              {(collections ?? []).map((collection) => (
                <Chip
                  key={collection.id}
                  label={collection.name}
                  selected={filter === collection.id}
                  onPress={() => setFilter(collection.id)}
                />
              ))}
              <Chip
                label={`+ ${t("notebook.newCollection")}`}
                onPress={() => setNaming("new")}
              />
            </View>
            {current ? (
              <View style={{ flexDirection: "row", gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Button
                    variant="outline"
                    label={t("notebook.rename")}
                    onPress={() => setNaming("rename")}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    variant="outline"
                    label={t("notebook.deleteCollection")}
                    onPress={() => setDeleting(true)}
                  />
                </View>
              </View>
            ) : null}
            {error ? <Message title={error} /> : null}
          </View>
        }
        ListEmptyComponent={
          passages.status === "LoadingFirstPage" ? (
            <Loading />
          ) : filter === "all" || filter === null ? (
            <Message
              title={t("notebook.empty")}
              description={t("notebook.emptyHint")}
            />
          ) : (
            <Message
              title={t("notebook.emptyCollection")}
              description={t("notebook.emptyCollectionHint")}
            />
          )
        }
        ListFooterComponent={
          <>
            {passages.status === "CanLoadMore" ? (
              <Button
                variant="outline"
                label={t("community.loadMore")}
                onPress={() => passages.loadMore(PAGE)}
              />
            ) : null}
          </>
        }
      />
      <NameSheet
        key={naming === "rename" ? (current?.id ?? "rename") : "new"}
        visible={naming !== null}
        collection={naming === "rename" && current ? current : null}
        onClose={() => setNaming(null)}
        onDone={(id) => {
          setNaming(null)
          if (id) setFilter(id)
        }}
      />
      <PassageSheet
        passage={selected}
        collections={collections ?? []}
        onClose={() => setSelected(null)}
      />
      <ConfirmSheet
        visible={deleting}
        title={t("notebook.deleteCollection")}
        description={t("notebook.deleteCollectionHint")}
        confirmLabel={t("notebook.deleteCollection")}
        pending={pending}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          if (!current) return
          setPending(true)
          setError(null)
          deleteCollection({ collectionId: current.id })
            .then(() => setFilter("all"))
            .catch((caught: unknown) => setError(t(appErrorKey(caught))))
            .finally(() => {
              setPending(false)
              setDeleting(false)
            })
        }}
      />
    </View>
  )
}

export default function NotebookScreen() {
  return (
    <>
      <Stack.Screen options={{ title: t("notebook.title") }} />
      <MemberGate signInTitle={t("notebook.signIn")}>
        <NotebookBody />
      </MemberGate>
    </>
  )
}
