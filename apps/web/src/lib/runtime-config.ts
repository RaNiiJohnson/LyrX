export type PublicRuntimeConfig = {
  convexUrl: string
  convexSiteUrl: string
  siteUrl: string
}

export function getPublicRuntimeConfig(): PublicRuntimeConfig | null {
  const convexUrl = import.meta.env.VITE_CONVEX_URL
  const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL
  const siteUrl = import.meta.env.VITE_SITE_URL

  if (!convexUrl || !convexSiteUrl || !siteUrl) return null
  return { convexUrl, convexSiteUrl, siteUrl }
}
