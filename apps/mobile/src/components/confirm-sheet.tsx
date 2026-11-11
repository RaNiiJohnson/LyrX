import { Text } from "react-native"
import { Button } from "@/components/form"
import { Sheet } from "@/components/kit"
import { t } from "@/lib/i18n"
import { fonts, useTheme } from "@/lib/theme"

/** Confirmation for destructive actions; `Alert` has no multi-button support on web. */
export function ConfirmSheet({
  visible,
  title,
  description,
  confirmLabel,
  pending,
  onConfirm,
  onClose,
}: {
  visible: boolean
  title: string
  description?: string
  confirmLabel: string
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const theme = useTheme()
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {description ? (
        <Text
          style={{
            color: theme.mutedForeground,
            fontFamily: fonts.sans,
            fontSize: 15,
            lineHeight: 22,
          }}
        >
          {description}
        </Text>
      ) : null}
      <Button
        variant="destructive"
        label={confirmLabel}
        loading={pending}
        onPress={onConfirm}
      />
      <Button
        variant="outline"
        label={t("common.cancel")}
        disabled={pending}
        onPress={onClose}
      />
    </Sheet>
  )
}
