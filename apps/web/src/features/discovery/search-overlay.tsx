import {
  Component,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react"
import { useForm } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { Search, X } from "lucide-react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Button } from "@lyrx/ui/components/button"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@lyrx/ui/components/dialog"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@lyrx/ui/components/field"
import { Input } from "@lyrx/ui/components/input"
import { Badge } from "@lyrx/ui/components/badge"
import { Alert, AlertDescription } from "@lyrx/ui/components/alert"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { useLocale } from "@/app/locale-provider"
import { CoverImage } from "./discovery-cards"

export function SearchOverlay({ prominent = false }: { prominent?: boolean }) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault()
        setOpen(true)
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", openSearch)
    return () => window.removeEventListener("keydown", openSearch)
  }, [])
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={prominent ? "secondary" : "outline"}
          size="default"
          className="h-11 w-11 justify-start rounded-full sm:w-52"
          aria-keyshortcuts="Control+K Meta+K"
          aria-label={t("search.title")}
        >
          <Search data-icon="inline-start" />
          <span className="hidden flex-1 text-left text-sm text-muted-foreground sm:inline">
            {t("search.title")}…
          </span>
          <kbd
            className="hidden rounded border px-1 text-[10px] text-muted-foreground sm:inline"
            aria-hidden="true"
          >
            ⌘ / Ctrl K
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          if (inputRef.current) {
            event.preventDefault()
            inputRef.current.focus()
          }
        }}
        className="flex max-h-[85dvh] flex-col overflow-y-auto motion-reduce:animate-none sm:max-w-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3">
          <DialogTitle>{t("search.title")}</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label={t("common.close")}>
              <X />
            </Button>
          </DialogClose>
        </div>
        <DialogDescription className="sr-only">
          {t("search.help")}
        </DialogDescription>
        <SearchForm inputRef={inputRef} onNavigate={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function SearchForm({
  onNavigate,
  inputRef,
}: {
  onNavigate: () => void
  inputRef: RefObject<HTMLInputElement | null>
}) {
  const { t } = useLocale()
  const [text, setText] = useState("")
  const [draft, setDraft] = useState("")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const composing = useRef(false)
  const [attempt, setAttempt] = useState(0)
  const form = useForm({
    defaultValues: { text: "" },
    onSubmit: ({ value }) => {
      if (timer.current) clearTimeout(timer.current)
      setText(value.text.trim())
      setAttempt((n) => n + 1)
    },
  })
  useEffect(() => {
    if (!draft.trim()) return
    timer.current = setTimeout(() => void form.handleSubmit(), 500)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [draft, form])
  return (
    <>
      <form
        className="shrink-0"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.Field
            name="text"
            validators={{
              onSubmit: ({ value }) => {
                if (timer.current) clearTimeout(timer.current)
                const terms = value.match(/[\p{L}\p{N}]+/gu) ?? []
                return !terms.length ||
                  terms.length > 16 ||
                  terms.some((term) => term.length > 32) ||
                  value.trim().length > 200
                  ? t("search.invalid")
                  : undefined
              },
            }}
          >
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor="public-search" className="sr-only">
                  {t("search.title")}
                </FieldLabel>
                <div className="flex gap-2">
                  <Input
                    className="h-11"
                    ref={inputRef}
                    id="public-search"
                    value={field.state.value}
                    onChange={(event) => {
                      if (timer.current) clearTimeout(timer.current)
                      if (!event.target.value.trim()) setText("")
                      field.handleChange(event.target.value)
                      if (!composing.current) setDraft(event.target.value)
                    }}
                    onCompositionStart={() => {
                      setDraft("")
                      composing.current = true
                      if (timer.current) clearTimeout(timer.current)
                    }}
                    onCompositionEnd={(event) => {
                      composing.current = false
                      setDraft(event.currentTarget.value)
                    }}
                    onBlur={field.handleBlur}
                    maxLength={200}
                    placeholder={t("search.placeholder")}
                    aria-invalid={field.state.meta.errors.length > 0}
                    aria-describedby={
                      field.state.meta.errors.length
                        ? "search-validation"
                        : undefined
                    }
                  />
                  <Button
                    type="submit"
                    size="icon-lg"
                    className="size-11"
                    aria-label={t("search.submit")}
                  >
                    <Search />
                  </Button>
                </div>
                <FieldError id="search-validation">
                  {field.state.meta.errors.join(" ")}
                </FieldError>
              </Field>
            )}
          </form.Field>
        </FieldGroup>
      </form>
      {text ? (
        <SearchErrorBoundary
          key={`${text}:${attempt}`}
          fallback={
            <Alert variant="destructive">
              <AlertDescription>{t("search.error")}</AlertDescription>
            </Alert>
          }
        >
          <SearchResults text={text} onNavigate={onNavigate} />
        </SearchErrorBoundary>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          {t("search.start")}
        </p>
      )}
    </>
  )
}

class SearchErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function SearchResults({
  text,
  onNavigate,
}: {
  text: string
  onNavigate: () => void
}) {
  const { t } = useLocale()
  const [cursors, setCursors] = useState<Array<string | null>>([null])
  const cursor = cursors[cursors.length - 1] ?? null
  const data = useQuery(api.discovery.read.search, {
    text,
    paginationOpts: { cursor, numItems: 12 },
  })
  if (!data)
    return (
      <div role="status" aria-label={t("common.loading")}>
        <Skeleton className="h-32 w-full" />
      </div>
    )
  if (!data.ready) return <p role="status">{t("search.unavailable")}</p>
  return (
    <div className="flex shrink-0 flex-col gap-3">
      <p role="status" className="text-sm text-muted-foreground">
        {data.page.length
          ? t("search.results", { count: data.page.length })
          : t(data.isDone ? "search.empty" : "search.filtered")}
      </p>
      <div
        className="max-h-[40dvh] overflow-y-auto overscroll-contain"
        role="region"
        tabIndex={0}
        aria-label={t("search.resultsLabel")}
      >
        <ul className="flex flex-col gap-1">
          {data.page.map((item) => (
            <li key={item.id}>
              <Link
                to={item.href}
                onClick={onNavigate}
                className="flex gap-3 rounded-lg p-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CoverImage
                  src={item.artworkUrl}
                  album={item.kind === "album"}
                  className="size-14"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-semibold break-words">
                    {item.title}
                  </span>
                  <span className="text-sm break-words text-muted-foreground">
                    {item.context}
                  </span>
                  <div>
                    <Badge variant="secondary">
                      {item.kind === "song"
                        ? t(
                            item.origin === "artist"
                              ? "discovery.sourceArtist"
                              : "discovery.sourceCommunity"
                          )
                        : t(
                            item.kind === "album"
                              ? "discovery.albums"
                              : "discovery.artists"
                          )}
                    </Badge>
                  </div>
                  {item.kind === "song" && item.contributor ? (
                    <span className="text-sm break-words">
                      {t("community.contributedBy")} {item.contributor}
                    </span>
                  ) : null}
                  {item.excerpt ? (
                    <p className="text-sm break-words whitespace-pre-line text-muted-foreground">
                      {item.excerpt}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <nav
        aria-label={t("discovery.pagination")}
        className="flex shrink-0 justify-between gap-2"
      >
        <Button
          variant="outline"
          disabled={cursors.length === 1}
          onClick={() => setCursors((values) => values.slice(0, -1))}
        >
          {t("discovery.previous")}
        </Button>
        <Button
          variant="outline"
          disabled={data.isDone}
          onClick={() =>
            setCursors((values) => [...values, data.continueCursor])
          }
        >
          {t("discovery.next")}
        </Button>
      </nav>
    </div>
  )
}
