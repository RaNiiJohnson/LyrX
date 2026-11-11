import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import {
  useConvexAuth,
  usePaginatedQuery,
  useQuery,
  useMutation,
} from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { ConfirmSheet } from "@/components/confirm-sheet"
import { Button, TextField } from "@/components/form"
import { Chip, Sheet } from "@/components/kit"
import { Heading, Loading, Message } from "@/components/ui"
import { appErrorKey } from "@/lib/errors"
import { currentLocale, t } from "@/lib/i18n"
import { fonts, radius, space, useTheme } from "@/lib/theme"

export type SongSourceId = Id<"songs"> | Id<"communityContributions">

const MAX_COMMENT = 500
const MAX_REPORT_DETAILS = 1000
const PAGE = 10
const CATEGORIES = ["spam", "abuse", "inappropriate", "other"] as const
type Category = (typeof CATEGORIES)[number]

/** Idempotency key: reused while an attempt is retried, renewed after it succeeds. */
function newRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function commentDate(createdAt: number) {
  return new Intl.DateTimeFormat(currentLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(createdAt)
}

/** Whether the viewer is an active member, the only audience of likes and comments. */
export function useActiveMember() {
  const { isAuthenticated } = useConvexAuth()
  const current = useQuery(api.members.current, isAuthenticated ? {} : "skip")
  return {
    loading: isAuthenticated && current === undefined,
    ready: current?.state === "ready",
    role: current?.state === "ready" ? current.member.role : null,
    handle: current?.state === "ready" ? current.profile.handle : null,
  }
}

function LikeButton({ sourceId }: { sourceId: SongSourceId }) {
  const theme = useTheme()
  const summary = useQuery(api.interactions.read.summary, { sourceId })
  const [error, setError] = useState<string | null>(null)
  const setLike = useMutation(
    api.interactions.write.setLike
  ).withOptimisticUpdate((store, args) => {
    const previous = store.getQuery(api.interactions.read.summary, {
      sourceId: args.sourceId,
    })
    if (!previous) return
    store.setQuery(
      api.interactions.read.summary,
      { sourceId: args.sourceId },
      {
        liked: args.liked,
        count: Math.max(
          0,
          previous.count +
            (previous.liked === args.liked ? 0 : args.liked ? 1 : -1)
        ),
      }
    )
  })
  if (summary === undefined) return <Loading />
  if (summary === null) return <Message title={t("interactions.unavailable")} />
  return (
    <View style={{ gap: space.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: summary.liked }}
        accessibilityLabel={
          summary.liked ? t("interactions.unlike") : t("interactions.like")
        }
        onPress={() => {
          setError(null)
          setLike({ sourceId, liked: !summary.liked }).catch(
            (caught: unknown) => setError(t(appErrorKey(caught)))
          )
        }}
        style={({ pressed }) => ({
          alignSelf: "flex-start",
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          paddingHorizontal: space.md,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: summary.liked ? theme.brand : theme.outline,
          backgroundColor: theme.card,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons
          name={summary.liked ? "heart" : "heart-outline"}
          size={20}
          color={summary.liked ? theme.brand : theme.foreground}
        />
        <Text
          style={{
            color: theme.foreground,
            fontFamily: fonts.sansMedium,
            fontSize: 14,
          }}
        >
          {summary.count === 1
            ? t("interactions.likeCountOne")
            : t("interactions.likeCount", { count: summary.count })}
        </Text>
      </Pressable>
      {error ? <Message title={error} /> : null}
    </View>
  )
}

function Composer({ sourceId }: { sourceId: SongSourceId }) {
  const theme = useTheme()
  const addComment = useMutation(api.interactions.write.addComment)
  const [body, setBody] = useState("")
  const [requestId, setRequestId] = useState(newRequestId)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState(false)
  const blank = body.trim() === ""
  return (
    <View style={{ gap: space.sm }}>
      <TextField
        label={t("interactions.write")}
        placeholder={t("interactions.placeholder")}
        value={body}
        onChangeText={(value) => {
          setBody(value)
          setNotice(false)
        }}
        multiline
        maxLength={MAX_COMMENT}
        autoCapitalize="sentences"
        autoCorrect
        error={error}
      />
      <Text
        style={{
          color: theme.mutedForeground,
          fontFamily: fonts.sans,
          fontSize: 12,
          alignSelf: "flex-end",
        }}
      >
        {body.length} / {MAX_COMMENT}
      </Text>
      {notice ? <Message title={t("interactions.published")} /> : null}
      <Button
        label={pending ? t("interactions.sending") : t("interactions.publish")}
        loading={pending}
        disabled={blank}
        onPress={() => {
          setPending(true)
          setError(null)
          addComment({ sourceId, body, requestId })
            .then(() => {
              setBody("")
              setRequestId(newRequestId())
              setNotice(true)
            })
            .catch((caught: unknown) => setError(t(appErrorKey(caught))))
            .finally(() => setPending(false))
        }}
      />
    </View>
  )
}

type CommentCard = {
  id: Id<"songComments">
  body: string
  createdAt: number
  author: { handle: string; displayName: string }
  isOwn: boolean
  canReport: boolean
}

function ReportSheet({
  comment,
  onClose,
}: {
  comment: CommentCard | null
  onClose: () => void
}) {
  const report = useMutation(api.interactions.write.reportComment)
  const [category, setCategory] = useState<Category>("spam")
  const [details, setDetails] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const close = () => {
    setDetails("")
    setCategory("spam")
    setError(null)
    setSent(false)
    onClose()
  }
  return (
    <Sheet
      visible={comment !== null}
      onClose={close}
      title={t("interactions.reportTitle")}
    >
      {sent ? (
        <>
          <Message title={t("community.reportSent")} />
          <Button variant="outline" label={t("common.close")} onPress={close} />
        </>
      ) : (
        <>
          <Text style={{ fontSize: 15 }} accessibilityRole="header">
            {t("interactions.reportQuestion")}
          </Text>
          <View
            accessibilityLabel={t("interactions.reportCategory")}
            style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
          >
            {CATEGORIES.map((value) => (
              <Chip
                key={value}
                label={t(`interactions.category.${value}`)}
                selected={category === value}
                onPress={() => setCategory(value)}
              />
            ))}
          </View>
          <TextField
            label={`${t("interactions.details")} (${t("interactions.optional")})`}
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={MAX_REPORT_DETAILS}
            autoCapitalize="sentences"
            hint={t("interactions.reportFooter")}
            error={error}
          />
          <Button
            label={t("interactions.sendReport")}
            loading={pending}
            onPress={() => {
              if (!comment) return
              setPending(true)
              setError(null)
              report({
                commentId: comment.id,
                reason: details.trim(),
                category,
              })
                .then(() => setSent(true))
                .catch((caught: unknown) => setError(t(appErrorKey(caught))))
                .finally(() => setPending(false))
            }}
          />
        </>
      )}
    </Sheet>
  )
}

function CommentItem({
  comment,
  onReport,
  onDelete,
}: {
  comment: CommentCard
  onReport: () => void
  onDelete: () => void
}) {
  const theme = useTheme()
  return (
    <View
      style={{
        gap: space.xs,
        padding: space.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.outline,
        backgroundColor: theme.card,
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: theme.foreground,
            fontFamily: fonts.sansSemibold,
            fontSize: 14,
          }}
        >
          {comment.isOwn ? t("interactions.you") : comment.author.displayName}
          <Text
            style={{ color: theme.mutedForeground, fontFamily: fonts.sans }}
          >
            {"  "}@{comment.author.handle} · {commentDate(comment.createdAt)}
          </Text>
        </Text>
        {comment.isOwn || comment.canReport ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              comment.isOwn
                ? t("interactions.delete")
                : t("interactions.report")
            }
            hitSlop={8}
            onPress={comment.isOwn ? onDelete : onReport}
            style={{
              minWidth: 44,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={comment.isOwn ? "trash-outline" : "flag-outline"}
              size={18}
              color={theme.mutedForeground}
            />
          </Pressable>
        ) : null}
      </View>
      <Text
        selectable
        style={{
          color: theme.foreground,
          fontFamily: fonts.sans,
          fontSize: 15,
          lineHeight: 22,
        }}
      >
        {comment.body}
      </Text>
    </View>
  )
}

function Comments({ sourceId }: { sourceId: SongSourceId }) {
  const comments = usePaginatedQuery(
    api.interactions.read.comments,
    { sourceId },
    { initialNumItems: PAGE }
  )
  const remove = useMutation(api.interactions.write.deleteComment)
  const [reporting, setReporting] = useState<CommentCard | null>(null)
  const [deleting, setDeleting] = useState<CommentCard | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <View style={{ gap: space.sm }}>
      <Heading>{t("interactions.comments")}</Heading>
      {error ? <Message title={error} /> : null}
      {comments.status === "LoadingFirstPage" ? (
        <Loading />
      ) : comments.results.length === 0 ? (
        <Text style={{ fontSize: 15 }}>{t("interactions.empty")}</Text>
      ) : (
        comments.results.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReport={() => setReporting(comment)}
            onDelete={() => setDeleting(comment)}
          />
        ))
      )}
      {comments.status === "CanLoadMore" ? (
        <Button
          variant="outline"
          label={t("community.loadMore")}
          onPress={() => comments.loadMore(PAGE)}
        />
      ) : null}
      <ReportSheet comment={reporting} onClose={() => setReporting(null)} />
      <ConfirmSheet
        visible={deleting !== null}
        title={t("interactions.delete")}
        description={t("interactions.deleteHint")}
        confirmLabel={t("interactions.delete")}
        pending={pending}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          setPending(true)
          setError(null)
          remove({ commentId: deleting.id })
            .catch((caught: unknown) => setError(t(appErrorKey(caught))))
            .finally(() => {
              setPending(false)
              setDeleting(null)
            })
        }}
      />
    </View>
  )
}

/** Likes and comments for a public song or community contribution; members only, like the backend. */
export function SongInteractions({ sourceId }: { sourceId: SongSourceId }) {
  const router = useRouter()
  const { loading, ready } = useActiveMember()
  if (loading) return <Loading />
  if (!ready)
    return (
      <Message
        title={t("interactions.title")}
        description={t("interactions.signInHint")}
        action={{
          label: t("interactions.signIn"),
          onPress: () => router.push("/account"),
        }}
      />
    )
  return (
    <View style={{ gap: space.lg }}>
      <LikeButton sourceId={sourceId} />
      <Composer sourceId={sourceId} />
      <Comments sourceId={sourceId} />
    </View>
  )
}
