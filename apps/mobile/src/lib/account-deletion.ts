type DeleteAccountResult = {
  data?: { success?: boolean; message?: string } | null
  error?: { code?: string } | null
}

export type AccountDeletionOutcome =
  | "deleted"
  | "confirmation-required"
  | "reauth-required"
  | "invalid-password"
  | "no-password-account"
  | "failed"

/**
 * Same contract as the web: nothing is reported as deleted unless the native endpoint
 * confirms it, and the typed confirmation word is checked before any request.
 */
export async function deleteConfirmedAccount(
  values: { confirmation: string; confirmationWord: string; password: string },
  deleteUser: (input: { password?: string }) => Promise<DeleteAccountResult>
): Promise<AccountDeletionOutcome> {
  if (values.confirmation.trim() !== values.confirmationWord)
    return "confirmation-required"
  try {
    const result = await deleteUser(
      values.password ? { password: values.password } : {}
    )
    if (result.error) {
      switch (result.error.code) {
        case "SESSION_EXPIRED":
        case "UNAUTHORIZED":
        case "SESSION_NOT_FRESH":
          return "reauth-required"
        case "INVALID_PASSWORD":
          return "invalid-password"
        case "CREDENTIAL_ACCOUNT_NOT_FOUND":
          return "no-password-account"
        default:
          return "failed"
      }
    }
    return result.data?.success === true &&
      result.data.message === "User deleted"
      ? "deleted"
      : "failed"
  } catch {
    return "failed"
  }
}
