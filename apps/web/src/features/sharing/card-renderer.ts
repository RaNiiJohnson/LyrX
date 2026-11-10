import {
  SHARE_CARD_WIDTH as WIDTH,
  SHARE_CARD_HEIGHT as HEIGHT,
  MAX_SHARE_TEXT_LENGTH,
  MAX_SHARE_LINES,
} from "@lyrx/shared"
import { loadCardFonts } from "./card-fonts"

// Editorial serif reserved for the exported card, distinct from the app UI fonts.
const CARD_FONT = '"Fraunces Variable", Georgia, serif'

export type CardContent = {
  text: string
  title: string
  primaryArtist: string
  artworkUrl: string | null
}
export class CardRenderError extends Error {
  constructor(public code: "text" | "artwork" | "render") {
    super(code)
  }
}

/** Wrap using the renderer's actual font metrics; never truncate or add ellipses. */
export function wrapCardText(
  text: string,
  measure: (text: string) => number,
  width: number
) {
  const lines: Array<string> = []
  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (!paragraph) {
      lines.push("")
      continue
    }
    let line = ""
    const tokens = paragraph.match(/\S+\s*|\s+/gu) ?? [paragraph]
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })
    for (const token of tokens) {
      if (line.trim() && measure(line + token.trimEnd()) > width) {
        lines.push(line.trimEnd())
        line = ""
      }
      for (const { segment } of segmenter.segment(token)) {
        if (measure(line + segment) > width && line) {
          lines.push(line.trimEnd())
          line = ""
        }
        if (measure(segment) > width) throw new CardRenderError("text")
        line += segment
      }
    }
    lines.push(line.trimEnd())
  }
  return lines
}

async function loadArtwork(url: string, signal?: AbortSignal) {
  try {
    // URLs come exclusively from the authorized Convex storage projection.
    // A CORS-approved blob URL keeps the canvas origin-clean. No arbitrary embeds.
    const response = await fetch(url, {
      mode: "cors",
      credentials: "omit",
      signal,
    })
    if (!response.ok) throw new Error("Image unavailable")
    const blob = await response.blob()
    if (
      !/^image\/(jpeg|png|webp)$/.test(blob.type) ||
      blob.size > 10 * 1024 * 1024
    )
      throw new Error("Unsupported artwork")
    const objectUrl = URL.createObjectURL(blob)
    try {
      const image = new Image()
      image.src = objectUrl
      await image.decode()
      if (image.naturalWidth > 8192 || image.naturalHeight > 8192)
        throw new Error("Artwork too large")
      return image
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  } catch (error) {
    if (signal?.aborted) throw error
    throw new CardRenderError("artwork")
  }
}

export async function renderCard(content: CardContent, signal?: AbortSignal) {
  if (!content.text.trim() || content.text.length > MAX_SHARE_TEXT_LENGTH)
    throw new CardRenderError("text")
  await loadCardFonts()
  await Promise.all(
    [
      `italic 400 64px ${CARD_FONT}`,
      `600 64px ${CARD_FONT}`,
      `400 64px ${CARD_FONT}`,
    ].map((font) => document.fonts.load(font))
  )
  signal?.throwIfAborted()
  const canvas = document.createElement("canvas")
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new CardRenderError("render")
  // Stable export palette: Corail studio, independent of the surrounding UI theme.
  ctx.fillStyle = "#291e1c"
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  if (content.artworkUrl) {
    const image = await loadArtwork(content.artworkUrl, signal)
    signal?.throwIfAborted()
    const scale =
      Math.max(WIDTH / image.naturalWidth, HEIGHT / image.naturalHeight) * 1.12
    const width = image.naturalWidth * scale,
      height = image.naturalHeight * scale
    ctx.save()
    ctx.filter = "blur(28px)"
    ctx.drawImage(
      image,
      (WIDTH - width) / 2,
      (HEIGHT - height) / 2,
      width,
      height
    )
    ctx.restore()
    ctx.fillStyle = "rgba(0,0,0,0.72)"
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
  }
  ctx.fillStyle = "#fff8f2"
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  ctx.font = `italic 400 64px ${CARD_FONT}`
  const body = wrapCardText(
    content.text,
    (value) => ctx.measureText(value).width,
    888
  )
  ctx.font = `600 40px ${CARD_FONT}`
  const title = wrapCardText(
    content.title,
    (value) => ctx.measureText(value).width,
    888
  )
  ctx.font = `400 32px ${CARD_FONT}`
  const artist = wrapCardText(
    content.primaryArtist,
    (value) => ctx.measureText(value).width,
    888
  )
  if (body.length > MAX_SHARE_LINES || title.length > 3 || artist.length > 3)
    throw new CardRenderError("text")
  const total =
    body.length * 88 + 64 + title.length * 54 + 12 + artist.length * 44
  let y = 240 + (1400 - total) / 2
  if (total > 1400) throw new CardRenderError("text")
  ctx.font = `italic 400 64px ${CARD_FONT}`
  for (const line of body) {
    ctx.fillText(line, WIDTH / 2, y)
    y += 88
  }
  y += 64
  ctx.font = `600 40px ${CARD_FONT}`
  for (const line of title) {
    ctx.fillText(line, WIDTH / 2, y)
    y += 54
  }
  y += 12
  ctx.font = `400 32px ${CARD_FONT}`
  for (const line of artist) {
    ctx.fillText(line, WIDTH / 2, y)
    y += 44
  }
  // Visible Lyr'X signature is part of the raster itself, not an HTML overlay.
  ctx.fillStyle = "#DF4F55"
  ctx.fillRect(414, 1768, 56, 56)
  ctx.fillStyle = "#ffffff"
  ctx.font = `600 36px ${CARD_FONT}`
  ctx.fillText("X", 442, 1777)
  ctx.fillStyle = "#fff8f2"
  ctx.font = `600 44px ${CARD_FONT}`
  ctx.textAlign = "left"
  ctx.fillText("Lyr'X", 488, 1772)
  signal?.throwIfAborted()
  return canvas
}

export function cardBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new CardRenderError("render")),
        "image/png"
      )
    } catch {
      reject(new CardRenderError("render"))
    }
  })
}
