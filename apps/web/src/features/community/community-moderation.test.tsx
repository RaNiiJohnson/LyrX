// @vitest-environment happy-dom

import { act } from "react"
import type { ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { LocaleProvider } from "@/app/locale-provider"
import { CommunityReport } from "./community-moderation"

const mocks = vi.hoisted(() => ({
  resolve: vi.fn<(...args: Array<unknown>) => Promise<void>>(),
  success: vi.fn(),
  revision: 7,
}))

vi.mock("convex/react", async () => {
  const { getFunctionName } = await import("convex/server")
  return {
    useQuery: (reference: Parameters<typeof getFunctionName>[0]) =>
      getFunctionName(reference) === "members:current"
        ? { state: "ready", member: { role: "fan", isAdmin: true } }
        : {
            report: {
              reason: "Reporter's private reason",
              reportedRevision: 2,
            },
            contribution: {
              title: "Reported lyric",
              primaryArtist: "Credited artist",
              lyricsText: "Reported lyric text",
              status: "published",
              revision: mocks.revision,
            },
            decision: null,
          },
    useMutation: () => mocks.resolve,
    usePaginatedQuery: () => ({ results: [], status: "Exhausted" }),
  }
})
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))
vi.mock("@lyrx/ui/lib/toast", () => ({
  toast: { success: mocks.success },
}))

const reportId = "report-under-review" as Id<"communityReports">
let root: ReturnType<typeof createRoot>

async function flush(work: () => void) {
  await act(async () => {
    work()
    await Promise.resolve()
  })
}

function button(text: string) {
  const found = Array.from(document.querySelectorAll("button")).find(
    (element) => element.textContent === text
  )
  if (!found) throw new Error(`Missing button: ${text}`)
  return found
}

async function fillReason(value: string) {
  const textarea = document.querySelector<HTMLTextAreaElement>(
    'textarea[name="reason"]'
  )
  if (!textarea) throw new Error("Missing moderation reason")
  await flush(() => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    )?.set?.call(textarea, value)
    textarea.dispatchEvent(new Event("input", { bubbles: true }))
    textarea.dispatchEvent(new Event("change", { bubbles: true }))
  })
}

async function chooseAction(label: string) {
  const combobox = document.querySelector<HTMLElement>('[role="combobox"]')
  if (!combobox) throw new Error("Missing moderation action")
  await flush(() => {
    combobox.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    )
  })
  const option = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((element) => element.textContent === label)
  if (!option) throw new Error(`Missing moderation option: ${label}`)
  await flush(() => {
    option.click()
  })
}

async function submit() {
  await flush(() => {
    button("Enregistrer la décision").click()
  })
}

function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  mocks.resolve.mockReset().mockResolvedValue(undefined)
  mocks.success.mockReset()
  mocks.revision = 7
  const container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  await flush(() => {
    root.render(
      <LocaleProvider>
        <CommunityReport reportId={reportId} />
      </LocaleProvider>
    )
  })
})

