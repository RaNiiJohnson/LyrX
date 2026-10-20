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

import { useLocale } from "./locale-provider"

export function AuthCard({
  title,
  description,
  children,
  footer,
  error,
  notice,
  onSubmit,
}: {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
  error?: string | null
  notice?: string | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const { t } = useLocale()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
      <CardFooter>{footer}</CardFooter>
    </Card>
  )
}
