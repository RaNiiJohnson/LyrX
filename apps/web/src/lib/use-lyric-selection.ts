import { useEffect, useRef } from "react"
import { notebookSourceRange } from "@lyrx/shared"

type LyricRange = { start: number; end: number }

/** React onSelect can defer mouse selections. Read the native textarea range. */
export function useLyricSelection(
  source: string,
  onChange: (range: LyricRange) => void
) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const ownerDocument = element.ownerDocument
    let previous: LyricRange | null = null
    const update = (allowCollapsed: boolean) => {
      const start = element.selectionStart,
        end = element.selectionEnd
      // Selection handles can collapse on focus transfer. Keep the chosen passage
      // then; an explicit click/key release inside the textarea may clear it.
      if (!allowCollapsed && start === end) return
      const next = notebookSourceRange(source, start, end)
      if (previous?.start === next.start && previous.end === next.end) return
      previous = next
      onChange(next)
    }
    const selected = () => update(false)
    const documentSelection = () => {
      if (ownerDocument.activeElement === element) update(false)
    }
    const completed = () => {
      if (ownerDocument.activeElement === element) update(true)
    }
    element.addEventListener("select", selected)
    element.addEventListener("selectionchange", selected)
    element.addEventListener("keyup", completed)
    element.addEventListener("touchend", completed)
    ownerDocument.addEventListener("selectionchange", documentSelection)
    ownerDocument.addEventListener("pointerup", completed)
    ownerDocument.addEventListener("mouseup", completed)
    return () => {
      element.removeEventListener("select", selected)
      element.removeEventListener("selectionchange", selected)
      element.removeEventListener("keyup", completed)
      element.removeEventListener("touchend", completed)
      ownerDocument.removeEventListener("selectionchange", documentSelection)
      ownerDocument.removeEventListener("pointerup", completed)
      ownerDocument.removeEventListener("mouseup", completed)
    }
  }, [source, onChange])
  return ref
}
