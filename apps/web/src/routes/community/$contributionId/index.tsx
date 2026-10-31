import { convexQuery } from "@convex-dev/react-query"
import { createFileRoute, notFound, Link } from "@tanstack/react-router"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { PageShell } from "@/app/page-shell"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Badge } from "@lyrx/ui/components/badge"
import { useLocale } from "@/app/locale-provider"
import { SongReadOnly } from "@/features/catalogue/song/song-read-only"
import { RecordPublicView } from "@/features/discovery/record-public-view"
import { SongInteractions } from "@/features/interactions/song-interactions"
import { ReportActions } from "@/features/community/community-report-actions"

export const Route = createFileRoute("/community/$contributionId/")({
  component: ContributionPage,
  loader: async ({ context, params }) => {
    if (!context.convexQueryClient) return
    const row = await context.queryClient.query({
      ...convexQuery(api.community.read.getPublished, {
        contributionId: params.contributionId as Id<"communityContributions">,
      }),
      staleTime: "static",
    })
    if (!row) throw notFound()
  },
})
function ContributionPage() {
  const { contributionId: id } = Route.useParams()
  const contributionId = id as Id<"communityContributions">
  const { t } = useLocale()
  const { data: row } = useSuspenseQuery(
    convexQuery(api.community.read.getPublished, { contributionId })
  )
  if (!row) throw notFound()
  return (
    <PageShell width="wide">
      <section className="flex flex-col gap-6">
        <RecordPublicView origin="community" sourceId={contributionId} />
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">{t("community.label")}</Badge>
          <p>
            {t("community.contributedBy")}{" "}
            <Link
              to="/profiles/$handle"
              params={{ handle: row.contributor.handle }}
              className="underline"
            >
              {row.contributor.displayName}
            </Link>
          </p>
          <div className="ml-auto">
            <ReportActions
              key={contributionId}
              contributionId={contributionId}
              contributorHandle={row.contributor.handle}
            />
          </div>
        </div>
        <SongReadOnly
          detail={{
            artworkUrl: row.artworkUrl ?? null,
            lyricsText: row.lyricsText,
            album: row.albumTitle ? { title: row.albumTitle } : null,
            song: {
              ...row,
              title: row.title,
              primaryArtist: row.primaryArtist,
              guestArtists: row.guestArtists ?? [],
              composers: row.composers ?? [],
              producers: row.producers ?? [],
              writers: row.writers ?? [],
              listeningLinks: row.listeningLinks ?? [],
            },
          }}
        />
        <SongInteractions key={contributionId} sourceId={contributionId} />
      </section>
    </PageShell>
  )
}
