import { FieldLegend, FieldSet } from "@lyrx/ui/components/field"

import { useLocale } from "@/app/locale-provider"
import { OptionalLabel } from "@/features/catalogue/shared/optional-label"
import { withForm } from "@/lib/app-form"
import { albumFormOptions } from "./album-form-options"

export const AlbumMetadataFields = withForm({
  ...albumFormOptions,
  render: function AlbumMetadataFieldsView({ form }) {
    const { t } = useLocale()
    return (
      <FieldSet>
        <FieldLegend>{t("studio.albumNewTitle")}</FieldLegend>
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
          <form.AppField name="releaseDate">
            {(field) => (
              <field.TextField
                label={t("studio.releaseDate")}
                labelExtra={<OptionalLabel />}
                type="date"
              />
            )}
          </form.AppField>
        </div>
        <form.AppField name="description">
          {(field) => (
            <field.TextareaField
              label={t("studio.albumDescription")}
              labelExtra={<OptionalLabel />}
              maxLength={5000}
              rows={5}
            />
          )}
        </form.AppField>
        <form.AppField name="credits">
          {(field) => (
            <field.TextareaField
              label={t("studio.albumCredits")}
              labelExtra={<OptionalLabel />}
              description={t("studio.albumCreditsDescription")}
              rows={4}
            />
          )}
        </form.AppField>
      </FieldSet>
    )
  },
})
