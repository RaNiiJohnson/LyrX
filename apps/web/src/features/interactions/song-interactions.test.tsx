// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getFunctionName } from "convex/server"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { LocaleProvider } from "@/app/locale-provider"
import { SongInteractions } from "./song-interactions"
import { LikedSongs } from "./liked-songs"
import { CommentModeration } from "./comment-moderation"

const state = vi.hoisted(() => ({
  pageStatus: "Exhausted",
  reports: false,
  ready: true,
  admin: false,
  liked: false,
  likeCount: 2,
  mutation: vi.fn<(...args: Array<unknown>) => Promise<unknown>>(),
  calls: [] as Array<string>,
  comments: [] as Array<{
    id: string
    body: string
    createdAt: number
    author: { handle: string; displayName: string }
    isOwn: boolean
    canReport: boolean
  }>,
}))
vi.mock("convex/react", () => ({
  useQuery: (ref: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(ref) === "interactions/moderation:getReport"
      ? {
          report: { status: "open" },
          comment: { status: "public", body: "Reported comment" },
          source: null,
        }
      : getFunctionName(ref) === "members:current"
        ? state.ready
          ? {
              state: "ready",
              member: { isAdmin: state.admin, role: "fan" },
              profile: { handle: "me" },
            }
          : { state: "anonymous" }
        : { count: state.likeCount, liked: state.liked },
  useMutation: () => state.mutation,
  usePaginatedQuery: (ref: Parameters<typeof getFunctionName>[0]) => {
    state.calls.push(getFunctionName(ref))
    return {
      results:
        getFunctionName(ref) === "interactions/read:comments"
          ? state.comments
          : getFunctionName(ref) === "interactions/moderation:listReports" &&
              state.reports
            ? [{ _id: "report-id", _creationTime: 0, reason: "Private report" }]
            : [],
      status: state.pageStatus,
      loadMore: vi.fn(),
    }
  },
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params: _params,
    ...props
  }: {
    children: ReactNode
    to: string
    params?: unknown
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))
vi.mock("@lyrx/ui/lib/toast", () => ({ toast: { success: vi.fn() } }))
let container: HTMLDivElement, root: ReturnType<typeof createRoot>
const sourceId = "test-song" as Id<"songs">
async function render(
  node: ReactNode = <SongInteractions sourceId={sourceId} />
) {
  await act(() => root.render(<LocaleProvider>{node}</LocaleProvider>))
}
async function type(value: string) {
  const input = document.querySelector("textarea")!
  await act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    )!.set!.call(input, value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
    input.dispatchEvent(new Event("change", { bubbles: true }))
  })
}
async function openOptions() {
  const trigger = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Options du commentaire"]'
  )!
  await act(() =>
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      })
    )
  )
}
async function submit() {
  await act(() => {
    document
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
  })
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  localStorage.clear()
  state.pageStatus = "Exhausted"
  state.reports = false
  state.ready = true
  state.admin = false
  state.liked = false
  state.likeCount = 2
  state.comments = []
  state.calls = []
  state.mutation.mockReset()
  state.mutation.mockResolvedValue(null)
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})
const comment = (isOwn: boolean) => ({
  id: "comment-id",
  body: "<script>unsafe()</script>\nPlain text",
  createdAt: 0,
  author: { handle: "author", displayName: "A commenter" },
  isOwn,
  canReport: !isOwn,
})
describe("song interactions", () => {
  it("shows public likes/comments but gates writing when signed out", async () => {
    state.ready = false
    state.comments = [{ ...comment(false), canReport: false }]
    await render()
    expect(
      container.querySelector('a[aria-label="Se connecter pour participer"]')
        ?.textContent
    ).toBe("2")
    expect(container.querySelector('a[href="/account"]')).not.toBeNull()
    expect(container.querySelector("form")).toBeNull()
    expect(container.querySelector("script")).toBeNull()
    expect(container.textContent).toContain("<script>unsafe()</script>")
    expect(state.mutation).not.toHaveBeenCalled()
  })
  it("sets the requested like state once while pending and retains localized errors", async () => {
    let reject!: (error: Error) => void
    state.mutation.mockImplementation(
      () =>
        new Promise((_resolve, no) => {
          reject = no
        })
    )
    await render()
    const button = Array.from(container.querySelectorAll("button")).find(
      (x) => x.getAttribute("aria-label") === "J’aime"
    )!
    await act(() => {
      button.click()
      button.click()
    })
    expect(state.mutation).toHaveBeenCalledTimes(1)
    expect(state.mutation).toHaveBeenCalledWith({ sourceId, liked: true })
    expect(button.disabled).toBe(true)
    expect(button.getAttribute("aria-pressed")).toBe("true")
    expect(button.textContent).toBe("3")
    await act(async () => {
      reject(new Error("Private server text"))
      await Promise.resolve()
    })
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    expect(container.textContent).not.toContain("Private server text")
    expect(button.disabled).toBe(false)
    expect(button.getAttribute("aria-pressed")).toBe("false")
    expect(button.textContent).toBe("2")
  })
  it("rebases likes over live counts without doubling the confirmed increment", async () => {
    let resolve!: () => void
    state.mutation.mockImplementation(
      () =>
        new Promise<void>((yes) => {
          resolve = yes
        })
    )
    await render()
    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="J’aime"]'
    )!
    await act(() => button.click())
    expect(button.textContent).toBe("3")
    state.likeCount = 7 // Other members also liked the song while this request ran.
    await render()
    expect(button.textContent).toBe("8")
    state.liked = true
    state.likeCount = 8
    await render()
    expect(button.textContent).toBe("8")
    await act(async () => {
      resolve()
      await Promise.resolve()
    })
    expect(button.textContent).toBe("8")
    expect(button.getAttribute("aria-pressed")).toBe("true")
    expect(button.disabled).toBe(false)
  })
  it("optimistically unlikes and restores the original heart/count on failure", async () => {
    state.liked = true
    let reject!: (error: Error) => void
    state.mutation.mockImplementation(
      () =>
        new Promise((_yes, no) => {
          reject = no
        })
    )
    await render()
    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Je n’aime plus"]'
    )!
    await act(() => button.click())
    expect(button.getAttribute("aria-pressed")).toBe("false")
    expect(button.textContent).toBe("1")
    await act(async () => {
      reject(new Error("offline"))
      await Promise.resolve()
    })
    expect(button.getAttribute("aria-pressed")).toBe("true")
    expect(button.textContent).toBe("2")
  })
  it("shows a pending comment immediately, rolls it back and reconciles its retry once", async () => {
    let resolve!: () => void, reject!: (error: Error) => void
    state.mutation.mockImplementation(
      () =>
        new Promise<void>((yes, no) => {
          resolve = yes
          reject = no
        })
    )
    await render()
    await type("  A new comment  ")
    await submit()
    const row = container.querySelector('li[aria-busy="true"]')!
    expect(row.textContent).toContain("A new comment")
    expect(row.textContent).toContain("Envoi…")
    expect(
      row.querySelector('button[aria-label="Options du commentaire"]')
    ).toBeNull()
    expect(
      container.querySelector('button[aria-label="Voir les commentaires"]')
        ?.textContent
    ).toBe("1")
    await submit()
    expect(state.mutation).toHaveBeenCalledTimes(1)
    await act(async () => {
      reject(new Error("offline"))
      await Promise.resolve()
    })
    expect(container.querySelector("li")).toBeNull()
    expect(document.querySelector("textarea")?.value).toBe("  A new comment  ")
    const request = state.mutation.mock.calls[0]![0]
    await submit()
    expect(state.mutation.mock.calls[1]![0]).toEqual(request)
    state.comments = [
      {
        ...comment(true),
        body: "A new comment",
        author: { handle: "me", displayName: "me" },
      },
    ]
    await render()
    expect(container.querySelectorAll("li")).toHaveLength(1)
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
    await act(async () => {
      resolve()
      await Promise.resolve()
    })
    expect(container.querySelectorAll("li")).toHaveLength(1)
    expect(document.querySelector("textarea")?.value).toBe("")
  })
  it("keeps an identical existing comment and a new pending submission distinct", async () => {
    state.comments = [
      {
        ...comment(true),
        body: "Same words",
        author: { handle: "me", displayName: "me" },
      },
    ]
    let resolve!: () => void
    state.mutation.mockImplementation(
      () =>
        new Promise<void>((yes) => {
          resolve = yes
        })
    )
    await render()
    await type("Same words")
    await submit()
    expect(container.querySelectorAll("li")).toHaveLength(2)
    state.comments = [
      ...state.comments,
      { ...state.comments[0]!, id: "second-comment" },
    ]
    await render()
    expect(container.querySelectorAll("li")).toHaveLength(2)
    await act(async () => {
      resolve()
      await Promise.resolve()
    })
    expect(container.querySelectorAll("li")).toHaveLength(2)
  })
  it("rolls back a rejected comment even while a separate like Action remains pending", async () => {
    let resolveLike!: () => void, rejectComment!: (error: Error) => void
    state.mutation.mockImplementation((args) =>
      typeof args === "object" && args !== null && "liked" in args
        ? new Promise<void>((yes) => {
            resolveLike = yes
          })
        : new Promise((_yes, no) => {
            rejectComment = no
          })
    )
    await render()
    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="J’aime"]'
    )!
    await act(() => button.click())
    await type("Temporary comment")
    await submit()
    expect(container.querySelector('li[aria-busy="true"]')).not.toBeNull()
    await act(async () => {
      rejectComment(new Error("offline"))
      await Promise.resolve()
    })
    expect(container.querySelector("li")).toBeNull()
    expect(button.disabled).toBe(true)
    expect(button.textContent).toBe("3")
    state.liked = true
    state.likeCount = 3
    await render()
    await act(async () => {
      resolveLike()
      await Promise.resolve()
    })
  })
  it("shows the pending comment even before the first comment page loads", async () => {
    state.pageStatus = "LoadingFirstPage"
    let reject!: (error: Error) => void
    state.mutation.mockImplementation(
      () =>
        new Promise((_yes, no) => {
          reject = no
        })
    )
    await render()
    await type("Immediate preview")
    await submit()
    expect(
      container.querySelector('li[aria-busy="true"]')?.textContent
    ).toContain("Immediate preview")
    await act(async () => {
      reject(new Error("offline"))
      await Promise.resolve()
    })
    expect(container.querySelector("li")).toBeNull()
  })
  it("hides a pending own comment when the member loses their ready session", async () => {
    let reject!: (error: Error) => void
    state.mutation.mockImplementation(
      () =>
        new Promise((_yes, no) => {
          reject = no
        })
    )
    await render()
    await type("Session-bound preview")
    await submit()
    state.ready = false
    await render()
    expect(container.querySelector("li")).toBeNull()
    expect(container.querySelector("textarea")).toBeNull()
    await act(async () => {
      reject(new Error("session ended"))
      await Promise.resolve()
    })
  })
  it("drops a pending preview when navigating to another source", async () => {
    let reject!: (error: Error) => void
    state.mutation.mockImplementation(
      () =>
        new Promise((_yes, no) => {
          reject = no
        })
    )
    await render()
    await type("Only on the first song")
    await submit()
    await render(<SongInteractions sourceId={"another-song" as Id<"songs">} />)
    expect(container.querySelector("li")).toBeNull()
    expect(document.querySelector("textarea")?.value).toBe("")
    await act(async () => {
      reject(new Error("offline"))
      await Promise.resolve()
    })
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })
  it("rejects whitespace; keeps draft and identical request id after failure, clears after success", async () => {
    await render()
    await type("   ")
    await submit()
    expect(state.mutation).not.toHaveBeenCalled()
    await type("A new comment")
    state.mutation.mockRejectedValueOnce(new Error("offline"))
    await submit()
    expect(document.querySelector("textarea")?.value).toBe("A new comment")
    const request = state.mutation.mock.calls[0]![0]
    await submit()
    expect(state.mutation.mock.calls[1]![0]).toEqual(request)
    expect(document.querySelector("textarea")?.value).toBe("")
  })
  it("offers own deletion with confirmation and cannot report own comments", async () => {
    state.comments = [comment(true)]
    await render()
    expect(container.textContent).not.toContain("Signaler")
    await openOptions()
    const remove = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((x) => x.textContent === "Supprimer")!
    await act(() => remove.click())
    expect(
      document.querySelector('[role="alertdialog"]')?.textContent
    ).toContain("Le texte sera effacé")
    expect(state.mutation).not.toHaveBeenCalled()
    const cancel = Array.from(document.querySelectorAll("button")).find(
      (x) => x.textContent === "Annuler"
    )!
    await act(() => cancel.click())
    expect(state.mutation).not.toHaveBeenCalled()
  })
  it("reports others through an accessible reason dialog and keeps errors/draft", async () => {
    state.comments = [comment(false)]
    await render()
    await openOptions()
    const report = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((x) => x.textContent === "Signaler")!
    await act(() => report.click())
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.getAttribute("aria-labelledby")).not.toBeNull()
    const textarea = dialog.querySelector("textarea")!
    await act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )!.set!.call(textarea, "Private report")
      textarea.dispatchEvent(new Event("input", { bubbles: true }))
      textarea.dispatchEvent(new Event("change", { bubbles: true }))
    })
    state.mutation.mockRejectedValueOnce(new Error("offline"))
    await act(() => {
      dialog
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    })
    expect(textarea.value).toBe("Private report")
    expect(dialog.querySelector('[role="alert"]')).not.toBeNull()
    expect(state.mutation).toHaveBeenCalledWith({
      commentId: "comment-id",
      reason: "Private report",
      category: "spam",
    })
  })
  it("does not subscribe to private liked songs for anonymous members", async () => {
    state.ready = false
    await render(<LikedSongs />)
    expect(state.calls).not.toContain("interactions/read:likedSongs")
    state.ready = true
    await render(<LikedSongs />)
    expect(state.calls).toContain("interactions/read:likedSongs")
  })
  it("does not subscribe to moderation reports for nonadmins", async () => {
    await render(<CommentModeration />)
    expect(state.calls).not.toContain("interactions/moderation:listReports")
    state.admin = true
    await render(<CommentModeration />)
    expect(state.calls).toContain("interactions/moderation:listReports")
  })
  it("requires a reason before an admin decision, retains failures and retries", async () => {
    state.admin = true
    state.reports = true
    await render(<CommentModeration />)
    const review = Array.from(container.querySelectorAll("button")).find(
      (x) => x.textContent === "Examiner"
    )!
    await act(() => review.click())
    await type("   ")
    await submit()
    expect(state.mutation).not.toHaveBeenCalled()
    await type("Allowed comment")
    state.mutation.mockRejectedValueOnce(new Error("offline"))
    await submit()
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    expect(document.querySelector("textarea")?.value).toBe("Allowed comment")
    await submit()
    expect(state.mutation).toHaveBeenLastCalledWith({
      reportId: "report-id",
      action: "dismiss",
      reason: "Allowed comment",
    })
  })
  it("shows the 500-character composer and labels partial loaded counts without a false total", async () => {
    state.pageStatus = "CanLoadMore"
    state.comments = [comment(true)]
    await render()
    expect(document.querySelector("textarea")?.maxLength).toBe(500)
    expect(container.textContent).toContain("0 / 500")
    expect(
      container.querySelector('button[aria-label="Voir les commentaires"]')
        ?.textContent
    ).toBe("1+")
    expect(container.textContent).toContain("Vous")
    await type("A comment")
    expect(container.textContent).toContain("9 / 500")
  })
  it("submits a selected report category without requiring optional details", async () => {
    state.comments = [comment(false)]
    await render()
    await openOptions()
    const item = document.querySelector<HTMLElement>('[role="menuitem"]')!
    await act(() => item.click())
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.querySelectorAll('[role="radio"]')).toHaveLength(4)
    expect(dialog.querySelector("blockquote")?.textContent).toContain(
      "<script>unsafe()"
    )
    await act(() => {
      dialog
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    })
    expect(state.mutation).toHaveBeenCalledWith({
      commentId: "comment-id",
      category: "spam",
      reason: "",
    })
  })
})
