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

/** Redirect only after the native endpoint explicitly confirms final deletion. */
export async function deleteConfirmedAccount(
  values: { confirmation: string; confirmationWord: string; password: string },
  dependencies: {
    deleteUser: (input: { password?: string }) => Promise<DeleteAccountResult>
    redirect: () => void
  }
): Promise<AccountDeletionOutcome> {
  if (values.confirmation.trim() !== values.confirmationWord) {
    return "confirmation-required"
  }

  try {
    const result = await dependencies.deleteUser(
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
    if (
      result.data?.success !== true ||
      result.data.message !== "User deleted"
    ) {
      return "failed"
    }
    dependencies.redirect()
    return "deleted"
  } catch {
    return "failed"
  }
}

/** Clear the stale session before opening a signed-out-only sign-in route. */
export async function signOutForAccountDeletion(dependencies: {
  signOut: () => Promise<DeleteAccountResult>
  redirect: () => void
}): Promise<boolean> {
  try {
    const result = await dependencies.signOut()
    if (result.error || result.data?.success !== true) return false
    dependencies.redirect()
    return true
  } catch {
    return false
  }
}
