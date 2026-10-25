import { formOptions } from "@tanstack/react-form"
import type { Doc } from "@lyrx/backend/convex/_generated/dataModel"
import {
  dateInputFromTimestamp,
  namesFromTextarea,
  timestampFromDateInput,
  type ListeningProvider,
  type SongGenre,
} from "@/features/catalogue/lib/catalogue-form"

export type CommunityFormValues = {
  title: string
  primaryArtist: string
  lyricsText: string
  albumTitle: string
  releaseDate: string
  description: string
  context: string
  genre: "" | SongGenre
  otherGenre: string
  label: string
  guestArtists: string
  writers: string
  composers: string
  producers: string
  additionalCredits: string
  listeningLinks: Array<{ provider: ListeningProvider; url: string }>
}

export function communityValuesFromDetail(
  detail?: Doc<"communityContributions">
): CommunityFormValues {
  return {
    title: detail?.title ?? "",
    primaryArtist: detail?.primaryArtist ?? "",
    lyricsText: detail?.lyricsText ?? "",
    albumTitle: detail?.albumTitle ?? "",
    releaseDate: dateInputFromTimestamp(detail?.releaseDate),
    description: detail?.description ?? "",
    context: detail?.context ?? "",
    genre: detail?.genre ?? "",
    otherGenre: detail?.otherGenre ?? "",
    label: detail?.label ?? "",
    guestArtists: detail?.guestArtists?.join("\n") ?? "",
    writers: detail?.writers?.join("\n") ?? "",
    composers: detail?.composers?.join("\n") ?? "",
    producers: detail?.producers?.join("\n") ?? "",
    additionalCredits: detail?.additionalCredits?.join("\n") ?? "",
    listeningLinks: detail?.listeningLinks ?? [],
  }
}

export function toCommunityMutationInput(value: CommunityFormValues) {
  return {
    title: value.title,
    primaryArtist: value.primaryArtist,
    lyricsText: value.lyricsText,
    albumTitle: value.albumTitle,
    releaseDate: timestampFromDateInput(value.releaseDate),
    description: value.description,
    context: value.context,
    genre: value.genre || undefined,
    otherGenre: value.genre === "other" ? value.otherGenre : "",
    label: value.label,
    guestArtists: namesFromTextarea(value.guestArtists),
    writers: namesFromTextarea(value.writers),
    composers: namesFromTextarea(value.composers),
    producers: namesFromTextarea(value.producers),
    additionalCredits: namesFromTextarea(value.additionalCredits),
    listeningLinks: value.listeningLinks.filter((link) => link.url.trim()),
  }
}

export const communityFormOptions = formOptions({
  defaultValues: communityValuesFromDetail(),
})
