import type { ReactNode } from "react"
import { useQuery } from "convex/react"
import { Link } from "@tanstack/react-router"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Button } from "@lyrx/ui/components/button"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { useLocale } from "@/app/locale-provider"

export function CommunityLoading() {
  const { t } = useLocale()
  return (
    <div aria-label={t("common.loading")} className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

export function CommunityAccess({
  admin = false,
  children,
}: {
  admin?: boolean
  children: ReactNode
}) {
  const current = useQuery(api.members.current, {})
  const { t } = useLocale()
  if (current === undefined) return <CommunityLoading />
  if (
    current.state !== "ready" ||
    (admin ? !current.member.isAdmin : current.member.role !== "fan")
  )
    return (
      <Alert>
        <AlertTitle>
          {t(admin ? "community.adminOnly" : "community.fanOnly")}
        </AlertTitle>
        <AlertDescription>
          <p>{t("community.accessDescription")}</p>
          <Button asChild variant="outline">
            <Link to="/community">{t("community.title")}</Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  return children
}
