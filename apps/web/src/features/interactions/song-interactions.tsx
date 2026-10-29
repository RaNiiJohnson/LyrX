import { useLocale } from "@/app/locale-provider"
import { LoadMore } from "@/features/community/community-list"
import { getErrorMessage } from "@/lib/errors"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@lyrx/ui/components/alert-dialog"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lyrx/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyrx/ui/components/dropdown-menu"
import { Empty, EmptyHeader, EmptyTitle } from "@lyrx/ui/components/empty"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { toast } from "@lyrx/ui/lib/toast"
import { Link } from "@tanstack/react-router"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import {
  Flag,
  Heart,
  MessageSquare,
  MoreHorizontal,
  Trash2,
} from "lucide-react"
import {
  startTransition,
  useEffect,
  useId,
  useOptimistic,
  useRef,
  useState,
} from "react"
import { CommentAvatar } from "./comment-avatar"
import { CommentReportForm } from "./comment-report-form"
import { CommentComposer } from "./interaction-form"

type SourceId = Id<"songs"> | Id<"communityContributions">
type Comment = FunctionReturnType<
  typeof api.interactions.read.comments
>["page"][number]
type PendingComment = Omit<Comment, "id"> & {
  id: string
  pending: true
  knownIds: ReadonlySet<string>
}
type CommentPage = {
  results: Array<Comment | PendingComment>
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted"
  loadMore: (count: number) => void
}

export function SongInteractions({ sourceId }: { sourceId: SourceId }) {
  return <SourceInteractions key={sourceId} sourceId={sourceId} />
}

