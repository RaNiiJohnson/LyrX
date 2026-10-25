import { Link } from "@tanstack/react-router"
import { usePaginatedQuery, useQuery } from "convex/react"
import { Plus } from "lucide-react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Button } from "@lyrx/ui/components/button"
import { Badge } from "@lyrx/ui/components/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@lyrx/ui/components/card"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@lyrx/ui/components/empty"
import { useLocale } from "@/app/locale-provider"
import { CommunityAccess, CommunityLoading } from "./community-access"

export function CommunityList() {
  const { t } = useLocale()
  const current = useQuery(api.members.current, {})
  const list = usePaginatedQuery(
    api.community.read.listPublished,
    {},
    { initialNumItems: 24 }
  )
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("community.title")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("community.description")}
          </p>
        </div>
        {current?.state === "ready" && current.member.role === "fan" ? (
          <Button asChild>
            <Link to="/community/new">
              <Plus data-icon="inline-start" />
              {t("community.publish")}
            </Link>
          </Button>
        ) : null}
      </header>
      {current?.state === "ready" && current.member.role === "fan" ? (
        <Button asChild variant="outline" className="self-start">
          <Link to="/community/mine">{t("community.mine")}</Link>
        </Button>
      ) : null}
      {list.status === "LoadingFirstPage" ? (
        <CommunityLoading />
      ) : (
        <>
          {list.results.length === 0 ? (
            <CommunityEmpty />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {list.results.map((row) => (
                <Card key={row.id}>
                  <CardHeader>
                    <CardTitle>
                      <Link
                        to="/community/$contributionId"
                        params={{ contributionId: row.id }}
                        className="hover:underline"
                      >
                        {row.title}
                      </Link>
                    </CardTitle>
                    <CardDescription>{row.primaryArtist}</CardDescription>
                  </CardHeader>
                  <CardFooter className="flex-wrap gap-2">
                    <Badge variant="secondary">{t("community.label")}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {t("community.contributedBy")}{" "}
                      <Link
                        to="/profiles/$handle"
                        params={{ handle: row.contributor.handle }}
                        className="underline"
                      >
                        {row.contributor.displayName}
                      </Link>
                    </span>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
          <LoadMore status={list.status} loadMore={() => list.loadMore(24)} />
        </>
      )}
    </section>
  )
}

export function MyContributions() {
  return (
    <CommunityAccess>
      <MyContributionList />
    </CommunityAccess>
  )
}
function MyContributionList() {
  const { t } = useLocale()
  const list = usePaginatedQuery(
    api.community.read.listMine,
    {},
    { initialNumItems: 24 }
  )
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap justify-between gap-4">
        <h1 className="text-3xl font-semibold">{t("community.mine")}</h1>
        <Button asChild>
          <Link to="/community/new">
            <Plus data-icon="inline-start" />
            {t("community.publish")}
          </Link>
        </Button>
      </header>
      {list.status === "LoadingFirstPage" ? (
        <CommunityLoading />
      ) : (
        <>
          {list.results.length === 0 ? (
            <CommunityEmpty kind="mine" />
          ) : (
            list.results.map((row) => (
              <Card key={row._id}>
                <CardHeader>
                  <CardTitle>{row.title}</CardTitle>
                  <CardDescription>{row.primaryArtist}</CardDescription>
                </CardHeader>
                <CardFooter className="flex-wrap gap-3">
                  <Badge variant="secondary">
                    {t(
                      row.status === "published"
                        ? "catalogue.published"
                        : row.status === "hidden"
                          ? "community.hidden"
                          : "community.removed"
                    )}
                  </Badge>
                  {row.status === "published" ? (
                    <>
                      <Button asChild variant="outline">
                        <Link
                          to="/community/$contributionId"
                          params={{ contributionId: row._id }}
                        >
                          {t("catalogue.preview")}
                        </Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link
                          to="/community/$contributionId/edit"
                          params={{ contributionId: row._id }}
                        >
                          {t("catalogue.edit")}
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("community.moderated")}
                    </p>
                  )}
                </CardFooter>
              </Card>
            ))
          )}
          <LoadMore status={list.status} loadMore={() => list.loadMore(24)} />
        </>
      )}
    </section>
  )
}

export function CommunityEmpty({
  kind = "public",
}: {
  kind?: "public" | "mine" | "reports"
}) {
  const { t } = useLocale()
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{t("community.empty")}</EmptyTitle>
        <EmptyDescription>
          {t(
            kind === "reports"
              ? "community.emptyReportsDescription"
              : kind === "mine"
                ? "community.emptyMineDescription"
                : "community.emptyDescription"
          )}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
export function LoadMore({
  status,
  loadMore,
}: {
  status: string
  loadMore: () => void
}) {
  const { t } = useLocale()
  return status === "CanLoadMore" || status === "LoadingMore" ? (
    <Button
      variant="outline"
      className="self-center"
      disabled={status === "LoadingMore"}
      onClick={loadMore}
    >
      {t("community.loadMore")}
    </Button>
  ) : null
}
