import type { Doc } from "@lyrx/backend/convex/_generated/dataModel"
import { Checkbox } from "@lyrx/ui/components/checkbox"
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@lyrx/ui/components/field"

import { useLocale } from "@/app/locale-provider"
import { applyAlbumDefaults } from "@/features/catalogue/lib/catalogue-form"
import { withForm } from "@/lib/app-form"
import { songFormOptions } from "./song-form-options"

export const SongBasicsStep = withForm({
  ...songFormOptions,
  props: { albums: [] as Array<Doc<"albums">> },
  render: function SongBasicsStepFields({ form, albums }) {
    const { t } = useLocale()
    return (
      <FieldGroup>
        <FieldSet>
          <FieldLegend>{t("studio.releaseContext")}</FieldLegend>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <form.AppField name="releaseType">
              {(field) => (
                <field.SelectField
                  label={t("studio.releaseType")}
                  options={[
                    { label: t("studio.releaseSingle"), value: "single" },
                    { label: t("studio.releaseAlbumTrack"), value: "album" },
                  ]}
                  onValueChange={(value) => {
                    if (value === "single") {
                      form.setFieldValue("albumId", "")
                      form.setFieldValue("inheritArtwork", false)
                      form.setFieldValue("inheritPrimaryLanguage", false)
                      form.setFieldValue("inheritGenre", false)
                      form.setFieldValue("inheritLabel", false)
                      form.setFieldValue("inheritCredits", false)
                    }
                  }}
                />
              )}
            </form.AppField>
            <form.Subscribe selector={(state) => state.values.releaseType}>
              {(releaseType) =>
                releaseType === "album" ? (
                  <form.AppField
                    name="albumId"
                    validators={{
                      onBlur: ({ value }) =>
                        value ? undefined : t("studio.chooseAlbum"),
                    }}
                  >
                    {(field) => (
                      <field.SelectField
                        label={t("studio.album")}
                        required
                        placeholder={t("studio.chooseAlbum")}
                        options={albums.map((album) => ({
                          label: album.title,
                          value: album._id,
                        }))}
                        onValueChange={(albumId) => {
                          const album = albums.find(
                            (candidate) => candidate._id === albumId
                          )
                          if (!album) return
                          const next = applyAlbumDefaults(
                            form.state.values,
                            album
                          )
                          form.setFieldValue(
                            "primaryLanguage",
                            next.primaryLanguage
                          )
                          form.setFieldValue("genre", next.genre)
                          form.setFieldValue("otherGenre", next.otherGenre)
                          form.setFieldValue("label", next.label)
                          form.setFieldValue(
                            "additionalCredits",
                            next.additionalCredits
                          )
                          form.setFieldValue("inheritArtwork", true)
                          form.setFieldValue("inheritPrimaryLanguage", true)
                          form.setFieldValue("inheritGenre", true)
                          form.setFieldValue("inheritLabel", true)
                          form.setFieldValue("inheritCredits", true)
                        }}
                      />
                    )}
                  </form.AppField>
                ) : null
              }
            </form.Subscribe>
          </FieldGroup>
          <form.Subscribe
            selector={(state) =>
              [state.values.releaseType, state.values.albumId] as const
            }
          >
            {([releaseType, albumId]) =>
              releaseType === "album" && albumId ? (
                <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
                  <div>
                    <p className="font-medium">
                      {t("studio.inheritedMetadata")}
                    </p>
                    <FieldDescription>
                      {t("studio.inheritedMetadataDescription")}
                    </FieldDescription>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InheritanceCheckbox
                      form={form}
                      name="inheritArtwork"
                      label={t("catalogue.artwork")}
                    />
                    <InheritanceCheckbox
                      form={form}
                      name="inheritGenre"
                      label={t("studio.genre")}
                      onEnable={() => {
                        const album = albums.find(
                          (candidate) => candidate._id === albumId
                        )
                        form.setFieldValue("genre", album?.genre ?? "")
                        form.setFieldValue(
                          "otherGenre",
                          album?.otherGenre ?? ""
                        )
                      }}
                    />
                    <InheritanceCheckbox
                      form={form}
                      name="inheritLabel"
                      label={t("studio.label")}
                      onEnable={() => {
                        const album = albums.find(
                          (candidate) => candidate._id === albumId
                        )
                        form.setFieldValue("label", album?.label ?? "")
                      }}
                    />
                    <InheritanceCheckbox
                      form={form}
                      name="inheritCredits"
                      label={t("studio.generalCredits")}
                      onEnable={() => {
                        const album = albums.find(
                          (candidate) => candidate._id === albumId
                        )
                        form.setFieldValue(
                          "additionalCredits",
                          album?.credits.join("\n") ?? ""
                        )
                      }}
                    />
                  </div>
                </div>
              ) : null
            }
          </form.Subscribe>
        </FieldSet>
        <FieldSet>
          <FieldLegend>{t("studio.essentialInformation")}</FieldLegend>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <form.AppField
              name="title"
              validators={{
                onBlur: ({ value }) =>
                  value.trim() ? undefined : t("studio.songTitle"),
              }}
            >
              {(field) => (
                <field.TextField
                  label={t("studio.songTitle")}
                  required
                  maxLength={160}
                />
              )}
            </form.AppField>
            <form.AppField
              name="primaryArtist"
              validators={{
                onBlur: ({ value }) =>
                  value.trim() ? undefined : t("studio.primaryArtist"),
              }}
            >
              {(field) => (
                <field.TextField
                  label={t("studio.primaryArtist")}
                  required
                  maxLength={120}
                />
              )}
            </form.AppField>
          </FieldGroup>
        </FieldSet>
      </FieldGroup>
    )
  },
})

function InheritanceCheckbox({
  form,
  label,
  name,
  onEnable,
}: {
  form: Parameters<typeof SongBasicsStep>[0]["form"]
  label: string
  name:
    | "inheritArtwork"
    | "inheritPrimaryLanguage"
    | "inheritGenre"
    | "inheritLabel"
    | "inheritCredits"
  onEnable?: () => void
}) {
  return (
    <form.Field name={name}>
      {(field) => (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm">
          <Checkbox
            checked={field.state.value}
            onCheckedChange={(checked) => {
              const enabled = checked === true
              field.handleChange(enabled)
              if (enabled) onEnable?.()
            }}
          />
          <span>{label}</span>
        </label>
      )}
    </form.Field>
  )
}
