import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { Children, useId, type ReactNode } from "react"
import { Button } from "@lyrx/ui/components/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@lyrx/ui/components/carousel"
import { useLocale } from "@/app/locale-provider"
import type { CatalogueSearch } from "./catalogue-search"

export function HorizontalRow({
  title,
  href,
  children,
  description,
  empty = false,
  seeAllSearch,
  layout = "row",
}: {
  title: string
  href: "/artists" | "/albums" | "/songs"
  children: ReactNode
  /** Optional line under the title, e.g. what "popular" means. */
  description?: string
  empty?: boolean
  /** Filter applied by "See all", e.g. one artist's albums. */
  seeAllSearch?: Partial<CatalogueSearch>
  /** "list": children are rendered as given, without the carousel. */
  layout?: "row" | "list"
}) {
  const { t } = useLocale()
  const id = useId()
  return (
    <section className="flex min-w-0 flex-col gap-5" aria-labelledby={id}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-xl font-semibold">
          {title}
        </h2>
        {empty ? null : (
          <Button asChild variant="link" size="sm">
            {href === "/songs" ? (
              <Link to="/songs" search={seeAllSearch ?? {}}>
                {t("discovery.seeAll")}
                <ArrowRight data-icon="inline-end" />
              </Link>
            ) : (
              <Link to={href} search={seeAllSearch}>
                {t("discovery.seeAll")}
                <ArrowRight data-icon="inline-end" />
              </Link>
            )}
          </Button>
        )}
      </div>
      {description ? (
        <p className="-mt-2 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {empty || layout === "list" ? (
        children
      ) : (
        <Carousel
          opts={{ align: "start", containScroll: "trimSnaps" }}
          aria-labelledby={id}
          aria-roledescription={t("releases.carousel")}
          tabIndex={0}
          className="min-w-0 cursor-grab rounded-xl outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
        >
          <CarouselContent className="ml-0 gap-5">
            {Children.map(children, (child) => (
              <CarouselItem className="basis-36 pl-0 sm:basis-44 lg:basis-52">
                {child}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      )}
    </section>
  )
}
