import type { FunctionReturnType } from "convex/server"
import type { api } from "@lyrx/backend/convex/_generated/api"

type Card = NonNullable<FunctionReturnType<typeof api.sharing.prepare>>
export function sameCard(current: Card | null, preview: Card) {
  return (
    current !== null &&
    current.text === preview.text &&
    current.title === preview.title &&
    current.primaryArtist === preview.primaryArtist &&
    current.version === preview.version &&
    current.artworkId === preview.artworkId
  )
}
export function downloadPng(blob: Blob, title: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `lyrx-${title.replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 64) || "passage"}.png`
  document.body.append(link)
  link.click()
  link.remove()
  // Keep the URL alive while the browser starts its asynchronous download.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
