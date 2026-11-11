import { FlatList, View } from "react-native"
import { Stack } from "expo-router"
import { usePaginatedQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Button } from "@/components/form"
import { MemberGate } from "@/components/member-gate"
import { GUTTER, Loading, Message, SongRow } from "@/components/ui"
import { t } from "@/lib/i18n"
import { space, useTheme } from "@/lib/theme"

const PAGE = 20

function LikedList() {
  const theme = useTheme()
  const liked = usePaginatedQuery(
    api.interactions.read.likedSongs,
    {},
    { initialNumItems: PAGE }
  )
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={liked.results}
        keyExtractor={(item) => `${item.origin}-${item.id}`}
        renderItem={({ item }) => (
          <SongRow
            href={item.href}
            artworkUrl={item.artworkUrl}
            title={item.title}
            subtitle={item.primaryArtist}
          />
        )}
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingTop: space.sm,
          paddingBottom: space.xl,
          gap: space.sm,
        }}
        ListEmptyComponent={
          liked.status === "LoadingFirstPage" ? (
            <Loading />
          ) : (
            <Message
              title={t("interactions.emptyLiked")}
              description={t("interactions.unavailableLiked")}
            />
          )
        }
        ListFooterComponent={
          <>
            {liked.status === "CanLoadMore" ? (
              <Button
                variant="outline"
                label={t("community.loadMore")}
                onPress={() => liked.loadMore(PAGE)}
              />
            ) : null}
          </>
        }
      />
    </View>
  )
}

export default function LikedScreen() {
  return (
    <>
      <Stack.Screen options={{ title: t("interactions.likedSongs") }} />
      <MemberGate signInTitle={t("interactions.likedSongs")}>
        <LikedList />
      </MemberGate>
    </>
  )
}
