import { useLyricSelection } from "@/lib/use-lyric-selection"
import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { Download, ImageDown } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { useConvex, useQuery } from "convex/react"
import { useQuery as useCachedQuery } from "convex-helpers/react/cache"
import type { FunctionArgs, FunctionReturnType } from "convex/server"
import { api } from "@lyrx/backend/convex/_generated/api"
import { MAX_SHARE_TEXT_LENGTH, validShareRange } from "@lyrx/shared"
import { Button } from "@lyrx/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@lyrx/ui/components/dialog"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@lyrx/ui/components/field"
import { Checkbox } from "@lyrx/ui/components/checkbox"
import { Textarea } from "@lyrx/ui/components/textarea"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { Alert, AlertDescription } from "@lyrx/ui/components/alert"
import { Empty, EmptyHeader, EmptyDescription } from "@lyrx/ui/components/empty"
import { useLocale } from "@/app/locale-provider"
import { useAppForm } from "@/lib/app-form"
import { getErrorMessage, localizedUiError } from "@/lib/errors"
import { CardRenderError, renderCard, cardBlob } from "./card-renderer"
import { loadCardFonts } from "./card-fonts"
import { downloadPng, sameCard } from "./download-card"

export type SharingTarget = FunctionArgs<typeof api.sharing.context>["target"]
type ReadyContext = Extract<
  NonNullable<FunctionReturnType<typeof api.sharing.context>>,
  { state: "ready" }
>
type PreparedCard = NonNullable<FunctionReturnType<typeof api.sharing.prepare>>

export function CreateSharingCard({ target }: { target: SharingTarget }) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  return (
    <>
      <Button variant="outline" ref={trigger} onClick={() => setOpen(true)}>
        <ImageDown data-icon="inline-start" />
        {t("sharing.create")}
      </Button>
      {open && (
        <SharingDialog
          target={target}
          onClose={() => setOpen(false)}
          onReturnFocus={() => trigger.current?.focus()}
        />
      )}
    </>
  )
}

