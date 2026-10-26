import { useEffect, useState, type RefObject } from "react"
import { Plus } from "lucide-react"
import { Button } from "@lyrx/ui/components/button"
import { lyricHeadingInsertion } from "./lyric-heading"

export function TextareaHeadingTools({
  textarea,
  headings,
  label,
  onChange,
  disabled = false,
}: {
  textarea: RefObject<HTMLTextAreaElement | null>
  headings: Array<string>
  label: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [supported, setSupported] = useState(false)
  useEffect(() => {
    // Native editing preserves the browser undo stack. There is no equivalent
    // standard API for programmatic textarea edits with undo history yet.
    setSupported(
      typeof document.execCommand === "function" &&
        typeof document.queryCommandSupported === "function" &&
        document.queryCommandSupported("insertText") === true
    )
  }, [])
  if (!supported) return null
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {headings.map((heading) => (
        <Button
          key={heading}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => {
            const input = textarea.current
            if (
              disabled ||
              !input ||
              input.disabled ||
              input.readOnly ||
              input.matches(":disabled")
            )
              return
            const edit = lyricHeadingInsertion(
              input.value,
              input.selectionStart,
              input.selectionEnd,
              heading
            )
            if (input.maxLength >= 0 && edit.text.length > input.maxLength)
              return
            input.focus()
            input.setSelectionRange(edit.start, edit.end)
            const changed = document.execCommand(
              "insertText",
              false,
              edit.inserted
            )
            if (!changed && input.value !== edit.text) {
              // Keep free writing and its native undo intact on unsupported engines;
              // never silently replace the whole controlled value as a fallback.
              setSupported(false)
              return
            }
            onChange(input.value)
            input.setSelectionRange(edit.caret, edit.caret)
          }}
        >
          <Plus data-icon="inline-start" />
          {heading}
        </Button>
      ))}
    </div>
  )
}
