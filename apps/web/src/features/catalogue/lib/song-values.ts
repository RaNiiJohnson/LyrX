import type { FunctionReturnType } from "convex/server"

import type { api } from "@lyrx/backend/convex/_generated/api"

import { dateInputFromTimestamp, type SongFormValues } from "./catalogue-form"

type SongDetail = FunctionReturnType<typeof api.catalogue.getMySong>

export function songValuesFromDetail(detail: SongDetail): SongFormValues {
  return {
    releaseType: detail.album ? "album" : "single",
    albumId: detail.album?._id ?? "",
    inheritArtwork: detail.albumTrack?.inheritArtwork ?? false,
    inheritPrimaryLanguage: detail.albumTrack?.inheritPrimaryLanguage ?? false,
    inheritGenre: detail.albumTrack?.inheritGenre ?? false,
    inheritLabel: detail.albumTrack?.inheritLabel ?? false,
    inheritCredits: detail.albumTrack?.inheritCredits ?? false,
    title: detail.song.title,
    primaryArtist: detail.song.primaryArtist,
    guestArtists: detail.song.guestArtists.join("\n"),
    releaseDate: dateInputFromTimestamp(detail.song.releaseDate),
    description: detail.song.description ?? "",
    context: detail.song.context ?? "",
    primaryLanguage: detail.song.primaryLanguage ?? "",
    genre: detail.song.genre ?? "",
    otherGenre: detail.song.otherGenre ?? "",
    writers: detail.song.writers.join("\n"),
    composers: detail.song.composers.join("\n"),
    producers: detail.song.producers.join("\n"),
    label: detail.song.label ?? "",
    additionalCredits: detail.song.additionalCredits?.join("\n") ?? "",
    listeningLinks: detail.song.listeningLinks,
    lyricsText: detail.lyricsText,
  }
}
