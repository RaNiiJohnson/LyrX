import { useState } from "react"
import { View } from "react-native"
import { Button, TextField } from "@/components/form"
import { Body, Heading, Message } from "@/components/ui"
import { authClient } from "@/lib/auth-client"
import {
  deleteConfirmedAccount,
  type AccountDeletionOutcome,
} from "@/lib/account-deletion"
import { t } from "@/lib/i18n"
import { space } from "@/lib/theme"

const FAILURE_KEYS = {
  "confirmation-required": "account.deleteConfirmationRequired",
  "reauth-required": "account.deleteReauthRequired",
  "invalid-password": "account.deleteInvalidPassword",
  "no-password-account": "account.deleteNoPasswordAccount",
  failed: "account.deleteFailed",
} as const

/**
 * Irreversible: the typed confirmation word is checked before any request, and the
 * session is only dropped once the server confirms the account is gone.
 */
export function DeleteAccount() {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [outcome, setOutcome] = useState<AccountDeletionOutcome | null>(null)
  const word = t("account.deleteConfirmationWord")

  const submit = () => {
    setPending(true)
    setOutcome(null)
    void deleteConfirmedAccount(
      { confirmation, confirmationWord: word, password },
      (input) => authClient.deleteUser(input)
    )
      .then(async (result) => {
        setOutcome(result)
        // The server already ended the session; this only clears the local copy.
        if (result === "deleted") await authClient.signOut().catch(() => null)
      })
      .finally(() => setPending(false))
  }

  const reauthenticate = () => {
    setPending(true)
    authClient
      .signOut()
      .catch(() => null)
      .finally(() => setPending(false))
  }

  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.xs }}>
        <Heading>{t("account.deleteTitle")}</Heading>
        <Body muted>{t("account.deleteDescription")}</Body>
      </View>
      <View style={{ gap: space.md }}>
        {!open ? (
          <Button
            variant="outline"
            label={t("account.deleteAction")}
            onPress={() => setOpen(true)}
          />
        ) : (
          <>
            <Message
              title={t("account.deleteConfirmTitle")}
              description={t("account.deleteConfirmDescription")}
            />
            <TextField
              label={t("account.deleteConfirmationLabel", { word })}
              value={confirmation}
              onChangeText={setConfirmation}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TextField
              label={t("account.deletePassword")}
              hint={t("account.deletePasswordHelp")}
              value={password}
              onChangeText={setPassword}
              secure
              autoComplete="current-password"
              textContentType="password"
            />
            {outcome && outcome !== "deleted" ? (
              <Message
                title={t("account.deleteErrorTitle")}
                description={t(FAILURE_KEYS[outcome])}
                action={
                  outcome === "reauth-required"
                    ? {
                        label: t("account.deleteReauthAction"),
                        onPress: reauthenticate,
                      }
                    : undefined
                }
              />
            ) : null}
            <Button
              label={t("account.deleteConfirmAction")}
              loading={pending}
              onPress={submit}
            />
            <Button
              variant="outline"
              label={t("common.cancel")}
              disabled={pending}
              onPress={() => {
                setOpen(false)
                setConfirmation("")
                setPassword("")
                setOutcome(null)
              }}
            />
          </>
        )}
      </View>
    </View>
  )
}
