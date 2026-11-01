import { Text, View } from "react-native"
import { parseLyrics } from "@lyrx/shared"
import { Eyebrow } from "@/components/ui"
import { fonts, space, useTheme } from "@/lib/theme"

export function Lyrics({ text }: { text: string }) {
  const theme = useTheme()
  const { sections } = parseLyrics(text)
  return (
    <View style={{ gap: space.xl + space.sm }}>
      {sections.map((section, index) => (
        <View key={index} style={{ gap: space.md }}>
          {section.heading ? (
            <Eyebrow style={{ fontSize: 11, letterSpacing: 2.2 }}>
              {section.heading}
            </Eyebrow>
          ) : null}
          <Text
            selectable
            style={{
              color: theme.foreground,
              fontFamily: fonts.sans,
              fontSize: 19,
              lineHeight: 33,
            }}
          >
            {section.lines.join("\n")}
          </Text>
        </View>
      ))}
    </View>
  )
}
