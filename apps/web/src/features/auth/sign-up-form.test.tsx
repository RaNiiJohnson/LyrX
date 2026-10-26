// @vitest-environment happy-dom

import { act, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LocaleProvider } from "@/app/locale-provider"
import { SignUpForm } from "./sign-up-form"
import { SignUpLayout } from "./sign-up-layout"

const mocks = vi.hoisted(() => ({
  capabilities: undefined as
    undefined | { google: boolean; emailDelivery: boolean },
  signUp: vi.fn(),
  google: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock("convex/react", () => ({ useQuery: () => mocks.capabilities }))
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signUp: { email: mocks.signUp },
    signIn: { social: mocks.google },
  },
}))
vi.mock("@lyrx/ui/lib/toast", () => ({
  toast: { success: mocks.success, error: mocks.error },
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, ...props }: ComponentProps<"a"> & { to: string }) => (
    <a href={to} {...props} />
  ),
}))

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement
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
        <SignUpLayout>
          <SignUpForm />
        </SignUpLayout>
      </LocaleProvider>
    )
  )
}
function input(id: string) {
  const node = document.getElementById(id)
  if (!(node instanceof HTMLInputElement))
    throw new Error(`Missing input ${id}`)
  return node
}
async function fill(id: string, value: string) {
  await flush(() => {
    const node = input(id)
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set?.call(node, value)
    node.dispatchEvent(new Event("input", { bubbles: true }))
    node.dispatchEvent(new Event("change", { bubbles: true }))
  })
}
function button(label: string) {
  const node = Array.from(document.querySelectorAll("button")).find(
    (item) => item.textContent === label
  )
  if (!node) throw new Error(`Missing button ${label}`)
  return node
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  window.localStorage.clear()
  mocks.capabilities = undefined
  mocks.signUp.mockReset().mockResolvedValue({ error: null })
  mocks.google.mockReset().mockResolvedValue({ error: null })
  mocks.success.mockClear()
  mocks.error.mockClear()
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await flush(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe("responsive sign-up composition", () => {
  it("keeps the photo panel desktop-only and the canonical required form available while providers load", async () => {
    await render()
    expect(document.querySelector("aside")?.className).toContain("hidden")
    expect(document.querySelector("aside")?.className).toContain("lg:flex")
    expect(document.querySelector("aside img")?.getAttribute("src")).toBe(
      "/images/lyrx-songwriter-hero.webp"
    )
    expect(document.querySelector("h1")?.textContent).toBe("Créer un compte")
    expect(document.querySelectorAll("form")).toHaveLength(1)
    for (const id of ["name", "email", "password"])
      expect(input(id).required).toBe(true)
    expect(input("password").minLength).toBe(10)
    expect(input("password").type).toBe("password")
    expect(
      document.querySelector('[aria-label="Chargement de Google"]')
    ).not.toBeNull()
    expect(
      document.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled
    ).toBe(true)
    expect(mocks.signUp).not.toHaveBeenCalled()
  })

  it("makes unavailable auth providers explicit and does not invoke disabled actions", async () => {
    mocks.capabilities = { google: false, emailDelivery: false }
    await render()
    expect(button("Continuer avec Google").disabled).toBe(true)
    expect(
      document.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled
    ).toBe(true)
    expect(document.querySelector('[role="alert"]')).not.toBeNull()
    expect(mocks.google).not.toHaveBeenCalled()
    expect(mocks.signUp).not.toHaveBeenCalled()
  })

  it("places the existing Google action before email fields and preserves its safe account destination", async () => {
    mocks.capabilities = { google: true, emailDelivery: true }
    await render()
    const googleButton = button("Continuer avec Google")
    expect(
      googleButton.compareDocumentPosition(input("name")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).not.toBe(0)
    await flush(() => googleButton.click())
    expect(mocks.google).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/account",
    })
    expect(googleButton.disabled).toBe(true)
  })

  it("saves through the existing Better Auth call and retains the verification notice", async () => {
    mocks.capabilities = { google: true, emailDelivery: true }
    await render()
    await fill("name", "A new member")
    await fill("email", "member@example.com")
    await fill("password", "a-long-test-password")
    await flush(() =>
      document
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        )
    )
    expect(mocks.signUp).toHaveBeenCalledWith({
      name: "A new member",
      email: "member@example.com",
      password: "a-long-test-password",
      callbackURL: "/account",
    })
    expect(mocks.success).toHaveBeenCalledOnce()
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "lien de vérification"
    )
  })

  it("keeps a provider failure actionable without discarding the entered email", async () => {
    mocks.capabilities = { google: true, emailDelivery: true }
    mocks.google.mockResolvedValue({ error: { code: "UNKNOWN_ERROR" } })
    await render()
    await fill("email", "retained@example.com")
    await flush(() => button("Continuer avec Google").click())
    expect(document.querySelector('[role="alert"]')).not.toBeNull()
    expect(button("Continuer avec Google").disabled).toBe(false)
    expect(input("email").value).toBe("retained@example.com")
    expect(mocks.error).toHaveBeenCalledOnce()
  })
})
