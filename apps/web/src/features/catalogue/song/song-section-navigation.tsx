import { useEffect, useState } from "react"

import { Button } from "@lyrx/ui/components/button"
import { cn } from "@lyrx/ui/lib/utils"

import { useLocale } from "@/app/locale-provider"

export type LyricSectionNavigationItem = {
  id: string
  label: string
}

export function SongSectionNavigation({
  sections,
}: {
  sections: Array<LyricSectionNavigationItem>
}) {
  const { t } = useLocale()
  const [activeId, setActiveId] = useState(sections[0]?.id)

  useEffect(() => {
    setActiveId(sections[0]?.id)
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) => right.intersectionRatio - left.intersectionRatio
          )[0]
        if (activeEntry) setActiveId(activeEntry.target.id)
      },
      { rootMargin: "-20% 0px -65%", threshold: [0, 0.25, 0.6] }
    )

    for (const section of sections) {
      const element = document.getElementById(section.id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [sections])

  if (sections.length === 0) return null

  return (
    <nav
      aria-label={t("studio.lyricsSections")}
      className="sticky top-20 z-10 -mx-4 [scrollbar-width:none] overflow-x-auto border-y border-border/70 bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex w-max gap-2">
        {sections.map((section) => (
          <Button
            key={section.id}
            type="button"
            variant={activeId === section.id ? "secondary" : "ghost"}
            size="sm"
            aria-current={activeId === section.id ? "true" : undefined}
            className={cn("min-h-11 rounded-full px-3", {
              "font-semibold": activeId === section.id,
            })}
            onClick={() => {
              document
                .getElementById(section.id)
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
          >
            {section.label}
          </Button>
        ))}
      </div>
    </nav>
  )
}
