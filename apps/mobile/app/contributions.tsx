import { FlatList, Text, View } from "react-native"
import { Stack, useRouter } from "expo-router"
import { usePaginatedQuery } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Button } from "@/components/form"
import { MemberGate } from "@/components/member-gate"
import { Badge, GUTTER, Loading, Message } from "@/components/ui"
import { t } from "@/lib/i18n"
import { fonts, radius, space, useTheme } from "@/lib/theme"

const PAGE = 20

function ContributionList() {
  const theme = useTheme()
  const router = useRouter()
  const mine = usePaginatedQuery(
    api.community.read.listMine,
    {},
    { initialNumItems: PAGE }
  )
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={mine.results}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View
            style={{
              gap: space.sm,
              padding: space.md,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: theme.outline,
              backgroundColor: theme.card,
            }}
          >
            <Text
              style={{
                color: theme.foreground,
                fontFamily: fonts.sansSemibold,
                fontSize: 16,
              }}
            >
              {item.title}
            </Text>
            <Text
              style={{ color: theme.mutedForeground, fontFamily: fonts.sans }}
            >
              {item.primaryArtist}
            </Text>
            {item.status !== "published" ? (
              <View style={{ gap: space.xs, alignItems: "flex-start" }}>
                <Badge
                  label={
                    item.status === "hidden"
                      ? t("community.hidden")
                      : t("community.removed")
                  }
                />
                <Text
                  style={{
                    color: theme.mutedForeground,
                    fontFamily: fonts.sans,
                    fontSize: 13,
                  }}
                >
                  {t("community.moderated")}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Button
                    variant="outline"
                    label={t("notebook.source")}
                    onPress={() => router.push(`/community/${item._id}`)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    variant="outline"
                    label={t("community.edit")}
                    onPress={() =>
                      router.push({
                        pathname: "/contribution-edit",
                        params: { id: item._id },
                      })
                    }
                  />
                </View>
              </View>
            )}
          </View>
        )}
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingTop: space.md,
          paddingBottom: space.xl,
          gap: space.md,
        }}
        ListHeaderComponent={
          <Button
            label={t("community.publish")}
            onPress={() => router.push("/contribution-edit")}
          />
        }
        ListEmptyComponent={
          mine.status === "LoadingFirstPage" ? (
            <Loading />
          ) : (
            <Message
              title={t("community.empty")}
              description={t("community.emptyMineDescription")}
            />
          )
        }
        ListFooterComponent={
          <>
            {mine.status === "CanLoadMore" ? (
              <Button
                variant="outline"
                label={t("community.loadMore")}
                onPress={() => mine.loadMore(PAGE)}
              />
            ) : null}
          </>
        }
      />
    </View>
  )
}

export default function ContributionsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: t("community.mine") }} />
      <MemberGate role="fan" signInTitle={t("community.mine")}>
        <ContributionList />
      </MemberGate>
    </>
  )
}
