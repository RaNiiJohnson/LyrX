import { isValidDisplayName, isValidHandle } from "@lyrx/shared"

export const MAX_CUSTOM_LINKS = 8

export type CustomLink = { label: string; url: string }

export type ProfileValues = {
  displayName: string
  handle: string
  bio: string
  presentation: string
  instagramUrl: string
  facebookUrl: string
  tiktokUrl: string
  youtubeUrl: string
  spotifyUrl: string
  customLinks: Array<CustomLink>
}

export const EMPTY_PROFILE: ProfileValues = {
  displayName: "",
  handle: "",
  bio: "",
  presentation: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  spotifyUrl: "",
  customLinks: [],
}

export type ProfileErrors = {
  displayName?: "error.invalidDisplayName"
  handle?: "error.invalidHandle"
}

/** Client-side mirror of the checks the server repeats; only the cheap ones. */
export function profileErrors(values: ProfileValues): ProfileErrors {
  const errors: ProfileErrors = {}
  if (!isValidDisplayName(values.displayName))
    errors.displayName = "error.invalidDisplayName"
  if (!isValidHandle(values.handle)) errors.handle = "error.invalidHandle"
  return errors
}

const blank = (value: string) => {
  const trimmed = value.trim()
  return trimmed === "" ? undefined : trimmed
}

/** Artist block of the mutations; empty optional fields are omitted, not sent as "". */
export function artistInput(values: ProfileValues) {
  return {
    presentation: blank(values.presentation),
    instagramUrl: blank(values.instagramUrl),
    facebookUrl: blank(values.facebookUrl),
    tiktokUrl: blank(values.tiktokUrl),
    youtubeUrl: blank(values.youtubeUrl),
    spotifyUrl: blank(values.spotifyUrl),
    customLinks: values.customLinks
      .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
      .filter((link) => link.label !== "" || link.url !== ""),
  }
}

export function profileInput(values: ProfileValues, role: "artist" | "fan") {
  return {
    handle: values.handle.trim(),
    displayName: values.displayName.trim(),
    bio: blank(values.bio),
    artist: role === "artist" ? artistInput(values) : undefined,
  }
}

type CurrentProfile = {
  handle: string
  displayName: string
  bio?: string
}
type CurrentArtist = {
  presentation?: string
  instagramUrl?: string
  facebookUrl?: string
  tiktokUrl?: string
  youtubeUrl?: string
  spotifyUrl?: string
  customLinks: ReadonlyArray<CustomLink>
}

export function valuesFromCurrent(
  profile: CurrentProfile,
  artist: CurrentArtist | null
): ProfileValues {
  return {
    displayName: profile.displayName,
    handle: profile.handle,
    bio: profile.bio ?? "",
    presentation: artist?.presentation ?? "",
    instagramUrl: artist?.instagramUrl ?? "",
    facebookUrl: artist?.facebookUrl ?? "",
    tiktokUrl: artist?.tiktokUrl ?? "",
    youtubeUrl: artist?.youtubeUrl ?? "",
    spotifyUrl: artist?.spotifyUrl ?? "",
    customLinks: artist?.customLinks.map((link) => ({ ...link })) ?? [],
  }
}
