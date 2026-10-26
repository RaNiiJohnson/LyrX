// @vitest-environment happy-dom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LocaleMenu } from "./locale-menu"
import { LocaleProvider } from "./locale-provider"
import { ThemeMenu } from "./theme-menu"

const mocks = vi.hoisted(() => ({
  theme: "system",
  setTheme: vi.fn(),
}))
vi.mock("@lyrx/ui/components/theme-provider", () => ({
  useTheme: () => ({ theme: mocks.theme, setTheme: mocks.setTheme }),
}))

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

async function flush(work: () => void) {
  await act(async () => {
    work()
    await Promise.resolve()
  })
}

async function render() {
  await flush(() =>
    root.render(
      <LocaleProvider>
        <LocaleMenu />
        <ThemeMenu />
      </LocaleProvider>
    )
  )
}

async function open(button: HTMLButtonElement) {
  await flush(() =>
    button.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    )
  )
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  window.localStorage.clear()
  mocks.theme = "system"
  mocks.setTheme.mockClear()
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await flush(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe("compact preference controls", () => {
  it.each(["fr", "en"] as const)(
    "uses equal 36px targets and a compact %s label",
    async (locale) => {
      window.localStorage.setItem("lyrx-locale", locale)
      await render()
      const buttons = host.querySelectorAll("button")
      expect(buttons).toHaveLength(2)
      for (const button of buttons) {
        expect(button.getAttribute("data-size")).toBe("icon-lg")
        expect(button.className).toContain("size-9")
      }
      expect(buttons[0]?.textContent).toBe(locale.toUpperCase())
      expect(buttons[0]?.querySelector("svg")).toBeNull()
      expect(buttons[0]?.getAttribute("aria-label")).toBe(
        locale === "fr" ? "Langue : Français" : "Language : English"
      )
      expect(buttons[1]?.getAttribute("aria-label")).toBe(
        locale === "fr" ? "Thème : Système" : "Theme : System"
      )
    }
  )

  it("still opens the language radio menu and remembers the chosen locale", async () => {
    await render()
    const language = host.querySelector<HTMLButtonElement>("button")
    if (!language) throw new Error("Missing language control")
    await open(language)
    const english = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')
    ).find((item) => item.textContent === "English")
    if (!english) throw new Error("Missing English option")
    await flush(() => english.click())
    expect(language.textContent).toBe("EN")
    expect(language.getAttribute("aria-label")).toBe("Language : English")
    expect(window.localStorage.getItem("lyrx-locale")).toBe("en")
    expect(document.documentElement.lang).toBe("en")
  })

  it("retains real theme choices behind the equal-sized control", async () => {
    await render()
    const theme = host.querySelectorAll<HTMLButtonElement>("button").item(1)
    await open(theme)
    const dark = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')
    ).find((item) => item.textContent === "Sombre")
    if (!dark) throw new Error("Missing dark theme option")
    await flush(() => dark.click())
    expect(mocks.setTheme).toHaveBeenCalledWith("dark")
  })
})
