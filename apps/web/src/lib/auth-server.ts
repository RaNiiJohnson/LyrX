import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start"

function createServerAuth() {
  const convexUrl = process.env.VITE_CONVEX_URL
  const convexSiteUrl = process.env.VITE_CONVEX_SITE_URL
  if (!convexUrl || !convexSiteUrl) return null

  return convexBetterAuthReactStart({ convexUrl, convexSiteUrl })
}

export async function getAuthToken() {
  const serverAuth = createServerAuth()
  if (!serverAuth) return null
  return await serverAuth.getToken()
}

export async function handleAuthRequest(request: Request) {
  const serverAuth = createServerAuth()
  if (!serverAuth) {
    return Response.json(
      {
        code: "AUTH_BACKEND_NOT_CONFIGURED",
        message: "Le backend d’authentification Lyr’X n’est pas configuré.",
      },
      { status: 503 }
    )
  }
  return await serverAuth.handler(request)
}
