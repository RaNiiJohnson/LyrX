import { LayoutGrid, List } from "lucide-react"
import { useEffect, useState } from "react"

import { ToggleGroup, ToggleGroupItem } from "@lyrx/ui/components/toggle-group"

import { useLocale } from "@/app/locale-provider"

export type ViewMode = "cards" | "list"
const STORAGE_KEY = "lyrx-view-mode"

function readStoredMode(): ViewMode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "list"
      ? "list"
      : "cards"
  } catch {
    return "cards"
  }
}

/**
 * Cards or list for public song/album collections (not the home page). The
 * choice is a per-device convenience: it starts as "cards" on the server and
 * on first paint, then follows what this browser last chose.
 */
export function useViewMode() {
  const [mode, setMode] = useState<ViewMode>("cards")
  useEffect(() => {
    setMode(readStoredMode())
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setMode(readStoredMode())
    }
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])
  const change = (next: ViewMode) => {
    setMode(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Private browsing or blocked storage: the choice lasts for this page.
    }
  }
  return [mode, change] as const
}

export function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}) {
  const { t } = useLocale()
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={mode}
      aria-label={t("view.label")}
      onValueChange={(value) => {
        if (value === "cards" || value === "list") onChange(value)
      }}
    >
      <ToggleGroupItem
        value="cards"
        aria-label={t("view.cards")}
        title={t("view.cards")}
      >
        <LayoutGrid />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="list"
        aria-label={t("view.list")}
        title={t("view.list")}
      >
        <List />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
