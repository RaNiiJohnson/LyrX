import type { MessageKey } from "@lyrx/shared"
import type { Doc } from "@lyrx/backend/convex/_generated/dataModel"
import { Checkbox } from "@lyrx/ui/components/checkbox"
import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@lyrx/ui/components/field"

import { useLocale } from "@/app/locale-provider"
import { SONG_GENRES } from "@/features/catalogue/lib/catalogue-form"
import { applyAlbumDefaults } from "@/features/catalogue/lib/catalogue-form"
import { OptionalLabel } from "@/features/catalogue/shared/optional-label"
import { withForm } from "@/lib/app-form"
import { songFormOptions } from "./song-form-options"

const genreMessageKeys: Record<(typeof SONG_GENRES)[number], MessageKey> = {
  pop: "studio.genrePop",
  rock: "studio.genreRock",
  "hip-hop": "studio.genreHipHop",
  rnb: "studio.genreRnb",
  electronic: "studio.genreElectronic",
  jazz: "studio.genreJazz",
  folk: "studio.genreFolk",
  gospel: "studio.genreGospel",
  reggae: "studio.genreReggae",
  other: "studio.genreOtherOption",
}

export const SongBasicsStep = withForm({
  ...songFormOptions,
  props: { albums: [] as Array<Doc<"albums">> },
  render: function SongBasicsStepFields({ form, albums }) {
    const { t } = useLocale()
    return (
      <FieldSet>
        <FieldLegend>{t("studio.releaseContext")}</FieldLegend>
        <div className="grid gap-5 md:grid-cols-2">
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
        </div>
        <form.Subscribe
          selector={(state) => [
            state.values.releaseType,
            state.values.albumId,
          ] as const}
        >
          {([releaseType, albumId]) =>
            releaseType === "album" && albumId ? (
              <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
                <div>
                  <p className="font-medium">{t("studio.inheritedMetadata")}</p>
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
                    name="inheritPrimaryLanguage"
                    label={t("studio.language")}
                    onEnable={() => {
                      const album = albums.find(
                        (candidate) => candidate._id === albumId
                      )
                      if (album?.primaryLanguage)
                        form.setFieldValue(
                          "primaryLanguage",
                          album.primaryLanguage
                        )
                    }}
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
        <FieldLegend>{t("studio.songTitle")}</FieldLegend>
        <div className="grid gap-5 md:grid-cols-2">
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
          <form.AppField name="releaseDate">
            {(field) => (
              <field.TextField
                label={t("studio.releaseDate")}
                labelExtra={<OptionalLabel />}
                type="date"
              />
            )}
          </form.AppField>
          <form.AppField
            name="primaryLanguage"
            validators={{
              onBlur: ({ value }) =>
                value.trim() ? undefined : t("studio.language"),
            }}
          >
            {(field) => (
              <field.TextField
                label={t("studio.language")}
                required
                maxLength={50}
                onValueChange={() => {
                  if (form.state.values.releaseType === "album")
                    form.setFieldValue("inheritPrimaryLanguage", false)
                }}
              />
            )}
          </form.AppField>
          <form.AppField name="genre">
            {(field) => (
              <field.SelectField
                label={t("studio.genre")}
                labelExtra={<OptionalLabel />}
                options={SONG_GENRES.map((genre) => ({
                  label: t(genreMessageKeys[genre]),
                  value: genre,
                }))}
                placeholder="—"
                onValueChange={() => {
                  if (form.state.values.releaseType === "album")
                    form.setFieldValue("inheritGenre", false)
                }}
              />
            )}
          </form.AppField>
          <form.Subscribe selector={(state) => state.values.genre}>
            {(genre) =>
              genre === "other" ? (
                <form.AppField name="otherGenre">
                  {(field) => (
                    <field.TextField
                      label={t("studio.genreOther")}
                      required
                      maxLength={60}
                      onValueChange={() => {
                        if (form.state.values.releaseType === "album")
                          form.setFieldValue("inheritGenre", false)
                      }}
                    />
                  )}
                </form.AppField>
              ) : null
            }
          </form.Subscribe>
        </div>
        <form.AppField name="guestArtists">
          {(field) => (
            <field.TextareaField
              label={t("studio.guestArtists")}
              labelExtra={<OptionalLabel />}
              description={t("studio.creditsDescription")}
              rows={3}
            />
          )}
        </form.AppField>
        <form.AppField name="description">
          {(field) => (
            <field.TextareaField
              label={t("studio.songDescription")}
              labelExtra={<OptionalLabel />}
              maxLength={2000}
              rows={4}
            />
          )}
        </form.AppField>
        <form.AppField name="context">
          {(field) => (
            <field.TextareaField
              label={t("studio.context")}
              labelExtra={<OptionalLabel />}
              maxLength={5000}
              rows={5}
            />
          )}
        </form.AppField>
      </FieldSet>
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
