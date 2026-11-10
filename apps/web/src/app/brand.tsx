import { PRODUCT_NAME } from "@lyrx/shared"
import { cn } from "@lyrx/ui/lib/utils"

import { FEATHER_PATH, FEATHER_ROTATION_DEG } from "@/lib/brand"

function featherTransform(scale: number) {
  return `translate(32 32) scale(${scale}) rotate(${FEATHER_ROTATION_DEG}) translate(-32 -32)`
}

/** The feather alone, in the current text colour. Decorative. */
export function FeatherGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        fillRule="evenodd"
        d={FEATHER_PATH}
        transform={featherTransform(1.06)}
      />
    </svg>
  )
}

/** App icon: the ink feather on the coral rounded square. Decorative. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={cn("size-8 shrink-0", className)}
    >
      <rect width="64" height="64" rx="16" className="fill-brand" />
      <path
        fillRule="evenodd"
        d={FEATHER_PATH}
        transform={featherTransform(0.86)}
        className="fill-brand-foreground"
      />
    </svg>
  )
}

/**
 * "Lyr'X" with the feather standing in for the apostrophe. Use it where the
 * name is shown as the brand (header, hero titles); running text keeps the
 * plain `PRODUCT_NAME`.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-start font-serif", className)}>
      <span className="sr-only">{PRODUCT_NAME}</span>
      <span aria-hidden="true" className="inline-flex items-start">
        Lyr
        <FeatherGlyph className="mt-[0.02em] mr-[0.01em] -ml-[0.04em] size-[0.5em] text-brand" />
        X
      </span>
    </span>
  )
}
