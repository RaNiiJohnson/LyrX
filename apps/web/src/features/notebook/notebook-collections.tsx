import { useRef, useState } from "react"
import { MoreHorizontal, Plus } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Button } from "@lyrx/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@lyrx/ui/components/dropdown-menu"
import { useLocale } from "@/app/locale-provider"
import { CollectionDialog } from "./collection-dialog"
import { CollectionSelect, type Collection } from "./collection-select"
import { NotebookConfirm } from "./notebook-confirm"

export function NotebookCollections({
  collections,
  value,
  onChange,
}: {
  collections: Array<Collection>
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useLocale()
  const createTrigger = useRef<HTMLButtonElement>(null),
    optionsTrigger = useRef<HTMLButtonElement>(null)
  const [editing, setEditing] = useState<Collection | "new" | null>(null)
  const [removing, setRemoving] = useState<Collection | null>(null)
  const remove = useMutation(api.notebook.write.deleteCollection)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">{t("notebook.collections")}</h2>
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={() => setEditing("new")}
          ref={createTrigger}
          aria-label={t("notebook.newCollection")}
        >
          <Plus />
        </Button>
      </div>
      <div className="lg:hidden">
        <CollectionSelect
          all
          collections={collections}
          value={value}
          onChange={onChange}
        />
      </div>
      <nav
        className="hidden flex-col gap-2 lg:flex"
        aria-label={t("notebook.collections")}
      >
        {[
          { id: "all", name: t("notebook.all") },
          { id: "default", name: t("notebook.default") },
          ...collections,
        ].map((row) => (
          <div key={row.id} className="flex min-w-0 items-center gap-1">
            <Button
              variant={value === row.id ? "secondary" : "ghost"}
              className="min-h-11 min-w-0 flex-1 justify-start"
              aria-current={value === row.id ? "page" : undefined}
              onClick={() => onChange(row.id)}
            >
              <span className="truncate">{row.name}</span>
            </Button>
          </div>
        ))}
      </nav>
      {collections.map((row) =>
        row.id === value ? (
          <DropdownMenu key={row.id}>
            <DropdownMenuTrigger asChild>
              <Button ref={optionsTrigger} variant="outline">
                <MoreHorizontal data-icon="inline-start" />
                {t("notebook.collectionOptions")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => setEditing(row)}>
                  {t("notebook.rename")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setRemoving(row)}>
                  {t("notebook.deleteCollection")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null
      )}
      {editing && (
        <CollectionDialog
          collection={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onCreated={onChange}
          onReturnFocus={() =>
            (editing === "new"
              ? createTrigger
              : optionsTrigger
            ).current?.focus()
          }
        />
      )}
      {removing && (
        <NotebookConfirm
          title={t("notebook.deleteCollection")}
          description={t("notebook.deleteCollectionHint")}
          onClose={() => setRemoving(null)}
          onReturnFocus={() => createTrigger.current?.focus()}
          onConfirm={async () => {
            await remove({ collectionId: removing.id })
            onChange("default")
          }}
        />
      )}
    </div>
  )
}
