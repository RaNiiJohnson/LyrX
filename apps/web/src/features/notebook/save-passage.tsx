import { useLyricSelection } from "@/lib/use-lyric-selection"
import { useId, useRef, useState } from "react"
import { Bookmark, Plus } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Button } from "@lyrx/ui/components/button"
import { Alert, AlertDescription } from "@lyrx/ui/components/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogTrigger,
} from "@lyrx/ui/components/dialog"
import { Field, FieldGroup, FieldLabel } from "@lyrx/ui/components/field"
import { Textarea } from "@lyrx/ui/components/textarea"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { toast } from "@lyrx/ui/lib/toast"
import { useLocale } from "@/app/locale-provider"
import { useAppForm } from "@/lib/app-form"
import { getErrorMessage } from "@/lib/errors"
import { CollectionSelect, collectionId } from "./collection-select"
import { CollectionDialog } from "./collection-dialog"

type SourceId = Id<"songs"> | Id<"communityContributions">
export function SavePassage({
  sourceId,
  lyricsText,
}: {
  sourceId: SourceId
  lyricsText: string
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const current = useQuery(api.members.current, {})
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Bookmark data-icon="inline-start" />
          {t("notebook.savePassage")}
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col rounded-none p-5 sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90dvh] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
      >
        <DialogHeader>
          <DialogTitle>{t("notebook.selectTitle")}</DialogTitle>
          <DialogDescription>{t("notebook.selectHelp")}</DialogDescription>
        </DialogHeader>
        {current === undefined ? (
          <Skeleton className="h-32 w-full" />
        ) : current.state === "ready" ? (
          <PassageForm
            key={`${sourceId}:${lyricsText}`}
            sourceId={sourceId}
            lyricsText={lyricsText}
            onSaved={() => setOpen(false)}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <p>{t("notebook.signInSave")}</p>
            <Button asChild>
              <Link to="/account">{t("notebook.signIn")}</Link>
            </Button>
          </div>
        )}
        <DialogClose asChild>
          <Button variant="ghost" className="shrink-0">
            {t("notebook.close")}
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

function PassageForm({
  sourceId,
  lyricsText,
  onSaved,
}: {
  sourceId: SourceId
  lyricsText: string
  onSaved: () => void
}) {
  const { t } = useLocale(),
    id = useId()
  const collections = useQuery(api.notebook.read.collections, {})
  const save = useMutation(api.notebook.write.save)
  const [creating, setCreating] = useState(false),
    [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState({ start: 0, end: 0 })
  const selectionRef = useLyricSelection(lyricsText, setRange)
  const pending = useRef(false)
  const collectionTrigger = useRef<HTMLButtonElement>(null)
  const text = lyricsText.slice(range.start, range.end)
  const valid = text.trim().length > 0 && text.length <= 1000
  const form = useAppForm({
    defaultValues: { collection: "default" },
    onSubmit: async ({ value }) => {
      if (!valid || pending.current) return
      pending.current = true
      setError(null)
      try {
        await save({
          sourceId,
          sourceText: lyricsText,
          start: range.start,
          end: range.end,
          collectionId: collectionId(value.collection),
        })
        onSaved()
        toast.success(t("notebook.saved"), {
          description: (
            <Link to="/notebook" className="underline">
              {t("notebook.view")}
            </Link>
          ),
        })
      } catch (caught) {
        setError(getErrorMessage(caught, t))
      } finally {
        pending.current = false
      }
    },
  })
  return (
    <>
      <form
        className="flex min-h-0 flex-1 flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <form.AppForm>
          <div className="min-h-0 flex-1 overflow-y-auto sm:max-h-[60dvh]">
            <FieldGroup>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Field>
                <FieldLabel htmlFor={`${id}-lyrics`}>
                  {t("notebook.lyrics")}
                </FieldLabel>
                <Textarea
                  id={`${id}-lyrics`}
                  readOnly
                  value={lyricsText}
                  rows={8}
                  className="min-h-40 leading-7"
                  aria-describedby={`${id}-count`}
                  ref={selectionRef}
                />
              </Field>
              <Field>
                <FieldLabel>{t("notebook.preview")}</FieldLabel>
                <blockquote className="max-h-36 overflow-y-auto wrap-anywhere whitespace-pre-wrap">
                  {text || t("notebook.noSelection")}
                </blockquote>
                <p
                  id={`${id}-count`}
                  aria-live="polite"
                  className="text-sm text-muted-foreground"
                >
                  {t("notebook.selectionCount", { count: text.length })}
                </p>
              </Field>
              <form.Field name="collection">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={`${id}-collection`}>
                      {t("notebook.collection")}
                    </FieldLabel>
                    {collections ? (
                      <CollectionSelect
                        id={`${id}-collection`}
                        collections={collections}
                        value={field.state.value}
                        onChange={field.handleChange}
                      />
                    ) : (
                      <Skeleton className="h-11 w-full" />
                    )}
                  </Field>
                )}
              </form.Field>
              <Button
                variant="ghost"
                type="button"
                ref={collectionTrigger}
                onClick={() => setCreating(true)}
              >
                <Plus data-icon="inline-start" />
                {t("notebook.newCollection")}
              </Button>
            </FieldGroup>
          </div>
          <div className="shrink-0 pt-2 pb-[env(safe-area-inset-bottom)]">
            <form.SubmitButton disabled={!valid || collections === undefined}>
              {t("notebook.save")}
            </form.SubmitButton>
          </div>
        </form.AppForm>
      </form>
      {creating && (
        <CollectionDialog
          onClose={() => setCreating(false)}
          onReturnFocus={() => collectionTrigger.current?.focus()}
          onCreated={(createdId) => form.setFieldValue("collection", createdId)}
        />
      )}
    </>
  )
}
