// @vitest-environment happy-dom
import { act, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TextareaHeadingTools } from "./textarea-heading-tools"

let root: ReturnType<typeof createRoot>
let container: HTMLDivElement
const onChange = vi.fn()
const onSubmit = vi.fn()
const insertText = vi.fn((_command: string, _showUi: boolean, text: string) => {
  const input = document.activeElement
  if (!(input instanceof HTMLTextAreaElement)) return false
  input.setRangeText(text, input.selectionStart, input.selectionEnd, "end")
  return true
})

function Harness({
  disabled = false,
  maxLength = -1,
  value = "original lyrics",
}) {
  const textarea = useRef<HTMLTextAreaElement>(null)
  const [source, setSource] = useState(value)
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <TextareaHeadingTools
        textarea={textarea}
        headings={["Couplet", "Refrain", "Pont"]}
        label="Optional headings"
        onChange={(next) => {
          onChange(next)
          setSource(next)
        }}
      />
      <textarea
        ref={textarea}
        disabled={disabled}
        maxLength={maxLength}
        value={source}
        onChange={(event) => setSource(event.target.value)}
      />
    </form>
  )
}

async function render(props: Parameters<typeof Harness>[0] = {}) {
  await act(async () => {
    root.render(<Harness {...props} />)
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: insertText,
  })
  Object.defineProperty(document, "queryCommandSupported", {
    configurable: true,
    value: vi.fn(() => true),
  })
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  insertText.mockClear()
  onChange.mockClear()
  onSubmit.mockClear()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  Reflect.deleteProperty(document, "execCommand")
  Reflect.deleteProperty(document, "queryCommandSupported")
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("optional native textarea heading tools", () => {
  it("keeps free writing available without unsupported native editing controls", async () => {
    Object.defineProperty(document, "queryCommandSupported", {
      configurable: true,
      value: () => false,
    })
    await render()
    expect(container.querySelector('[role="group"]')).toBeNull()
    expect(container.querySelector("textarea")?.value).toBe("original lyrics")
  })

  it("edits the current selection through insertText, updates controlled state and focuses the writing caret", async () => {
    await render({ value: "first selected last" })
    const input = container.querySelector("textarea")!
    input.setSelectionRange(6, 14)
    await act(async () => {
      container.querySelector<HTMLButtonElement>("button")!.click()
      await Promise.resolve()
    })
    expect(insertText).toHaveBeenCalledWith(
      "insertText",
      false,
      "\n[Couplet]\n\n"
    )
    expect(input.value).toBe("first \n[Couplet]\n\n last")
    expect(onChange).toHaveBeenCalledWith(input.value)
    expect(document.activeElement).toBe(input)
    expect(input.selectionStart).toBe(17)
    expect(input.selectionEnd).toBe(17)
    expect(container.querySelector("button")?.type).toBe("button")
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("leaves value, selection and native editing untouched when insertion would exceed maxLength", async () => {
    await render({ maxLength: 15 })
    const input = container.querySelector("textarea")!
    input.setSelectionRange(2, 2)
    await act(async () => {
      container.querySelector<HTMLButtonElement>("button")!.click()
      await Promise.resolve()
    })
    expect(input.value).toBe("original lyrics")
    expect(input.selectionStart).toBe(2)
    expect(insertText).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it("does not insert while the textarea is disabled", async () => {
    await render({ disabled: true })
    const buttons = [...container.querySelectorAll("button")]
    expect(buttons).toHaveLength(3)
    expect(buttons.every((button) => button.disabled)).toBe(true)
    await act(async () => {
      buttons[0]!.click()
      await Promise.resolve()
    })
    expect(insertText).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it("hides failed native editing tools without replacing the existing source", async () => {
    insertText.mockImplementationOnce(() => false)
    await render()
    await act(async () => {
      container.querySelector<HTMLButtonElement>("button")!.click()
      await Promise.resolve()
    })
    expect(container.querySelector('[role="group"]')).toBeNull()
    expect(container.querySelector("textarea")?.value).toBe("original lyrics")
    expect(onChange).not.toHaveBeenCalled()
  })
})
