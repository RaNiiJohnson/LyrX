// @vitest-environment happy-dom

import { act, useSyncExternalStore } from "react"
import type { ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LocaleProvider } from "@/app/locale-provider"
import { ProfileEditor } from "@/features/profile/profile-editor"

const mocks = vi.hoisted(() => ({ deleteUser: vi.fn(), mutation: vi.fn() }))
let memberState = "ready"
let revision = 0
const listeners = new Set<() => void>()

vi.mock("convex/react", () => ({
  useMutation: () => mocks.mutation,
  useQuery: (_reference: unknown, args: unknown) => {
    useSyncExternalStore(
      (listener) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
      () => revision
    )
    if (args === "skip") return undefined
    if (memberState !== "ready") return { state: memberState }
    return {
      state: "ready",
      member: { role: "fan" },
      profile: { handle: "fan", displayName: "Fan" },
      artistProfile: null,
    }
  },
}))
vi.mock("@/lib/auth-client", () => ({
  authClient: { deleteUser: mocks.deleteUser },
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))

let root: ReturnType<typeof createRoot>
let resolveDeletion: (value: unknown) => void
let redirects: Array<string>

function button(text: string) {
  const found = Array.from(document.querySelectorAll("button")).find(
    (item) => item.textContent === text
  )
  if (!found) throw new Error(`Button not found: ${text}`)
  return found
}

async function beginDeletion() {
  await act(() => {
    button("Supprimer mon compte").click()
  })
  const confirmation = document.querySelector<HTMLInputElement>(
    'input[name="confirmation"]'
  )
  if (!confirmation) throw new Error("Missing confirmation field")
  await act(() => {
    // Bypass React's input-value tracker to simulate an actual browser edit.
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set?.call(confirmation, "SUPPRIMER")
    confirmation.dispatchEvent(new Event("input", { bubbles: true }))
    confirmation.dispatchEvent(new Event("change", { bubbles: true }))
  })
  await act(() => {
    button("Supprimer définitivement").click()
  })
  expect(mocks.deleteUser).toHaveBeenCalledOnce()
}

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  vi.clearAllMocks()
  memberState = "ready"
  revision = 0
  redirects = []
  vi.spyOn(window.location, "assign").mockImplementation((url) => {
    redirects.push(String(url))
  })
  mocks.deleteUser.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveDeletion = resolve
      })
  )
  const container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  await act(() => {
    root.render(
      <LocaleProvider>
        <ProfileEditor />
      </LocaleProvider>
    )
  })
})

afterEach(async () => {
  await act(() => {
    root.unmount()
  })
  document.body.innerHTML = ""
  listeners.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("account deletion reactive transition", () => {
  it.each(["anonymous", "suspended", "onboarding-required"])(
    "does not flash %s state before native success and navigation",
    async (state) => {
      await beginDeletion()
      await act(() => {
        memberState = state
        revision += 1
        listeners.forEach((listener) => listener())
      })
      expect(document.body.textContent).not.toContain("Profil indisponible")
      expect(document.body.textContent).not.toContain("Compte suspendu")
      expect(document.querySelector('[role="alert"]')).toBeNull()
      await act(() => {
        resolveDeletion({ data: { success: true, message: "User deleted" } })
      })
      expect(redirects).toEqual(["/"])
      expect(document.querySelector('[role="alert"]')).toBeNull()
      expect(document.querySelector('input[name="handle"]')).toBeNull()
    }
  )

  it("keeps the profile and actionable error when native deletion fails", async () => {
    await beginDeletion()
    await act(() => {
      resolveDeletion({ error: { code: "INVALID_PASSWORD" } })
    })
    expect(redirects).toEqual([])
    expect(document.querySelector('input[name="handle"]')).not.toBeNull()
    expect(document.body.textContent).toContain(
      "Le mot de passe actuel est incorrect"
    )
    expect(button("Supprimer définitivement").disabled).toBe(false)
  })
})
