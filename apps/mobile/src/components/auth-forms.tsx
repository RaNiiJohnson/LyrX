import { useState } from "react"
import { View } from "react-native"
import { isValidDisplayName } from "@lyrx/shared"
import { Body, Heading, Message } from "@/components/ui"
import { Button, LinkButton, TextField } from "@/components/form"
import { VERIFIED_CALLBACK, authClient } from "@/lib/auth-client"
import { authErrorKey } from "@/lib/errors"
import { t } from "@/lib/i18n"
import { space } from "@/lib/theme"

export const MIN_PASSWORD_LENGTH = 10

type Mode = "sign-in" | "sign-up" | "forgot"
type Result = { error?: unknown }

/** Runs one auth request and turns any failure into a localized message. */
function useSubmit(failureTitle: string) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(request: () => Promise<Result>) {
    setPending(true)
    setError(null)
    try {
      const result = await request()
      if (result.error) throw result.error
      return true
    } catch (caught) {
      setError(`${failureTitle} — ${t(authErrorKey(caught))}`)
      return false
    } finally {
      setPending(false)
    }
  }
  return { pending, error, submit }
}

export function validEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim())
}

/** Email-only sign in, sign up and password recovery for anonymous visitors. */
export function AuthPanel() {
  const [mode, setMode] = useState<Mode>("sign-in")
  return (
    <View style={{ gap: space.lg }}>
      {mode === "sign-in" ? (
        <SignInForm onMode={setMode} />
      ) : mode === "sign-up" ? (
        <SignUpForm onMode={setMode} />
      ) : (
        <ForgotPasswordForm onMode={setMode} />
      )}
    </View>
  )
}

function SignInForm({ onMode }: { onMode: (mode: Mode) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [touched, setTouched] = useState(false)
  const { pending, error, submit } = useSubmit(t("signIn.error"))
  const emailError =
    touched && !validEmail(email) ? t("auth.emailInvalid") : null
  const passwordError = touched && !password ? t("auth.passwordRequired") : null
  return (
    <>
      <View style={{ gap: space.xs }}>
        <Heading level={1}>{t("signIn.title")}</Heading>
        <Body muted>{t("signIn.description")}</Body>
      </View>
      {error ? <Message title={error} /> : null}
      <View style={{ gap: space.md }}>
        <TextField
          label={t("auth.email")}
          value={email}
          onChangeText={setEmail}
          error={emailError}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          label={t("auth.password")}
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          secure
          autoComplete="current-password"
          textContentType="password"
        />
        <LinkButton
          label={t("signIn.forgotPassword")}
          onPress={() => onMode("forgot")}
        />
      </View>
      <Button
        label={t("signIn.submit")}
        loading={pending}
        onPress={() => {
          setTouched(true)
          if (!validEmail(email) || !password) return
          void submit(() =>
            authClient.signIn.email({ email: email.trim(), password })
          )
        }}
      />
      <View style={{ gap: space.xs }}>
        <Body muted>{t("signIn.footerLead")}</Body>
        <LinkButton
          label={t("navigation.createAccount")}
          onPress={() => onMode("sign-up")}
        />
      </View>
    </>
  )
}

function SignUpForm({ onMode }: { onMode: (mode: Mode) => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [touched, setTouched] = useState(false)
  const [sent, setSent] = useState(false)
  const { pending, error, submit } = useSubmit(t("signUp.error"))
  const nameError =
    touched && !isValidDisplayName(name) ? t("error.invalidDisplayName") : null
  const emailError =
    touched && !validEmail(email) ? t("auth.emailInvalid") : null
  const passwordError =
    touched && password.length < MIN_PASSWORD_LENGTH
      ? t("auth.passwordTooShort")
      : null

  if (sent)
    return (
      <>
        <Message
          title={t("verify.title")}
          description={`${t("signUp.notice")} ${t("auth.verifyThenSignIn")}`}
          action={{
            label: t("signIn.submit"),
            onPress: () => onMode("sign-in"),
          }}
        />
      </>
    )

  return (
    <>
      <View style={{ gap: space.xs }}>
        <Heading level={1}>{t("signUp.title")}</Heading>
        <Body muted>{t("signUp.description")}</Body>
      </View>
      {error ? <Message title={error} /> : null}
      <View style={{ gap: space.md }}>
        <TextField
          label={t("signUp.displayName")}
          value={name}
          onChangeText={setName}
          error={nameError}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          maxLength={80}
        />
        <TextField
          label={t("auth.email")}
          value={email}
          onChangeText={setEmail}
          error={emailError}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          label={t("auth.password")}
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={128}
        />
        <Body muted>{t("auth.passwordMinimum")}</Body>
      </View>
      <Button
        label={t("signUp.submit")}
        loading={pending}
        onPress={() => {
          setTouched(true)
          if (
            !isValidDisplayName(name) ||
            !validEmail(email) ||
            password.length < MIN_PASSWORD_LENGTH
          )
            return
          void submit(() =>
            authClient.signUp.email({
              name: name.trim(),
              email: email.trim(),
              password,
              // Absolute on purpose: the Expo client rewrites "/…" into a dev-only exp:// link.
              callbackURL: VERIFIED_CALLBACK,
            })
          ).then((ok) => ok && setSent(true))
        }}
      />
      <View style={{ gap: space.xs }}>
        <Body muted>{t("signUp.footerLead")}</Body>
        <LinkButton
          label={t("signIn.submit")}
          onPress={() => onMode("sign-in")}
        />
      </View>
    </>
  )
}

function ForgotPasswordForm({ onMode }: { onMode: (mode: Mode) => void }) {
  const [email, setEmail] = useState("")
  const [touched, setTouched] = useState(false)
  const [sent, setSent] = useState(false)
  const { pending, error, submit } = useSubmit(t("auth.actionError"))
  const emailError =
    touched && !validEmail(email) ? t("auth.emailInvalid") : null
  return (
    <>
      <View style={{ gap: space.xs }}>
        <Heading level={1}>{t("forgot.title")}</Heading>
        <Body muted>{t("forgot.description")}</Body>
      </View>
      {error ? <Message title={error} /> : null}
      {sent ? (
        <Message
          title={t("forgot.successTitle")}
          description={t("forgot.notice")}
        />
      ) : (
        <>
          <TextField
            label={t("auth.email")}
            value={email}
            onChangeText={setEmail}
            error={emailError}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Button
            label={t("forgot.submit")}
            loading={pending}
            onPress={() => {
              setTouched(true)
              if (!validEmail(email)) return
              // Same relative target as the web: resolved by the server against SITE_URL,
              // so the link finishes on the web reset page.
              void submit(() =>
                authClient.requestPasswordReset({
                  email: email.trim(),
                  redirectTo: "/auth/reset-password",
                })
              ).then((ok) => ok && setSent(true))
            }}
          />
        </>
      )}
      <LinkButton
        label={t("forgot.footer")}
        onPress={() => onMode("sign-in")}
      />
    </>
  )
}
