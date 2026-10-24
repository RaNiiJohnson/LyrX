import { formOptions } from "@tanstack/react-form"

import type { AlbumFormValues } from "./album-types"

export const emptyAlbumValues: AlbumFormValues = {
  title: "",
  releaseDate: "",
  description: "",
  primaryLanguage: "",
  genre: "",
  otherGenre: "",
  label: "",
  credits: "",
  trackIds: [],
}
export const albumFormOptions = formOptions({ defaultValues: emptyAlbumValues })
