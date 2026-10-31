import { useLocale } from "@/app/locale-provider"
import type { api } from "@lyrx/backend/convex/_generated/api"
import { Avatar, AvatarFallback, AvatarImage } from "@lyrx/ui/components/avatar"
import { Badge } from "@lyrx/ui/components/badge"
import { cn } from "@lyrx/ui/lib/utils"
import type { FunctionReturnType } from "convex/server"
import { useState } from "react"

export type Profile = NonNullable<
  FunctionReturnType<typeof api.members.publicByHandle>
>

export function ProfileHeader({ profile }: { profile: Profile }) {
  const { t } = useLocale()
  const [bannerFailed, setBannerFailed] = useState(false)
  const bannerUrl = profile.artist?.bannerUrl
  const hasBanner = Boolean(bannerUrl) && !bannerFailed
  return (
    <div className="flex flex-col">
      {hasBanner && bannerUrl ? (
        <img
          src={bannerUrl}
          alt=""
          className="aspect-3/1 max-h-64 w-full rounded-2xl object-cover"
          onError={() => setBannerFailed(true)}
        />
      ) : null}
      <header
        className={cn(
          "flex flex-col items-start gap-3 sm:flex-row sm:gap-5",
          hasBanner && "px-4 sm:px-6"
        )}
      >
        <Avatar
          className={cn(
            "size-24 sm:size-32",
            hasBanner && "-mt-12 ring-4 ring-background sm:-mt-16"
          )}
        >
          {profile.avatarUrl ? (
            <AvatarImage src={profile.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback>
            {profile.displayName.trim().slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div
          className={cn(
            "flex min-w-0 flex-col gap-1",
            !hasBanner && "sm:self-center"
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold break-words">
              {profile.displayName}
            </h1>
            <Badge variant="secondary">
              {t(profile.role === "artist" ? "common.artist" : "common.fan")}
            </Badge>
          </div>
          <p className="break-words text-muted-foreground">@{profile.handle}</p>
        </div>
      </header>
    </div>
  )
}
