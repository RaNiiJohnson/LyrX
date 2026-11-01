import { useLocalSearchParams } from "expo-router"
import { useQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { SongPage } from "@/components/song-page"
import { Loading, Message, Screen } from "@/components/ui"
import { t } from "@/lib/i18n"

export default function CommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const contribution = useQuery(api.community.read.getPublished, {
    contributionId: id as Id<"communityContributions">,
  })
  if (contribution === undefined)
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  if (contribution === null)
    return (
      <Screen>
        <Message title={t("interactions.unavailable")} />
      </Screen>
    )
  return (
    <SongPage
      title={contribution.title}
      primaryArtist={contribution.primaryArtist}
      artworkUrl={contribution.artworkUrl}
      badges={[
        t("discovery.sourceCommunity"),
        contribution.contributor.displayName,
      ]}
      lyricsText={contribution.lyricsText}
    />
  )
}
