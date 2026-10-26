import type { MessageKey } from "@lyrx/shared"
import { ChevronDown, Plus, Trash2 } from "lucide-react"

import { Button } from "@lyrx/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lyrx/ui/components/collapsible"
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@lyrx/ui/components/field"

import { useLocale } from "@/app/locale-provider"
import {
  LISTENING_PROVIDERS,
  SONG_GENRES,
} from "@/features/catalogue/lib/catalogue-form"
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

export const SongCreditsStep = withForm({
  ...songFormOptions,
  render: function SongCreditsStepFields({ form }) {
    const { t } = useLocale()
    return (
      <section className="@container flex min-w-0 flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {t("studio.additionalMetadata")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("studio.additionalMetadataDescription")}
          </p>
        </div>

        <AdditionalSection title={t("studio.releaseAndPresentation")}>
          <FieldSet>
            <FieldLegend className="sr-only">
              {t("studio.releaseAndPresentation")}
            </FieldLegend>
            <FieldGroup>
              <FieldGroup className="grid gap-5 @md:grid-cols-2">
                <form.AppField name="releaseDate">
                  {(field) => (
                    <field.TextField
                      label={t("studio.releaseDate")}
                      labelExtra={<OptionalLabel />}
                      type="date"
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
              </FieldGroup>
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
            </FieldGroup>
          </FieldSet>
        </AdditionalSection>

        <AdditionalSection title={t("studio.creditsAndContributors")}>
          <FieldSet>
            <FieldLegend className="sr-only">
              {t("studio.creditsAndContributors")}
            </FieldLegend>
            <FieldGroup>
              <FieldGroup className="grid gap-5 @md:grid-cols-2">
                {(
                  [
                    ["guestArtists", "studio.guestArtists"],
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
                      onValueChange={() => {
                        if (form.state.values.releaseType === "album")
                          form.setFieldValue("inheritLabel", false)
                      }}
                    />
                  )}
                </form.AppField>
                <form.AppField name="additionalCredits">
                  {(field) => (
                    <field.TextareaField
                      label={t("studio.generalCredits")}
                      labelExtra={<OptionalLabel />}
                      description={t("studio.generalCreditsDescription")}
                      rows={3}
                      onValueChange={() => {
                        if (form.state.values.releaseType === "album")
                          form.setFieldValue("inheritCredits", false)
                      }}
                    />
                  )}
                </form.AppField>
              </FieldGroup>
            </FieldGroup>
          </FieldSet>
        </AdditionalSection>

        <AdditionalSection title={t("studio.audioAndListening")}>
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
                    <Plus data-icon="inline-start" /> {t("catalogue.add")}
                  </Button>
                )}
              </form.Field>
            </div>
            <form.Field name="listeningLinks" mode="array">
              {(linksField) =>
                linksField.state.value.length === 0 ? (
                  <FieldDescription>
                    {t("studio.listeningLinksEmpty")}
                  </FieldDescription>
                ) : (
                  <div className="flex flex-col gap-4">
                    {linksField.state.value.map((_, index) => (
                      <FieldGroup
                        key={index}
                        className="grid min-w-0 gap-3 rounded-xl border p-4 @2xl:grid-cols-[12rem_minmax(0,1fr)_auto] @2xl:items-end"
                      >
                        <form.AppField
                          name={`listeningLinks[${index}].provider`}
                        >
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
                      </FieldGroup>
                    ))}
                  </div>
                )
              }
            </form.Field>
          </FieldSet>
        </AdditionalSection>
      </section>
    )
  },
})

function AdditionalSection({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <Collapsible className="group rounded-xl border">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-auto min-h-12 w-full justify-between rounded-xl px-4 py-3 text-left"
        >
          {title}
          <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t p-4 sm:p-5">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
