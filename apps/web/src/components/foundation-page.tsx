import { PRODUCT_NAME } from "@lyrx/shared"
import { Badge } from "@lyrx/ui/components/badge"

export function FoundationPage() {
  return (
    <main className="min-h-svh">
      <section className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center gap-6 px-6 py-16 sm:py-24">
        <Badge variant="outline">Fondation technique</Badge>
        <div className="flex flex-col gap-3">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
            {PRODUCT_NAME}
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            La fondation web est prête. TanStack Start, pnpm et TypeScript
            strict sont reliés dans un monorepo vérifiable.
          </p>
        </div>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          Les fonctionnalités musicales, les comptes et les données arriveront
          dans leurs lots dédiés.
        </p>
      </section>
    </main>
  )
}
