// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { RecordPublicView } from "./record-public-view"

const mocks = vi.hoisted<{
  current: unknown
  record: ReturnType<typeof vi.fn>
}>(() => ({
  current: undefined,
  record: vi.fn(),
}))
vi.mock("convex/react", () => ({
  useQuery: () => mocks.current,
  useMutation: () => mocks.record,
}))
let root: ReturnType<typeof createRoot>
let container: HTMLDivElement
const song = "songs:first" as Id<"songs">
const other = "community:second" as Id<"communityContributions">

async function render(
  origin: "artist" | "community" = "artist",
  sourceId: Id<"songs"> | Id<"communityContributions"> = song
) {
  await act(async () => {
    root.render(<RecordPublicView origin={origin} sourceId={sourceId} />)
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  mocks.current = undefined
  mocks.record.mockReset().mockResolvedValue({ counted: true })
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

describe("best effort public view recording", () => {
  it.each([
    undefined,
    null,
    { state: "anonymous" },
    { state: "onboarding" },
    { state: "suspended" },
  ])(
    "does not record an unresolved, anonymous or ineligible session: %j",
    async (current) => {
      mocks.current = current
      await render()
      expect(mocks.record).not.toHaveBeenCalled()
      expect(container.innerHTML).toBe("")
    }
  )

  it("records once after the member is ready and sends no client-selected viewer", async () => {
    await render()
    mocks.current = { state: "ready", member: { _id: "members:one" } }
    await render()
    await render()
    expect(mocks.record).toHaveBeenCalledExactlyOnceWith({
      origin: "artist",
      sourceId: song,
    })
  })

  it("records a new source and a changed ready account independently", async () => {
    mocks.current = { state: "ready", member: { _id: "members:one" } }
    await render()
    await render("community", other)
    mocks.current = { state: "ready", member: { _id: "members:two" } }
    await render("community", other)
    expect(mocks.record.mock.calls).toEqual([
      [{ origin: "artist", sourceId: song }],
      [{ origin: "community", sourceId: other }],
      [{ origin: "community", sourceId: other }],
    ])
  })

  it("consumes a rejected telemetry request without rendering an error or retrying on rerender", async () => {
    mocks.current = { state: "ready", member: { _id: "members:one" } }
    mocks.record.mockRejectedValue(new Error("ranking temporarily unavailable"))
    await render()
    await render()
    expect(mocks.record).toHaveBeenCalledTimes(1)
    expect(container.innerHTML).toBe("")
  })
})
