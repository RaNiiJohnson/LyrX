import { Plus, Trash2 } from "lucide-react"

import { Button } from "@lyrx/ui/components/button"
import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@lyrx/ui/components/field"

import { useLocale } from "@/app/locale-provider"
import { LISTENING_PROVIDERS } from "@/features/catalogue/lib/catalogue-form"
import { OptionalLabel } from "@/features/catalogue/shared/optional-label"
import { withForm } from "@/lib/app-form"
import { songFormOptions } from "./song-form-options"

const providerLabels = {
  spotify: "Spotify",
  "apple-music": "Apple Music",
  youtube: "YouTube",
  deezer: "Deezer",
  soundcloud: "SoundCloud",
  mediafire: "MediaFire",
  other: "",
} as const

export const SongCreditsStep = withForm({
  ...songFormOptions,
  render: function SongCreditsStepFields({ form }) {
    const { t } = useLocale()
    return (
      <>
        <FieldSet>
          <FieldLegend>{t("studio.writers")}</FieldLegend>
          <div className="grid gap-5 md:grid-cols-2">
            {(
              [
                ["writers", "studio.writers"],
                ["composers", "studio.composers"],
                ["producers", "studio.producers"],
              ] as const
            ).map(([name, label]) => (
              <form.AppField key={name} name={name}>
                {(field) => (
                  <field.TextareaField
                    label={t(label)}
                    labelExtra={<OptionalLabel />}
                    description={t("studio.creditsDescription")}
                    rows={3}
                  />
                )}
              </form.AppField>
            ))}
            <form.AppField name="label">
              {(field) => (
                <field.TextField
                  label={t("studio.label")}
                  labelExtra={<OptionalLabel />}
                  maxLength={120}
                />
              )}
            </form.AppField>
          </div>
        </FieldSet>
        <FieldSet>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FieldLegend>{t("studio.listeningLinks")}</FieldLegend>
              <OptionalLabel />
            </div>
            <form.Field name="listeningLinks" mode="array">
              {(linksField) => (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={linksField.state.value.length >= 12}
                  onClick={() =>
                    linksField.pushValue({ provider: "spotify", url: "" })
                  }
                >
                  <Plus /> {t("catalogue.add")}
                </Button>
              )}
            </form.Field>
          </div>
          <form.Field name="listeningLinks" mode="array">
            {(linksField) =>
              linksField.state.value.length === 0 ? (
                <FieldDescription>
                  {t("studio.listeningLinks")}
                </FieldDescription>
              ) : (
                <div className="space-y-4">
                  {linksField.state.value.map((_, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-xl border p-4 md:grid-cols-[12rem_1fr_auto] md:items-end"
                    >
                      <form.AppField name={`listeningLinks[${index}].provider`}>
                        {(field) => (
                          <field.SelectField
                            label={t("studio.provider")}
                            options={LISTENING_PROVIDERS.map((provider) => ({
                              label:
                                provider === "other"
                                  ? t("studio.providerOther")
                                  : providerLabels[provider],
                              value: provider,
                            }))}
                          />
                        )}
                      </form.AppField>
                      <form.AppField name={`listeningLinks[${index}].url`}>
                        {(field) => (
                          <field.TextField
                            label={t("studio.url")}
                            type="url"
                            placeholder="https://"
                          />
                        )}
                      </form.AppField>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("common.remove")}
                        onClick={() => linksField.removeValue(index)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              )
            }
          </form.Field>
        </FieldSet>
      </>
    )
  },
})
