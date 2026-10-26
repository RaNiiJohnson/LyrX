import type { FormEvent, ReactNode } from "react"

import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"

import { useLocale } from "@/app/locale-provider"

export function AuthCard({
  title,
  description,
  children,
  footer,
  error,
  notice,
  onSubmit,
  appearance = "card",
}: {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
  error?: string | null
  notice?: string | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  appearance?: "card" | "plain"
}) {
  const { t } = useLocale()
  const form = (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{t("auth.actionError")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {notice ? (
        <Alert>
          <AlertTitle>{t("auth.requestRecorded")}</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      {children}
    </form>
  )
  if (appearance === "plain") {
    return (
      <section className="flex min-w-0 flex-col gap-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </header>
        {form}
        <div>{footer}</div>
      </section>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{form}</CardContent>
      <CardFooter>{footer}</CardFooter>
    </Card>
  )
}
