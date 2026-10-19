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
              <AlertTitle>Action impossible</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {notice ? (
            <Alert>
              <AlertTitle>Demande enregistrée</AlertTitle>
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
