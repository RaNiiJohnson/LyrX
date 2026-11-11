import { useState } from "react"
import { Text } from "react-native"
import { useMutation } from "convex/react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Button, TextField } from "@/components/form"
import { Sheet } from "@/components/kit"
import { useActiveMember } from "@/components/song-interactions"
import { Message } from "@/components/ui"
import { appErrorKey } from "@/lib/errors"
import { t } from "@/lib/i18n"
import { fonts, space, useTheme } from "@/lib/theme"

const MAX_REASON = 1000

/** Report entry point of a public contribution; only an active member who is not its author sees it. */
export function ContributionReport({
  contributionId,
  authorHandle,
}: {
  contributionId: Id<"communityContributions">
  authorHandle: string
}) {
  const theme = useTheme()
  const member = useActiveMember()
  const report = useMutation(api.community.moderation.report)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  if (!member.ready || member.handle === authorHandle) return null
  const close = () => {
    setOpen(false)
    setReason("")
    setError(null)
    setSent(false)
  }
  return (
    <>
      <Text
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={{
          color: theme.mutedForeground,
          fontFamily: fonts.sansMedium,
          textDecorationLine: "underline",
          paddingVertical: space.sm,
        }}
      >
        {t("community.report")}
      </Text>
      <Sheet visible={open} onClose={close} title={t("community.report")}>
        {sent ? (
          <>
            <Message title={t("community.reportSent")} />
            <Button
              variant="outline"
              label={t("common.close")}
              onPress={close}
            />
          </>
        ) : (
          <>
            <Text
              style={{
                color: theme.mutedForeground,
                fontFamily: fonts.sans,
                lineHeight: 22,
              }}
            >
              {t("community.reportDescription")}
            </Text>
            <TextField
              label={t("community.reason")}
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={MAX_REASON}
              autoCapitalize="sentences"
              error={error}
            />
            <Button
              label={t("interactions.sendReport")}
              loading={pending}
              disabled={reason.trim() === ""}
              onPress={() => {
                setPending(true)
                setError(null)
                report({ contributionId, reason: reason.trim() })
                  .then(() => setSent(true))
                  .catch((caught: unknown) => setError(t(appErrorKey(caught))))
                  .finally(() => setPending(false))
              }}
            />
          </>
        )}
      </Sheet>
    </>
  )
}
