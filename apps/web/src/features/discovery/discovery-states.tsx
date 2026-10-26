import { Music2 } from "lucide-react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lyrx/ui/components/empty"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { useLocale } from "@/app/locale-provider"

export function DiscoveryEmpty() {
  const { t } = useLocale()
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Music2 />
        </EmptyMedia>
        <EmptyTitle>{t("discovery.emptyTitle")}</EmptyTitle>
        <EmptyDescription>{t("discovery.emptyDescription")}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function DiscoveryLoading() {
  const { t } = useLocale()
  return (
    <div
      role="status"
      aria-label={t("common.loadingCatalogue")}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex items-center gap-4 py-5">
          <Skeleton className="size-16 rounded-xl" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
