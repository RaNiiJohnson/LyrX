import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { THEME_TOKENS } from "./theme"

function oklchToHex(value: string) {
  const match = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/.exec(value)
  if (!match) throw new Error(`Unsupported colour: ${value}`)
  const [l, c, h] = [match[1], match[2], match[3]].map(Number) as [
    number,
    number,
    number,
  ]
  const hue = (h * Math.PI) / 180
  const a = c * Math.cos(hue)
  const b = c * Math.sin(hue)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
  const encode = (channel: number) => {
    const clamped = Math.min(1, Math.max(0, channel))
    const gamma =
      clamped <= 0.0031308
        ? 12.92 * clamped
        : 1.055 * clamped ** (1 / 2.4) - 0.055
    return Math.round(gamma * 255)
      .toString(16)
      .padStart(2, "0")
  }
  return `#${linear.map(encode).join("")}`
}

const css = readFileSync(
  new URL("../../ui/src/styles/globals.css", import.meta.url),
  "utf8"
)

function block(start: string) {
  const from = css.indexOf(start)
  return css.slice(from, css.indexOf("\n}", from))
}

const kebab = (name: string) =>
  name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

describe("theme tokens", () => {
  it.each([
    ["light", ":root {"],
    ["dark", ".dark {"],
  ] as const)("%s tokens match globals.css", (mode, start) => {
    const source = block(start)
    for (const [name, hex] of Object.entries(THEME_TOKENS[mode])) {
      const declared = new RegExp(
        `--${kebab(name)}:\\s*(oklch\\([^)]*\\))`
      ).exec(source)
      expect(declared, `--${kebab(name)} in ${mode}`).not.toBeNull()
      expect(oklchToHex(declared![1]!), name).toBe(hex)
    }
  })
})
