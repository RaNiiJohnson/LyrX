import { useLocale } from "@/app/locale-provider"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lyrx/ui/components/select"

export type Collection = { id: Id<"notebookCollections">; name: string }
export const collectionValue = (id: Id<"notebookCollections"> | null) =>
  id ?? "default"
export const collectionId = (value: string) =>
  value === "default" ? null : (value as Id<"notebookCollections">)

export function CollectionSelect({
  collections,
  value,
  onChange,
  all = false,
  id,
  disabled,
}: {
  collections: Array<Collection>
  value: string
  onChange: (value: string) => void
  all?: boolean
  id?: string
  disabled?: boolean
}) {
  const { t } = useLocale()
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        className="min-h-11 w-full min-w-0"
        aria-label={t("notebook.collection")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {all && <SelectItem value="all">{t("notebook.all")}</SelectItem>}
          <SelectItem value="default">{t("notebook.default")}</SelectItem>
          {collections.map((row) => (
            <SelectItem key={row.id} value={row.id}>
              <span className="block max-w-64 truncate">{row.name}</span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
