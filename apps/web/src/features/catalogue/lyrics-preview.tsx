import { parseLyrics } from "@lyrx/shared"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"

import { useLocale } from "@/app/locale-provider"

export function LyricsPreview({ lyricsText }: { lyricsText: string }) {
  const { t } = useLocale()
  const sections = parseLyrics(lyricsText).sections

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("studio.lyricsPreview")}</CardTitle>
        <CardDescription>
          {t("studio.lyricsPreviewDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6" aria-live="polite">
        {lyricsText.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("studio.lyricsPreviewEmpty")}
          </p>
        ) : (
          sections.map((section, sectionIndex) => (
            <section key={`${section.heading ?? "unheaded"}-${sectionIndex}`}>
              {section.heading ? (
                <h3 className="mb-2 font-medium">[{section.heading}]</h3>
              ) : null}
              <div className="leading-7 whitespace-pre-wrap">
                {section.lines.join("\n")}
              </div>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  )
}
