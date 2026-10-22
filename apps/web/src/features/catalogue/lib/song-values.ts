import type { FunctionReturnType } from "convex/server"

import type { api } from "@lyrx/backend/convex/_generated/api"

import { dateInputFromTimestamp, type SongFormValues } from "./catalogue-form"

type SongDetail = FunctionReturnType<typeof api.catalogue.getMySong>

export function songValuesFromDetail(detail: SongDetail): SongFormValues {
  return {
    title: detail.song.title,
    primaryArtist: detail.song.primaryArtist,
    guestArtists: detail.song.guestArtists.join("\n"),
    releaseDate: dateInputFromTimestamp(detail.song.releaseDate),
    description: detail.song.description ?? "",
    context: detail.song.context ?? "",
    primaryLanguage: detail.song.primaryLanguage,
    genre: detail.song.genre ?? "",
    otherGenre: detail.song.otherGenre ?? "",
    writers: detail.song.writers.join("\n"),
    composers: detail.song.composers.join("\n"),
    producers: detail.song.producers.join("\n"),
    label: detail.song.label ?? "",
    listeningLinks: detail.song.listeningLinks,
    lyricsText: detail.lyricsText,
  }
}
