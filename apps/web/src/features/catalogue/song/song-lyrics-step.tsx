import { MAX_LYRICS_TEXT_LENGTH } from "@lyrx/shared"
import { FieldLegend, FieldSet } from "@lyrx/ui/components/field"

import { useLocale } from "@/app/locale-provider"
import { LyricsPreview } from "@/features/catalogue/lyrics-preview"
import { OptionalLabel } from "@/features/catalogue/shared/optional-label"
import { withForm } from "@/lib/app-form"
import { songFormOptions } from "./song-form-options"

export const SongLyricsStep = withForm({
  ...songFormOptions,
  render: function SongLyricsStepFields({ form }) {
    const { t } = useLocale()
    return (
      <FieldSet>
        <FieldLegend>{t("studio.lyrics")}</FieldLegend>
        <form.AppField name="lyricsText">
          {(field) => (
            <field.TextareaField
              label={t("studio.lyricsEditor")}
              labelExtra={<OptionalLabel />}
              description={t("studio.lyricsEditorDescription")}
              maxLength={MAX_LYRICS_TEXT_LENGTH}
              rows={18}
              className="min-h-80 resize-y font-mono leading-7"
            />
          )}
        </form.AppField>
        <form.Subscribe selector={(state) => state.values.lyricsText}>
          {(lyricsText) => <LyricsPreview lyricsText={lyricsText} />}
        </form.Subscribe>
      </FieldSet>
    )
  },
})
