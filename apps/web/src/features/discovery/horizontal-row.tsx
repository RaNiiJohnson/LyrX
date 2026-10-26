import { Link } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { Button } from "@lyrx/ui/components/button"
import { useLocale } from "@/app/locale-provider"

export function HorizontalRow({
  title,
  href,
  children,
  empty = false,
}: {
  title: string
  href: "/artists" | "/albums"
  children: ReactNode
  empty?: boolean
}) {
  const { t } = useLocale()
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ before: false, after: false })
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () =>
      setEdges({
        before: element.scrollLeft > 1,
        after:
          element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
      })
    update()
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(update)
    observer?.observe(element)
    for (const child of element.children) observer?.observe(child)
    element.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      observer?.disconnect()
      element.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [children, empty])
  function scroll(direction: number) {
    const element = ref.current
    if (element)
      element.scrollBy({
        left: direction * element.clientWidth * 0.8,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      })
  }
  return (
    <section className="flex min-w-0 flex-col gap-5" aria-labelledby={id}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-xl font-semibold">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {!empty && (edges.before || edges.after) ? (
            <div className="hidden gap-1 lg:flex">
              <Button
                variant="outline"
                size="icon"
                aria-label={t("discovery.previousItems")}
                disabled={!edges.before}
                onClick={() => scroll(-1)}
              >
                <ArrowLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label={t("discovery.nextItems")}
                disabled={!edges.after}
                onClick={() => scroll(1)}
              >
                <ArrowRight />
              </Button>
            </div>
          ) : null}
          <Button asChild variant="link" size="sm">
            <Link to={href}>
              {t("discovery.seeAll")}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>
      {empty ? (
        children
      ) : (
        <div
          ref={ref}
          tabIndex={0}
          role="region"
          aria-labelledby={id}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
              event.preventDefault()
              scroll(event.key === "ArrowRight" ? 1 : -1)
            }
          }}
          className="flex min-w-0 snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain rounded-xl pb-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&>*]:w-36 [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-44 lg:[&>*]:w-52"
        >
          {children}
        </div>
      )}
    </section>
  )
}
