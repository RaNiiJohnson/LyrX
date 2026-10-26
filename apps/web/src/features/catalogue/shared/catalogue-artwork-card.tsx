import { ImagePlus } from "lucide-react"
import { useState } from "react"

import { useLocale } from "@/app/locale-provider"
import { ImageUploadField } from "@/lib/image-upload-field"

export function CatalogueArtworkCard({
  artworkUrl,
  inputId,
  pending,
  onSelect,
  selectedFile,
  stacked = false,
}: {
  artworkUrl?: string | null
  inputId: string
  pending: boolean
  onSelect: (file: File | undefined) => void
  selectedFile?: File
  stacked?: boolean
}) {
  const { t } = useLocale()
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  return (
    <ImageUploadField
      id={inputId}
      label={t("catalogue.artwork")}
      description={
        pending ? t("catalogue.uploading") : t("catalogue.artworkDescription")
      }
      pending={pending}
      currentImage={Boolean(artworkUrl || selectedFile)}
      onSelect={onSelect}
      stacked={stacked}
      selectedFile={selectedFile}
      clearLabel={t("catalogue.clearArtworkSelection")}
      onClear={() => onSelect(undefined)}
      preview={
        <span className="grid size-24 place-items-center overflow-hidden rounded-xl sm:size-40">
          {artworkUrl && artworkUrl !== failedUrl ? (
            <img
              src={artworkUrl}
              alt=""
              className="size-full object-cover"
              onError={() => setFailedUrl(artworkUrl)}
            />
          ) : (
            <ImagePlus />
          )}
        </span>
      }
    />
  )
}
