import type { ReactNode } from "react"

import { useLocale } from "@/app/locale-provider"

export function SignUpLayout({ children }: { children: ReactNode }) {
  const { t } = useLocale()
  return (
    <div className="grid min-w-0 items-stretch gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
      <aside className="relative hidden min-h-[36rem] overflow-hidden rounded-3xl lg:flex">
        <img
          src="/images/lyrx-songwriter-hero.webp"
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div className="relative flex w-full flex-col justify-center gap-6 bg-background/80 p-10">
          <p className="font-mono text-xs tracking-[0.2em] uppercase">
            {t("home.eyebrow")}
          </p>
          <h2 className="max-w-md text-4xl leading-tight font-semibold tracking-tight">
            {t("auth.joinStudio")}
          </h2>
          <p className="max-w-sm text-lg leading-relaxed text-muted-foreground">
            {t("auth.joinDescription")}
          </p>
        </div>
      </aside>
      <div className="mx-auto w-full max-w-md py-2 lg:py-6">{children}</div>
    </div>
  )
}
