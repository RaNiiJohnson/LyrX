import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { ArrowRight } from "lucide-react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import { Input } from "@lyrx/ui/components/input"
import { Field, FieldDescription, FieldLabel } from "@lyrx/ui/components/field"
import { BackendRequired } from "@/app/backend-required"
import { useLocale } from "@/app/locale-provider"
import {
  AlbumCard,
  ArtistCard,
  SongCard,
} from "@/features/discovery/discovery-cards"
import {
  DiscoveryEmpty,
  DiscoveryLoading,
} from "@/features/discovery/discovery-states"
import { HorizontalRow } from "@/features/discovery/horizontal-row"

export function FoundationPage() {
  const { t } = useLocale()
  return (
    <div className="flex min-w-0 flex-col gap-10 sm:gap-14">
      <section className="relative isolate flex min-h-80 items-center justify-center overflow-hidden rounded-3xl bg-muted px-5 py-12 text-center sm:min-h-96 sm:px-10">
        <img
          src="/images/lyrx-songwriter-hero.webp"
          alt={t("home.heroImageAlt")}
          width={1536}
          height={1024}
          fetchPriority="high"
          className="absolute inset-0 -z-20 size-full object-cover object-[58%_center] sm:object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-brand-foreground/65"
        />
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-hero-foreground">
          <Badge variant="secondary">{t("home.eyebrow")}</Badge>
          <h1 className="font-serif text-4xl leading-tight tracking-tight text-balance sm:text-6xl">
            <span>{t("home.titleLead")}</span>{" "}
            <span className="font-normal italic">
              {t("home.titleEmphasis")}
            </span>
          </h1>
          <Field className="max-w-xl rounded-xl bg-card p-3 text-card-foreground">
            <FieldLabel htmlFor="home-search" className="sr-only">
              {t("discovery.searchPlaceholder")}
            </FieldLabel>
            <Input
              id="home-search"
              disabled
              placeholder={t("discovery.searchPlaceholder")}
              aria-describedby="home-search-availability"
            />
            <FieldDescription id="home-search-availability">
              {t("discovery.searchUnavailable")}
            </FieldDescription>
          </Field>
        </div>
      </section>
      <BackendRequired>
        <HomeDiscovery />
      </BackendRequired>
    </div>
  )
}

function HomeDiscovery() {
  const { t } = useLocale()
  const data = useQuery(api.discovery.read.home, {})
  if (!data?.ready) return <DiscoveryLoading />
  return (
    <>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{t("discovery.newest")}</h2>
          <Button asChild variant="link" size="sm">
            <Link to="/songs">
              {t("discovery.seeAll")}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        {data.songs.length ? (
          <div className="grid gap-x-4 sm:grid-cols-2 sm:gap-y-4 lg:grid-cols-3">
            {data.songs.map((song) => (
              <SongCard key={`${song.origin}:${song.id}`} song={song} />
            ))}
          </div>
        ) : (
          <DiscoveryEmpty />
        )}
      </section>
      <HorizontalRow
        title={t("discovery.artists")}
        href="/artists"
        empty={!data.artists.length}
      >
        {data.artists.length ? (
          data.artists.map((artist) => (
            <ArtistCard key={artist.handle} artist={artist} />
          ))
        ) : (
          <DiscoveryEmpty />
        )}
      </HorizontalRow>
      <HorizontalRow
        title={t("discovery.albums")}
        href="/albums"
        empty={!data.albums.length}
      >
        {data.albums.length ? (
          data.albums.map((album) => <AlbumCard key={album.id} album={album} />)
        ) : (
          <DiscoveryEmpty />
        )}
      </HorizontalRow>
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{t("discovery.popular")}</h2>
          <Button asChild variant="link" size="sm">
            <Link to="/songs" search={{ sort: "popular", page: 1 }}>
              {t("discovery.seeAll")}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("discovery.popularDescription")}
        </p>
        {data.popularSongs.length ? (
          <div className="grid gap-x-4 sm:grid-cols-2 sm:gap-y-4 lg:grid-cols-3">
            {data.popularSongs.map((song) => (
              <SongCard key={`${song.origin}:${song.id}`} song={song} />
            ))}
          </div>
        ) : (
          <DiscoveryEmpty />
        )}
      </section>
    </>
  )
}
