import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"

import { getPublicRuntimeConfig } from "@/lib/runtime-config"

export function BackendRequired({ children }: { children: React.ReactNode }) {
  if (getPublicRuntimeConfig()) return children

  return (
    <Alert>
      <AlertTitle>Configuration Convex requise</AlertTitle>
      <AlertDescription>
        Ajoutez VITE_CONVEX_URL, VITE_CONVEX_SITE_URL et VITE_SITE_URL dans
        apps/web/.env.local après avoir configuré le déploiement de
        développement. Aucun fournisseur externe n’est simulé.
      </AlertDescription>
    </Alert>
  )
}
