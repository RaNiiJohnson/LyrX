import { ImagePlus } from "lucide-react"
import { useRef } from "react"
import { Button } from "@lyrx/ui/components/button"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import { Field, FieldDescription, FieldLabel } from "@lyrx/ui/components/field"
import { Input } from "@lyrx/ui/components/input"

import { useLocale } from "@/app/locale-provider"
import { OptionalLabel } from "./optional-label"

export function CatalogueArtworkCard({
  artworkUrl,
  inputId,
  pending,
  onSelect,
  selectedFile,
}: {
  artworkUrl?: string | null
  inputId: string
  pending: boolean
  onSelect: (file: File | undefined) => void
  selectedFile?: File
}) {
  const { t } = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("catalogue.artwork")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[10rem_1fr] sm:items-center">
        <div className="aspect-square overflow-hidden rounded-xl bg-muted">
          {artworkUrl ? (
            <img src={artworkUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <ImagePlus className="size-8" />
            </div>
          )}
        </div>
        <Field data-disabled={pending}>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor={inputId}>{t("catalogue.artwork")}</FieldLabel>
            <OptionalLabel />
          </div>
          <Input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
            onChange={(event) => onSelect(event.target.files?.[0])}
          />
          <FieldDescription>
            {pending
              ? t("catalogue.uploading")
              : t("catalogue.artworkDescription")}
          </FieldDescription>
          {selectedFile ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              disabled={pending}
              onClick={() => {
                if (inputRef.current) inputRef.current.value = ""
                onSelect(undefined)
              }}
            >
              {t("catalogue.clearArtworkSelection")}
            </Button>
          ) : null}
        </Field>
      </CardContent>
    </Card>
  )
}