function SourceInteractions({ sourceId }: { sourceId: SourceId }) {
  const { t } = useLocale(),
    id = useId()
  const current = useQuery(api.members.current, {})
  const summary = useQuery(api.interactions.read.summary, { sourceId })
  const comments = usePaginatedQuery(
    api.interactions.read.comments,
    { sourceId },
    { initialNumItems: 12 }
  )
  const [likeIntent, updateLike] = useOptimistic<boolean | null>(null)
  const optimisticSummary =
    summary && likeIntent !== null
      ? {
          ...summary,
          liked: likeIntent,
          count: summary.count + Number(likeIntent) - Number(summary.liked),
        }
      : summary
  const [optimisticComment, insertComment] =
    useOptimistic<PendingComment | null>(null)
  const ready = current?.state === "ready"
  // A live query can catch up while the Action is pending. Prefer a new
  // canonical own row with this text over displaying the same preview twice.
  const confirmed =
    optimisticComment &&
    comments.results.some(
      (row) =>
        !optimisticComment.knownIds.has(row.id) &&
        row.isOwn &&
        row.author.handle === optimisticComment.author.handle &&
        row.body === optimisticComment.body
    )
  const displayedComments = {
    ...comments,
    results:
      optimisticComment &&
      !confirmed &&
      ready &&
      summary &&
      optimisticComment.author.handle === current.profile.handle
        ? [...comments.results, optimisticComment]
        : comments.results,
  }
  const ownProfile = useQuery(
    api.members.publicByHandle,
    ready ? { handle: current.profile.handle } : "skip"
  )
  const setLike = useMutation(api.interactions.write.setLike),
    addComment = useMutation(api.interactions.write.addComment)
  const [busy, setBusy] = useState(false),
    pending = useRef(false)
  const request = useRef<{ id: string; body: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const count = `${displayedComments.results.length}${comments.status === "Exhausted" ? "" : "+"}`
  function like() {
    if (!summary || pending.current) return
    pending.current = true
    setBusy(true)
    setError(null)
    startTransition(async () => {
      updateLike(!summary.liked)
      try {
        await setLike({ sourceId, liked: !summary.liked })
      } catch (caught) {
        setError(getErrorMessage(caught, t))
      } finally {
        startTransition(() => updateLike(null))
        pending.current = false
        setBusy(false)
      }
    })
  }
  return (
    <section
      className="flex w-full max-w-[45rem] flex-col gap-8"
      aria-label={t("interactions.title")}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        {summary === undefined ? (
          <Skeleton className="size-9 rounded-full" />
        ) : summary ? (
          ready ? (
            <Button
              type="button"
              variant="reaction"
              className="h-11 gap-2 rounded-full px-4"
              aria-label={t(
                optimisticSummary?.liked
                  ? "interactions.unlike"
                  : "interactions.like"
              )}
              aria-pressed={optimisticSummary?.liked}
              disabled={busy}
              onClick={() => void like()}
            >
              <Heart
                data-icon="inline-start"
                fill={optimisticSummary?.liked ? "currentColor" : "none"}
              />
              <span aria-live="polite">{optimisticSummary?.count}</span>
            </Button>
          ) : current === undefined ? (
            <Skeleton className="size-9 rounded-full" />
          ) : (
            <Button
              asChild
              variant="ghost"
              className="h-11 gap-2 rounded-full px-4"
            >
              <Link to="/account" aria-label={t("interactions.signIn")}>
                <Heart data-icon="inline-start" />
                {optimisticSummary?.count}
              </Link>
            </Button>
          )
        ) : (
          <p>{t("interactions.unavailable")}</p>
        )}
        {comments.status === "LoadingFirstPage" ? (
          <Skeleton className="size-9 rounded-full" />
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="h-11 gap-2 rounded-full px-4"
            aria-label={t("interactions.showComments")}
            aria-controls={id}
            title={t("interactions.loadedCount", {
              count: displayedComments.results.length,
            })}
            onClick={() => {
              heading.current?.scrollIntoView({
                block: "start",
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? "instant"
                  : "smooth",
              })
              heading.current?.focus({ preventScroll: true })
            }}
          >
            <MessageSquare data-icon="inline-start" />
            <span>{count}</span>
          </Button>
        )}
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{t("error.unexpected")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-5">
        <h2
          id={id}
          ref={heading}
          tabIndex={-1}
          className="flex scroll-mt-28 items-center gap-3 text-xl font-semibold outline-none"
        >
          {t("interactions.comments")}
        </h2>
        {ready && summary ? (
          <CommentComposer
            name={current.profile.displayName || current.profile.handle}
            avatarUrl={ownProfile?.avatarUrl}
            onSubmit={(body) =>
              new Promise<void>((resolve, reject) => {
                if (!request.current || request.current.body !== body)
                  request.current = { id: crypto.randomUUID(), body }
                const requestId = request.current.id
                const comment: PendingComment = {
                  id: `pending:${requestId}`,
                  pending: true,
                  knownIds: new Set(comments.results.map((row) => row.id)),
                  body: body.trim(),
                  createdAt: Date.now(),
                  author: {
                    handle: current.profile.handle,
                    displayName:
                      current.profile.displayName || current.profile.handle,
                    avatarUrl: ownProfile?.avatarUrl ?? null,
                    role: current.member.role,
                  },
                  isOwn: true,
                  canReport: false,
                }
                // TanStack Form awaits this Promise; React owns the optimistic
                // overlay only for the lifetime of this async Action.
                startTransition(async () => {
                  insertComment(comment)
                  try {
                    await addComment({ sourceId, body, requestId })
                    request.current = null
                    toast.success(t("interactions.published"))
                    resolve()
                  } catch (caught) {
                    reject(caught)
                  } finally {
                    startTransition(() => insertComment(null))
                  }
                })
              })
            }
          />
        ) : !ready && current !== undefined ? (
          <p className="text-sm text-muted-foreground">
            {t("interactions.signInHint")}
          </p>
        ) : null}
      </div>
      <CommentList key={sourceId} comments={displayedComments} />
    </section>
  )
}
function relativeTime(createdAt: number, now: number, locale: string) {
  const seconds = Math.round((createdAt - now) / 1000),
    absolute = Math.abs(seconds)
  const [value, unit] =
    absolute < 60
      ? ([seconds, "second"] as const)
      : absolute < 3600
        ? ([Math.round(seconds / 60), "minute"] as const)
        : absolute < 86400
          ? ([Math.round(seconds / 3600), "hour"] as const)
          : ([Math.round(seconds / 86400), "day"] as const)
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    value,
    unit
  )
}
function CommentList({ comments }: { comments: CommentPage }) {
  const { t, locale } = useLocale()
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const actionTrigger = useRef<HTMLButtonElement | null>(null),
    listFocus = useRef<HTMLDivElement>(null)
  const [reported, setReported] = useState<Comment | null>(null),
    [deleteId, setDeleteId] = useState<Id<"songComments"> | null>(null)
  const [busy, setBusy] = useState(false),
    deleting = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const report = useMutation(api.interactions.write.reportComment),
    remove = useMutation(api.interactions.write.deleteComment)
  function restoreFocus(event: Event) {
    event.preventDefault()
    if (actionTrigger.current?.isConnected) actionTrigger.current.focus()
    else listFocus.current?.focus()
  }
  return (
    <div
      ref={listFocus}
      tabIndex={-1}
      className="flex flex-col gap-4 outline-none"
    >
      {comments.status === "LoadingFirstPage" && !comments.results.length ? (
        <Skeleton className="h-28 w-full" />
      ) : comments.results.length ? (
        <ul className="flex flex-col">
          {comments.results.map((comment) => (
            <li
              key={comment.id}
              aria-busy={"pending" in comment || undefined}
              className="flex items-start gap-3 border-t py-5"
            >
              <CommentAvatar
                name={comment.author.displayName}
                src={comment.author.avatarUrl}
              />
              <div className="min-w-0 flex-1">
                <div className="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1 pr-2">
                  <Link
                    to="/profiles/$handle"
                    params={{ handle: comment.author.handle }}
                    className="max-w-full text-sm font-semibold wrap-anywhere hover:underline"
                  >
                    {comment.author.displayName}
                  </Link>
                  {comment.isOwn ? (
                    <Badge
                      variant="secondary"
                      className="rounded-full px-2 text-[10px]"
                    >
                      {t("interactions.you")}
                    </Badge>
                  ) : comment.author.role === "artist" ? (
                    <Badge
                      variant="secondary"
                      className="rounded-full px-2 text-[10px]"
                    >
                      {t("discovery.sourceArtist")}
                    </Badge>
                  ) : null}
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={new Date(comment.createdAt).toISOString()}
                    title={new Date(comment.createdAt).toLocaleString(locale)}
                  >
                    {"pending" in comment
                      ? t("interactions.sending")
                      : relativeTime(comment.createdAt, now, locale)}
                  </time>
                </div>
                <p className="mt-1 text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
                  {comment.body}
                </p>
              </div>
              {!("pending" in comment) &&
              (comment.isOwn || comment.canReport) ? (
                <CommentActions
                  own={comment.isOwn}
                  onSelect={(trigger) => {
                    actionTrigger.current = trigger
                    if (comment.isOwn) {
                      setError(null)
                      setDeleteId(comment.id)
                    } else setReported(comment)
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("interactions.empty")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
      <LoadMore
        status={comments.status}
        loadMore={() => comments.loadMore(12)}
      />
      <Dialog
        open={reported !== null}
        onOpenChange={(open) => {
          if (!busy && !open) setReported(null)
        }}
      >
        <DialogContent
          showCloseButton={false}
          onCloseAutoFocus={restoreFocus}
          className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto rounded-2xl p-5 sm:max-w-[34rem] sm:p-6"
        >
          <DialogHeader>
            <DialogTitle className="text-xl">
              {t("interactions.reportTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("interactions.reportQuestion")}
            </DialogDescription>
          </DialogHeader>
          {reported ? (
            <>
              <blockquote className="line-clamp-3 border-l-3 pl-3 text-sm leading-relaxed text-muted-foreground italic">
                {reported.body.slice(0, 220)}
                {reported.body.length > 220 ? "…" : ""}
              </blockquote>
              <CommentReportForm
                key={reported.id}
                close={() => setReported(null)}
                onBusy={setBusy}
                onSubmit={async (category, reason) => {
                  await report({ commentId: reported.id, category, reason })
                  toast.success(t("community.reportSent"))
                  setReported(null)
                }}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!deleting.current && !open) setDeleteId(null)
        }}
      >
        <AlertDialogContent onCloseAutoFocus={restoreFocus}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("interactions.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("interactions.deleteHint")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault()
                if (!deleteId || deleting.current) return
                deleting.current = true
                setBusy(true)
                setError(null)
                void remove({ commentId: deleteId })
                  .then(() => {
                    setDeleteId(null)
                    toast.success(t("interactions.deleted"))
                  })
                  .catch((caught) => setError(getErrorMessage(caught, t)))
                  .finally(() => {
                    deleting.current = false
                    setBusy(false)
                  })
              }}
            >
              {t("interactions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
function CommentActions({
  own,
  onSelect,
}: {
  own: boolean
  onSelect: (trigger: HTMLButtonElement | null) => void
}) {
  const { t } = useLocale(),
    trigger = useRef<HTMLButtonElement>(null)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={trigger}
          size="icon"
          variant="ghost"
          className="size-9 shrink-0"
          aria-label={t("interactions.options")}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44 rounded-xl p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant={own ? "destructive" : "default"}
            onSelect={() => onSelect(trigger.current)}
            className="gap-2 rounded-lg px-3 py-3"
          >
            {own ? <Trash2 /> : <Flag />}
            {t(own ? "interactions.delete" : "interactions.report")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
