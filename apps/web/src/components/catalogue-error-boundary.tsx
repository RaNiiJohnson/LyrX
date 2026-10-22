import { Component, type ErrorInfo, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import type { MessageKey } from "@lyrx/shared"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Button } from "@lyrx/ui/components/button"

import { getErrorMessage } from "@/lib/errors"
import { useLocale } from "./locale-provider"

type Translate = (key: MessageKey) => string

class Boundary extends Component<
  { children: ReactNode; t: Translate },
  { error: unknown | null }
> {
  override state: { error: unknown | null } = { error: null }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  override componentDidCatch(_error: unknown, _info: ErrorInfo) {
    // The localized fallback is intentionally persistent; telemetry is added later.
  }

  override render() {
    if (!this.state.error) return this.props.children
    return (
      <Alert variant="destructive">
        <AlertTitle>{this.props.t("catalogue.saveError")}</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{getErrorMessage(this.state.error, this.props.t)}</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/studio">{this.props.t("navigation.studio")}</Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
}

export function CatalogueErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useLocale()
  return <Boundary t={t}>{children}</Boundary>
}