export function SharingDialog({
  target,
  onClose,
  onReturnFocus,
}: {
  target: SharingTarget
  onClose: () => void
  onReturnFocus: () => void
}) {
  const { t } = useLocale()
  const current = useCachedQuery(api.members.current, {})
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className="top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col rounded-none sm:top-1/2 sm:left-1/2 sm:h-[min(92dvh,50rem)] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onReturnFocus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("sharing.create")}</DialogTitle>
          <DialogDescription>{t("sharing.description")}</DialogDescription>
        </DialogHeader>
        {current === undefined ? (
          <Skeleton className="h-40 w-full" />
        ) : current.state !== "ready" ? (
          <div className="flex flex-col gap-4">
            <p>{t("sharing.signInHint")}</p>
            <Button asChild>
              <Link to="/account">{t("notebook.signIn")}</Link>
            </Button>
          </div>
        ) : (
          <SharingContext target={target} onClose={onClose} />
        )}
        {(current === undefined || current.state !== "ready") && (
          <DialogClose asChild>
            <Button variant="ghost" className="shrink-0">
              {t("notebook.close")}
            </Button>
          </DialogClose>
        )}
      </DialogContent>
    </Dialog>
  )
}
function SharingContext({
  target,
  onClose,
}: {
  target: SharingTarget
  onClose: () => void
}) {
  const { t } = useLocale()
  const context = useQuery(api.sharing.context, { target })
  if (context === undefined) return <Skeleton className="h-72 w-full" />
  if (!context || context.state === "changed")
    return (
      <Alert>
        <AlertDescription>
          <p>{t(context ? "sharing.changed" : "sharing.unavailable")}</p>
          {context && (
            <Button asChild variant="link">
              <Link to={context.href} onClick={onClose}>
                {t("sharing.selectCurrent")}
              </Link>
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  return <SharingForm key={context.version} context={context} target={target} />
}

function SharingForm({
  context,
  target,
}: {
  context: ReadyContext
  target: SharingTarget
}) {
  const { t } = useLocale(),
    id = useId(),
    convex = useConvex()
  const [range, setRange] = useState({
    start: 0,
    end: target.kind === "passage" ? context.text.length : 0,
  })
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const active = useRef(true),
    pending = useRef(false)
  const latest = useRef("")
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  const form = useAppForm({
    defaultValues: { withArtwork: context.hasArtwork },
  })
  // The subscribed field owns rendering and download arguments; no query subscription
  // is retained for old selection ranges after the dialog closes.
  return (
    <form
      className="flex min-h-0 flex-1 flex-col gap-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <form.AppForm>
        <form.Subscribe selector={(state) => state.values.withArtwork}>
          {(withArtwork) => {
            const input = {
              target,
              start: range.start,
              end: range.end,
              version: context.version,
              withArtwork: withArtwork && context.hasArtwork,
            }
            const inputKey = JSON.stringify(input)
            latest.current = inputKey
            return (
              <SharingPreview
                input={input}
                context={context}
                range={range}
                setRange={setRange}
                formField={
                  <form.Field name="withArtwork">
                    {(field) => (
                      <Field
                        orientation="horizontal"
                        data-disabled={!context.hasArtwork || undefined}
                      >
                        <Checkbox
                          id={`${id}-artwork`}
                          checked={field.state.value && context.hasArtwork}
                          disabled={!context.hasArtwork}
                          onCheckedChange={(checked) =>
                            field.handleChange(checked === true)
                          }
                        />
                        <FieldLabel htmlFor={`${id}-artwork`}>
                          {t("sharing.artwork")}
                        </FieldLabel>
                      </Field>
                    )}
                  </form.Field>
                }
                error={error}
                downloading={downloading}
                onDownload={async (prepared, canvas) => {
                  if (pending.current) return
                  pending.current = true
                  setDownloading(true)
                  setError(null)
                  try {
                    const initial = await convex.query(
                      api.sharing.prepare,
                      input
                    )
                    if (!sameCard(initial, prepared))
                      throw localizedUiError(t("sharing.unavailable"))
                    const blob = await cardBlob(canvas)
                    const final = await convex.query(api.sharing.prepare, input)
                    if (!sameCard(final, prepared))
                      throw localizedUiError(t("sharing.unavailable"))
                    if (!active.current || latest.current !== inputKey) return
                    downloadPng(blob, prepared.title)
                  } catch (caught) {
                    if (active.current)
                      setError(
                        caught instanceof CardRenderError
                          ? t("sharing.renderError")
                          : getErrorMessage(caught, t)
                      )
                  } finally {
                    pending.current = false
                    if (active.current) setDownloading(false)
                  }
                }}
              />
            )
          }}
        </form.Subscribe>
      </form.AppForm>
    </form>
  )
}

function SharingPreview({
  input,
  context,
  range,
  setRange,
  formField,
  onDownload,
  error,
  downloading,
}: {
  input: FunctionArgs<typeof api.sharing.prepare>
  context: ReadyContext
  range: { start: number; end: number }
  setRange: (range: { start: number; end: number }) => void
  formField: ReactNode
  onDownload: (card: PreparedCard, canvas: HTMLCanvasElement) => Promise<void>
  error: string | null
  downloading: boolean
}) {
  const { t } = useLocale(),
    id = useId()
  const selectionRef = useLyricSelection(context.text, setRange)
  useEffect(() => {
    void loadCardFonts()
  }, [])
  const valid = validShareRange(context.text, range.start, range.end)
  const prepared = useQuery(api.sharing.prepare, valid ? input : "skip")
  const [preview, setPreview] = useState<{
    data: PreparedCard
    canvas: HTMLCanvasElement
  } | null>(null)
  const [renderError, setRenderError] = useState<
    CardRenderError["code"] | null
  >(null)
  useEffect(() => {
    const controller = new AbortController()
    // Keep the previous card on screen until the next one is ready (no flash).
    setRenderError(null)
    if (prepared && valid) {
      void renderCard(prepared, controller.signal)
        .then((canvas) => {
          if (!controller.signal.aborted) setPreview({ data: prepared, canvas })
        })
        .catch((caught: unknown) => {
          if (!controller.signal.aborted)
            setRenderError(
              caught instanceof CardRenderError ? caught.code : "render"
            )
        })
    }
    return () => controller.abort()
  }, [prepared, valid])
  const visible = valid && preview?.data === prepared ? preview : null
  const stale =
    valid && !visible && !renderError && prepared !== null ? preview : null
  const shown = visible ?? stale
  return (
    <>
      <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto lg:grid-cols-2">
        <figure className="mx-auto w-full max-w-48 lg:max-w-72 [&_canvas]:rounded-xl [&_canvas]:shadow-lg [&_canvas]:ring-1 [&_canvas]:ring-foreground/10">
          {shown ? (
            <div
              className={
                visible
                  ? "transition-opacity duration-200"
                  : "opacity-60 transition-opacity duration-200"
              }
              aria-busy={!visible}
            >
              <CanvasPreview
                canvas={shown.canvas}
                label={`${shown.data.text} — ${shown.data.title} · ${shown.data.primaryArtist} · Lyr'X`}
              />
            </div>
          ) : valid && prepared === undefined ? (
            <Skeleton className="aspect-[9/16] w-full" />
          ) : (
            <Empty className="aspect-[9/16] border">
              <EmptyHeader>
                <EmptyDescription>
                  {t(
                    !valid
                      ? "sharing.selectHelp"
                      : renderError === "text"
                        ? "sharing.doesNotFit"
                        : renderError === "artwork"
                          ? "sharing.artworkError"
                          : renderError === "render"
                            ? "sharing.renderError"
                            : prepared === null
                              ? "sharing.unavailable"
                              : "sharing.rendering"
                  )}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          <figcaption className="mt-3 text-center text-xs text-muted-foreground">
            {t("sharing.dimensions")}
          </figcaption>
        </figure>
        <FieldGroup className="min-w-0">
          <Field>
            <FieldLabel htmlFor={`${id}-text`}>
              {t("sharing.selectLabel")}
            </FieldLabel>
            <Textarea
              id={`${id}-text`}
              readOnly
              rows={5}
              value={context.text}
              className="min-h-36 text-base leading-7 italic"
              style={{ fontFamily: '"Fraunces Variable", Georgia, serif' }}
              ref={selectionRef}
            />
            <FieldDescription>
              {t("sharing.limits", {
                count: range.end - range.start,
                max: MAX_SHARE_TEXT_LENGTH,
              })}
            </FieldDescription>
          </Field>
          {formField}
          {!context.hasArtwork && (
            <p className="text-sm text-muted-foreground">
              {t("sharing.noArtwork")}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {t("sharing.downloadHint")}
          </p>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </FieldGroup>
      </div>
      <div className="flex shrink-0 flex-col-reverse gap-2 border-t pt-4 pb-[env(safe-area-inset-bottom)] sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            {t("notebook.close")}
          </Button>
        </DialogClose>
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          disabled={!visible || downloading}
          onClick={() => {
            if (visible) void onDownload(visible.data, visible.canvas)
          }}
        >
          <Download data-icon="inline-start" />
          {t(downloading ? "sharing.downloading" : "sharing.download")}
        </Button>
      </div>
    </>
  )
}
function CanvasPreview({
  canvas,
  label,
}: {
  canvas: HTMLCanvasElement
  label: string
}) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    canvas.style.width = "100%"
    canvas.style.height = "auto"
    canvas.style.display = "block"
    canvas.setAttribute("role", "img")
    canvas.setAttribute("aria-label", label)
    const element = host.current
    element?.replaceChildren(canvas)
    return () => element?.replaceChildren()
  }, [canvas, label])
  return <div ref={host} />
}
