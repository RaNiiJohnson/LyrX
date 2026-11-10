import { useLocalSearchParams } from "expo-router"
import { ProfilePage } from "@/components/profile-page"

export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>()
  return <ProfilePage handle={handle} />
}
