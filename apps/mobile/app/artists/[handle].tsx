import { useLocalSearchParams } from "expo-router"
import { ProfilePage } from "@/components/profile-page"

export default function ArtistScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>()
  return <ProfilePage handle={handle} artistOnly />
}
