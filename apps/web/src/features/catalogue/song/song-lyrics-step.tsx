import { MAX_LYRICS_TEXT_LENGTH } from "@lyrx/shared"
import { FieldLegend, FieldSet } from "@lyrx/ui/components/field"

import { useLocale } from "@/app/locale-provider"
import { withForm } from "@/lib/app-form"
import { LYRIC_HEADING_MESSAGE_KEYS } from "@/lib/lyric-heading"
import { songFormOptions } from "./song-form-options"

export const SongLyricsStep = withForm({
  ...songFormOptions,
  render: function SongLyricsStepFields({ form }) {
    const { t } = useLocale()
    return (
      <FieldSet>
        <FieldLegend>{t("studio.lyrics")}</FieldLegend>
        <form.AppField
          name="lyricsText"
          validators={{
            onBlur: ({ value }) =>
              value.trim() ? undefined : t("studio.lyricsRequired"),
          }}
        >
          {(field) => (
            <field.TextareaField
              label={t("studio.lyricsEditor")}
              headings={LYRIC_HEADING_MESSAGE_KEYS.map((key) => t(key))}
              headingToolsLabel={t("studio.headingTools")}
              description={t("studio.lyricsEditorDescription")}
              placeholder={t("studio.lyricsEditorPlaceholder")}
              maxLength={MAX_LYRICS_TEXT_LENGTH}
              required
              rows={18}
              className="min-h-96 resize-y leading-7"
            />
          )}
        </form.AppField>
      </FieldSet>
    )
  },
})
