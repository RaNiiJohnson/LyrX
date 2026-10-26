// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LocaleProvider } from "@/app/locale-provider"
import { SongListeningLinks } from "./song-listening-links"

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  window.localStorage.clear()
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe("external listening fallback", () => {
  it.each([
    ["youtube", "https://www.youtube.com/watch?v=dQw4w9WgXc", "YouTube"],
    [
      "spotify",
      "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
      "Spotify",
    ],
  ] as const)(
    "loads %s only on demand and keeps its source link after player failure",
    async (provider, url, name) => {
      await act(async () => {
        root.render(
          <LocaleProvider>
            <SongListeningLinks artworkUrl={null} links={[{ provider, url }]} />
          </LocaleProvider>
        )
        await Promise.resolve()
      })
      expect(host.querySelector("iframe")).toBeNull()
      const toggle = [...host.querySelectorAll("button")].find((e) =>
        e.textContent.includes("Écouter")
      )
      if (toggle?.getAttribute("aria-expanded") === "false") {
        await act(async () => {
          toggle.click()
          await Promise.resolve()
        })
      }
      const load = host.querySelector<HTMLButtonElement>(
        `button[aria-label="Charger le lecteur ${name}"]`
      )
      if (!load) throw new Error(`Missing ${name} player activation`)
      expect(host.querySelector("iframe")).toBeNull()
      expect(host.querySelector(`a[href="${url}"]`)).not.toBeNull()
      await act(async () => {
        load.click()
        await Promise.resolve()
      })
      const player = host.querySelector("iframe")
      expect(player).not.toBeNull()
      expect(player?.getAttribute("src")).not.toContain("autoplay=1")
      expect(player?.getAttribute("allow")).not.toContain("autoplay")
      await act(async () => {
        player?.dispatchEvent(new Event("error"))
        await Promise.resolve()
      })
      expect(
        host.querySelector(`a[href="${url}"]`)?.getAttribute("target")
      ).toBe("_blank")
      expect(host.querySelector(`a[href="${url}"]`)?.textContent).toContain(
        name
      )
    }
  )
})
