import { useQuery } from "convex/react"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@lyrx/ui/components/avatar"
import { Badge } from "@lyrx/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import { Separator } from "@lyrx/ui/components/separator"
import { Spinner } from "@lyrx/ui/components/spinner"

export function PublicProfile({ handle }: { handle: string }) {
  const profile = useQuery(api.members.publicByHandle, { handle })
  if (profile === undefined) return <Spinner />
  if (!profile) {
    return (
      <Alert>
        <AlertTitle>Profil introuvable</AlertTitle>
        <AlertDescription>
          Ce profil n’existe pas ou n’est pas visible publiquement.
        </AlertDescription>
      </Alert>
    )
  }

  const initials = profile.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

  return (
    <Card>
      {profile.artist?.bannerUrl ? (
        <img
          src={profile.artist.bannerUrl}
          alt=""
          className="aspect-[3/1] w-full rounded-t-xl object-cover"
        />
      ) : null}
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            {profile.avatarUrl ? (
              <AvatarImage src={profile.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>{profile.displayName}</CardTitle>
            <CardDescription>@{profile.handle}</CardDescription>
          </div>
          <Badge variant="secondary">
            {profile.role === "artist" ? "Artiste" : "Fan"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {profile.bio ? <p className="leading-7">{profile.bio}</p> : null}
        {profile.artist ? (
          <>
            <Separator />
            <section className="flex flex-col gap-3">
              <h2 className="font-medium">À propos de l’artiste</h2>
              {profile.artist.presentation ? (
                <p className="leading-7 text-muted-foreground">
                  {profile.artist.presentation}
                </p>
              ) : null}
              {profile.artist.instagramUrl ? (
                <a
                  className="w-fit underline"
                  href={profile.artist.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram
                </a>
              ) : null}
              {profile.artist.facebookUrl ? (
                <a
                  className="w-fit underline"
                  href={profile.artist.facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Facebook
                </a>
              ) : null}
              {profile.artist.tiktokUrl ? (
                <a
                  className="w-fit underline"
                  href={profile.artist.tiktokUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  TikTok
                </a>
              ) : null}
              {profile.artist.youtubeUrl ? (
                <a
                  className="w-fit underline"
                  href={profile.artist.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  YouTube
                </a>
              ) : null}
              {profile.artist.spotifyUrl ? (
                <a
                  className="w-fit underline"
                  href={profile.artist.spotifyUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Spotify
                </a>
              ) : null}
              {profile.artist.customLinks.map((link) => (
                <a
                  key={link.url}
                  className="w-fit underline"
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {link.label}
                </a>
              ))}
            </section>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
