import type { MessageKey } from "@lyrx/shared"
import { ChevronDown, Plus, Trash2 } from "lucide-react"
import type { ReactNode } from "react"
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
import { communityFormOptions } from "./community-editor-values"

const genreLabels: Record<(typeof SONG_GENRES)[number], MessageKey> = {
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
const providerLabels = {
  spotify: "Spotify",
  "apple-music": "Apple Music",
  youtube: "YouTube",
  deezer: "Deezer",
  soundcloud: "SoundCloud",
  mediafire: "MediaFire",
  other: "",
} as const

export const CommunityEditorMetadata = withForm({
  ...communityFormOptions,
  render: function MetadataFields({ form }) {
    const { t } = useLocale()
    return (
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {t("studio.additionalMetadata")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("studio.additionalMetadataDescription")}
          </p>
        </div>
        <MetadataSection title={t("studio.releaseAndPresentation")}>
          <FieldSet>
            <FieldLegend className="sr-only">
              {t("studio.releaseAndPresentation")}
            </FieldLegend>
            <FieldGroup>
              <FieldGroup className="grid gap-5 md:grid-cols-2">
                <form.AppField name="albumTitle">
                  {(field) => (
                    <field.TextField
                      label={t("community.albumReference")}
                      labelExtra={<OptionalLabel />}
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
                <form.AppField name="genre">
                  {(field) => (
                    <FieldGroup className="gap-2">
                      <field.SelectField
                        label={t("studio.genre")}
                        labelExtra={<OptionalLabel />}
                        placeholder="—"
                        options={SONG_GENRES.map((genre) => ({
                          value: genre,
                          label: t(genreLabels[genre]),
                        }))}
                      />
                      {field.state.value ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="self-start"
                          aria-label={`${t("common.remove")} ${t("studio.genre")}`}
                          onClick={() => {
                            form.setFieldValue("genre", "")
                            form.setFieldValue("otherGenre", "")
                          }}
                        >
                          <Trash2 data-icon="inline-start" />
                          {t("common.remove")}
                        </Button>
                      ) : null}
                    </FieldGroup>
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
                <form.AppField name="label">
                  {(field) => (
                    <field.TextField
                      label={t("studio.label")}
                      labelExtra={<OptionalLabel />}
                      maxLength={120}
                    />
                  )}
                </form.AppField>
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
        </MetadataSection>
        <MetadataSection title={t("studio.creditsAndContributors")}>
          <FieldSet>
            <FieldLegend className="sr-only">
              {t("studio.creditsAndContributors")}
            </FieldLegend>
            <FieldGroup className="grid gap-5 md:grid-cols-2">
              {(
                [
                  ["guestArtists", "studio.guestArtists"],
                  ["writers", "studio.writers"],
                  ["composers", "studio.composers"],
                  ["producers", "studio.producers"],
                  ["additionalCredits", "studio.generalCredits"],
                ] as const
              ).map(([name, label]) => (
                <form.AppField key={name} name={name}>
                  {(field) => (
                    <field.TextareaField
                      label={t(label)}
                      labelExtra={<OptionalLabel />}
                      description={t(
                        name === "additionalCredits"
                          ? "studio.generalCreditsDescription"
                          : "studio.creditsDescription"
                      )}
                      rows={3}
                    />
                  )}
                </form.AppField>
              ))}
            </FieldGroup>
          </FieldSet>
        </MetadataSection>
        <MetadataSection title={t("studio.audioAndListening")}>
          <FieldSet>
            <div className="flex items-center justify-between gap-3">
              <FieldLegend>{t("studio.listeningLinks")}</FieldLegend>
              <form.Field name="listeningLinks" mode="array">
                {(field) => (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={field.state.value.length >= 12}
                    onClick={() =>
                      field.pushValue({ provider: "spotify", url: "" })
                    }
                  >
                    <Plus data-icon="inline-start" /> {t("catalogue.add")}
                  </Button>
                )}
              </form.Field>
            </div>
            <form.Field name="listeningLinks" mode="array">
              {(field) =>
                field.state.value.length === 0 ? (
                  <FieldDescription>
                    {t("studio.listeningLinksEmpty")}
                  </FieldDescription>
                ) : (
                  <FieldGroup>
                    {field.state.value.map((_, index) => (
                      <FieldGroup
                        key={index}
                        className="grid gap-3 rounded-xl border p-4 md:grid-cols-[10rem_1fr_auto] md:items-end"
                      >
                        <form.AppField
                          name={`listeningLinks[${index}].provider`}
                        >
                          {(providerField) => (
                            <providerField.SelectField
                              label={t("studio.provider")}
                              options={LISTENING_PROVIDERS.map((provider) => ({
                                value: provider,
                                label:
                                  provider === "other"
                                    ? t("studio.providerOther")
                                    : providerLabels[provider],
                              }))}
                            />
                          )}
                        </form.AppField>
                        <form.AppField name={`listeningLinks[${index}].url`}>
                          {(urlField) => (
                            <urlField.TextField
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
                          onClick={() => field.removeValue(index)}
                        >
                          <Trash2 />
                        </Button>
                      </FieldGroup>
                    ))}
                  </FieldGroup>
                )
              }
            </form.Field>
          </FieldSet>
        </MetadataSection>
      </section>
    )
  },
})

function MetadataSection({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <Collapsible className="group rounded-xl border">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="min-h-12 w-full justify-between px-4 py-3 text-left"
        >
          {title}
          <ChevronDown
            data-icon="inline-end"
            className="transition-transform group-data-[state=open]:rotate-180"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 sm:p-5">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