afterEach(async () => {
  await flush(() => {
    root.unmount()
  })
  document.body.innerHTML = ""
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("community moderation interaction", () => {
  it("requires a reason before native submission", async () => {
    const textarea = document.querySelector<HTMLTextAreaElement>(
      'textarea[name="reason"]'
    )
    expect(textarea?.required).toBe(true)
    expect(textarea?.checkValidity()).toBe(false)
    await submit()
    expect(mocks.resolve).not.toHaveBeenCalled()
  })

  it.each(["", "   \n  "])(
    "rejects an empty or whitespace-only reason even for programmatic submission: %j",
    async (reason) => {
      await fillReason(reason)
      await flush(() => {
        document
          .querySelector("form")
          ?.dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true })
          )
      })
      expect(mocks.resolve).not.toHaveBeenCalled()
      expect(document.querySelector('[aria-invalid="true"]')).not.toBeNull()
    }
  )

  it.each([
    ["Classer sans retrait", "dismiss"],
    ["Masquer", "hide"],
  ])(
    "submits %s with the current revision and report identity",
    async (label, action) => {
      await chooseAction(label)
      await fillReason("Reviewed with a specific reason")
      await submit()
      expect(mocks.resolve).toHaveBeenCalledExactlyOnceWith({
        reportId,
        action,
        reason: "Reviewed with a specific reason",
        expectedRevision: 7,
      })
      expect(mocks.success).toHaveBeenCalledOnce()
    }
  )

  it("cancels removal without a mutation and requires confirmation again", async () => {
    await chooseAction("Retirer")
    await fillReason("Confirmed policy issue")
    await submit()
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull()
    expect(mocks.resolve).not.toHaveBeenCalled()
    await flush(() => {
      button("Annuler").click()
    })
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    expect(mocks.resolve).not.toHaveBeenCalled()
    await submit()
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull()
    expect(mocks.resolve).not.toHaveBeenCalled()
  })

  it("confirms removal once and blocks additional submissions while pending", async () => {
    const operation = deferred()
    mocks.resolve.mockReturnValue(operation.promise)
    await chooseAction("Retirer")
    await fillReason("Confirmed policy issue")
    await submit()
    await flush(() => {
      document
        .querySelector<HTMLButtonElement>('[data-slot="alert-dialog-action"]')
        ?.click()
    })
    expect(mocks.resolve).toHaveBeenCalledExactlyOnceWith({
      reportId,
      action: "remove",
      reason: "Confirmed policy issue",
      expectedRevision: 7,
    })
    expect(button("Enregistrer la décision").disabled).toBe(true)
    await submit()
    await flush(() => {
      document
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        )
    })
    expect(mocks.resolve).toHaveBeenCalledOnce()
    expect(button("Enregistrer la décision").disabled).toBe(true)
    await act(async () => {
      operation.resolve()
      await operation.promise
    })
    expect(mocks.success).toHaveBeenCalledOnce()
  })

  it("retains a genuine failure and reason, then permits a deliberate retry", async () => {
    const operation = deferred()
    mocks.resolve.mockReturnValueOnce(operation.promise)
    await chooseAction("Masquer")
    await fillReason("Reason retained after failure")
    await submit()
    await act(async () => {
      operation.reject(new Error("REVISION_CONFLICT"))
      await operation.promise.catch(() => undefined)
    })
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "Le contenu a changé. Rechargez la page avant de réessayer."
    )
    expect(
      document.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')
        ?.value
    ).toBe("Reason retained after failure")
    expect(button("Enregistrer la décision").disabled).toBe(false)
    expect(mocks.success).not.toHaveBeenCalled()
    await submit()
    expect(mocks.resolve).toHaveBeenCalledTimes(2)
    expect(mocks.success).toHaveBeenCalledOnce()
  })

  it("requires another explicit removal confirmation after a failed remove attempt", async () => {
    mocks.resolve.mockRejectedValueOnce(new Error("REVISION_CONFLICT"))
    await chooseAction("Retirer")
    await fillReason("Reason retained after failure")
    await submit()
    await flush(() => {
      document
        .querySelector<HTMLButtonElement>('[data-slot="alert-dialog-action"]')
        ?.click()
    })
    expect(mocks.resolve).toHaveBeenCalledOnce()
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "Le contenu a changé. Rechargez la page avant de réessayer."
    )
    await submit()
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull()
    expect(mocks.resolve).toHaveBeenCalledOnce()
  })

  it("does not reuse removal consent if a changed reason fails validation", async () => {
    await chooseAction("Retirer")
    await fillReason("Reason before confirmation")
    await submit()
    await fillReason("   ")
    await flush(() => {
      document
        .querySelector<HTMLButtonElement>('[data-slot="alert-dialog-action"]')
        ?.click()
    })
    expect(mocks.resolve).not.toHaveBeenCalled()
    await fillReason("Corrected moderation reason")
    await submit()
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull()
    expect(mocks.resolve).not.toHaveBeenCalled()
  })
})
