/** "il y a 5 jours" / "5 days ago", from seconds up to days. */
export function relativeTime(time: number, now: number, locale: string) {
  const seconds = Math.round((time - now) / 1000),
    absolute = Math.abs(seconds)
  const [value, unit] =
    absolute < 60
      ? ([seconds, "second"] as const)
      : absolute < 3600
        ? ([Math.round(seconds / 60), "minute"] as const)
        : absolute < 86400
          ? ([Math.round(seconds / 3600), "hour"] as const)
          : ([Math.round(seconds / 86400), "day"] as const)
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    value,
    unit
  )
}
