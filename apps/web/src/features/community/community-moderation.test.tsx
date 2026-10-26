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
  status: "published",
  decision: null as null | { action: string; reason: string },
  latestRestoration: null as null | { reason: string },
  restore: vi.fn<(...args: Array<unknown>) => Promise<void>>(),
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
              status: mocks.status,
              revision: mocks.revision,
            },
            decision: mocks.decision,
            latestRestoration: mocks.latestRestoration,
          },
    useMutation: (reference: Parameters<typeof getFunctionName>[0]) =>
      getFunctionName(reference) === "community/moderation:restore"
        ? mocks.restore
        : mocks.resolve,
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
  mocks.status = "published"
  mocks.decision = null
  mocks.latestRestoration = null
  mocks.restore.mockReset().mockResolvedValue(undefined)
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
  async function hiddenContribution() {
    mocks.status = "hidden"
    mocks.decision = { action: "hide", reason: "Original hide reason remains" }
    await flush(() =>
      root.render(
        <LocaleProvider>
          <CommunityReport reportId={reportId} />
        </LocaleProvider>
      )
    )
  }

  it("offers restoration for a hidden contribution while preserving the original decision", async () => {
    await hiddenContribution()
    expect(document.body.textContent).toContain("Original hide reason remains")
    expect(
      document.querySelector<HTMLTextAreaElement>("#restorationReason")
        ?.required
    ).toBe(true)
    await flush(() => button("Rendre public").click())
    expect(mocks.restore).not.toHaveBeenCalled()
    await fillReason("   \n  ")
    await flush(() =>
      document
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        )
    )
    expect(mocks.restore).not.toHaveBeenCalled()
    expect(document.querySelector('[aria-invalid="true"]')).not.toBeNull()
  })

  it("restores with report, revision, reason and a stable request identity while preventing double submissions", async () => {
    await hiddenContribution()
    const operation = deferred()
    mocks.restore.mockReturnValueOnce(operation.promise)
    await fillReason("Reviewed the correction; restore visibility")
    await flush(() => button("Rendre public").click())
    expect(mocks.restore).toHaveBeenCalledExactlyOnceWith({
      reportId,
      expectedRevision: 7,
      reason: "Reviewed the correction; restore visibility",
      requestId: expect.any(String),
    })
    const requestId = (
      mocks.restore.mock.calls[0]?.[0] as { requestId: string }
    ).requestId
    expect(requestId).not.toHaveLength(0)
    expect(button("Rendre public").disabled).toBe(true)
    await flush(() =>
      document
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        )
    )
    expect(mocks.restore).toHaveBeenCalledOnce()
    await act(async () => {
      operation.reject(new Error("REVISION_CONFLICT"))
      await operation.promise.catch(() => undefined)
    })
    expect(document.body.textContent).toContain(
      "Le contenu a changé. Rechargez la page avant de réessayer."
    )
    expect(
      document.querySelector<HTMLTextAreaElement>("#restorationReason")?.value
    ).toBe("Reviewed the correction; restore visibility")
    await flush(() => button("Rendre public").click())
    expect(mocks.restore).toHaveBeenCalledTimes(2)
    expect(mocks.restore.mock.calls[1]?.[0]).toEqual({
      reportId,
      expectedRevision: 7,
      reason: "Reviewed the correction; restore visibility",
      requestId,
    })
    expect(document.body.textContent).toContain("Visibilité publique rétablie")
    expect(document.body.textContent).toContain("Original hide reason remains")
    expect(document.querySelector("#restorationReason")).toBeNull()
  })

  it("shows the latest restoration reason without removing the original hide reason", async () => {
    mocks.decision = { action: "hide", reason: "Original hide reason" }
    mocks.latestRestoration = { reason: "New restoration reason" }
    await flush(() =>
      root.render(
        <LocaleProvider>
          <CommunityReport reportId={reportId} />
        </LocaleProvider>
      )
    )
    expect(document.body.textContent).toContain("Original hide reason")
    expect(document.body.textContent).toContain("New restoration reason")
    expect(document.querySelector("#restorationReason")).toBeNull()
  })

  it("uses a fresh restoration identity after a new moderation context", async () => {
    await hiddenContribution()
    await fillReason("First deliberate restoration")
    await flush(() => button("Rendre public").click())
    const first = mocks.restore.mock.calls[0]?.[0] as { requestId: string }
    mocks.revision = 8
    await hiddenContribution()
    expect(
      document.querySelector<HTMLTextAreaElement>("#restorationReason")?.value
    ).toBe("")
    await fillReason("Second deliberate restoration")
    await flush(() => button("Rendre public").click())
    const second = mocks.restore.mock.calls[1]?.[0] as {
      requestId: string
      expectedRevision: number
    }
    expect(second.requestId).not.toBe(first.requestId)
    expect(second.expectedRevision).toBe(8)
  })

  it("never offers restore for removed content", async () => {
    mocks.status = "removed"
    mocks.decision = { action: "remove", reason: "Removed after review" }
    await flush(() =>
      root.render(
        <LocaleProvider>
          <CommunityReport reportId={reportId} />
        </LocaleProvider>
      )
    )
    expect(document.querySelector("#restorationReason")).toBeNull()
    expect(document.body.textContent).not.toContain("Rendre public")
  })

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
