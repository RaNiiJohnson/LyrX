import type { MessageKey } from "@lyrx/shared"
import { FieldLegend, FieldSet } from "@lyrx/ui/components/field"

import { useLocale } from "@/app/locale-provider"
import { SONG_GENRES } from "@/features/catalogue/lib/catalogue-form"
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
  render: function SongBasicsStepFields({ form }) {
    const { t } = useLocale()
    return (
      <FieldSet>
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
