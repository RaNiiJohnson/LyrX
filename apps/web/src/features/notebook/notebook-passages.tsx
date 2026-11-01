import { SharingDialog } from "@/features/sharing/sharing-card"
import { useId, useRef, useState } from "react"
import { MoreHorizontal, Bookmark } from "lucide-react"
import { useMutation } from "convex/react"
import { usePaginatedQuery } from "convex-helpers/react/cache"
import type { FunctionReturnType } from "convex/server"
import { Link } from "@tanstack/react-router"
import { api } from "@lyrx/backend/convex/_generated/api"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@lyrx/ui/components/card"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { Alert, AlertDescription } from "@lyrx/ui/components/alert"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@lyrx/ui/components/empty"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@lyrx/ui/components/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@lyrx/ui/components/dialog"
import { Field, FieldGroup, FieldLabel } from "@lyrx/ui/components/field"
import { useLocale } from "@/app/locale-provider"
import { LoadMore } from "@/features/community/community-list"
import { useAppForm } from "@/lib/app-form"
import { getErrorMessage } from "@/lib/errors"
import {
  CollectionSelect,
  collectionId,
  collectionValue,
  type Collection,
} from "./collection-select"
import { NotebookConfirm } from "./notebook-confirm"

type Passage = FunctionReturnType<
  typeof api.notebook.read.passages
>["page"][number]
export function NotebookPassages({
  filter,
  collections,
}: {
  filter: string
  collections: Array<Collection>
}) {
  const { t } = useLocale()
  const page = usePaginatedQuery(
    api.notebook.read.passages,
    filter === "all" ? {} : { collectionId: collectionId(filter) },
    { initialNumItems: 12 }
  )
  return (
    <section
      className="flex min-w-0 flex-col gap-6"
      aria-label={t("notebook.title")}
    >
      {page.status === "LoadingFirstPage" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {[0, 1].map((n) => (
            <Skeleton key={n} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : page.results.length ? (
        <ul className="grid items-start gap-5 xl:grid-cols-2">
          {page.results.map((row) => (
            <li key={row.id} className="min-w-0">
              <PassageCard passage={row} collections={collections} />
            </li>
          ))}
        </ul>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bookmark />
            </EmptyMedia>
            <EmptyTitle>
              {t(
                filter === "all" ? "notebook.empty" : "notebook.emptyCollection"
              )}
            </EmptyTitle>
            <EmptyDescription>
              {t(
                filter === "all"
                  ? "notebook.emptyHint"
                  : "notebook.emptyCollectionHint"
              )}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline">
              <Link to="/songs">{t("notebook.discover")}</Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
      <LoadMore status={page.status} loadMore={() => page.loadMore(12)} />
    </section>
  )
}
function PassageCard({
  passage,
  collections,
}: {
  passage: Passage
  collections: Array<Collection>
}) {
  const { t, locale } = useLocale()
  const optionsTrigger = useRef<HTMLButtonElement>(null)
  const [action, setAction] = useState<"remove" | "move" | "share" | null>(null)
  const remove = useMutation(api.notebook.write.remove)
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="wrap-anywhere">
              {passage.source?.title ?? t("notebook.unavailable")}
            </CardTitle>
            <CardDescription className="wrap-anywhere">
              {passage.source?.primaryArtist}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                ref={optionsTrigger}
                aria-label={t("notebook.options")}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  disabled={passage.state === "unavailable"}
                  onSelect={() => setAction("share")}
                >
                  {t("sharing.create")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setAction("move")}>
                  {t("notebook.move")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setAction("remove")}>
                  {t("notebook.remove")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {passage.state === "unavailable" ? (
          <p className="text-sm text-muted-foreground">
            {t("notebook.unavailableHint")}
          </p>
        ) : (
          <>
            {passage.state === "changed" && (
              <>
                <Badge variant="outline" className="h-auto whitespace-normal">
                  {t("notebook.changed")}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {t("notebook.changedHint")}
                </p>
              </>
            )}
            <blockquote className="text-lg leading-8 wrap-anywhere whitespace-pre-wrap">
              {passage.text}
            </blockquote>
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {passage.source?.artworkUrl && (
            <img
              src={passage.source.artworkUrl}
              alt=""
              loading="lazy"
              className="size-10 shrink-0 rounded-md object-cover"
            />
          )}
          <span className="text-xs text-muted-foreground">
            {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
              passage.savedAt
            )}
          </span>
        </div>
        {passage.source && (
          <Button asChild variant="link">
            <Link to={passage.source.href}>{t("notebook.source")}</Link>
          </Button>
        )}
      </CardFooter>
      {action === "share" && (
        <SharingDialog
          target={{ kind: "passage", passageId: passage.id }}
          onClose={() => setAction(null)}
          onReturnFocus={() => optionsTrigger.current?.focus()}
        />
      )}
      {action === "remove" && (
        <NotebookConfirm
          title={t("notebook.remove")}
          description={t("notebook.removeHint")}
          onClose={() => setAction(null)}
          onReturnFocus={() => optionsTrigger.current?.focus()}
          onConfirm={async () => {
            await remove({ passageId: passage.id })
          }}
        />
      )}
      {action === "move" && (
        <MovePassage
          passage={passage}
          collections={collections}
          onClose={() => setAction(null)}
          onReturnFocus={() => optionsTrigger.current?.focus()}
        />
      )}
    </Card>
  )
}
function MovePassage({
  passage,
  collections,
  onClose,
  onReturnFocus,
}: {
  passage: Passage
  collections: Array<Collection>
  onClose: () => void
  onReturnFocus: () => void
}) {
  const { t } = useLocale(),
    id = useId()
  const move = useMutation(api.notebook.write.move)
  const [error, setError] = useState<string | null>(null)
  const form = useAppForm({
    defaultValues: { collection: collectionValue(passage.collectionId) },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        await move({
          passageId: passage.id,
          collectionId: collectionId(value.collection),
        })
        onClose()
      } catch (caught) {
        setError(getErrorMessage(caught, t))
      }
    },
  })
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onReturnFocus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("notebook.move")}</DialogTitle>
          <DialogDescription>{t("notebook.private")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <form.AppForm>
            <FieldGroup>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form.Field name="collection">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={id}>
                      {t("notebook.collection")}
                    </FieldLabel>
                    <CollectionSelect
                      id={id}
                      collections={collections}
                      value={field.state.value}
                      onChange={field.handleChange}
                    />
                  </Field>
                )}
              </form.Field>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    {t("notebook.cancel")}
                  </Button>
                </DialogClose>
                <form.SubmitButton>{t("notebook.save")}</form.SubmitButton>
              </div>
            </FieldGroup>
          </form.AppForm>
        </form>
      </DialogContent>
    </Dialog>
  )
}
