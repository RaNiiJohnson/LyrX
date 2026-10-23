import { ImagePlus } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
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
}: {
  artworkUrl?: string | null
  inputId: string
  pending: boolean
  onSelect: (file: File | undefined) => void
}) {
  const { t } = useLocale()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("catalogue.artwork")}</CardTitle>
        <CardDescription>{t("catalogue.artworkDescription")}</CardDescription>
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
        <Field>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor={inputId}>{t("catalogue.artwork")}</FieldLabel>
            <OptionalLabel />
          </div>
          <Input
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
        </Field>
      </CardContent>
    </Card>
  )
}
