import { ConvexReactClient } from "convex/react"
import { convexUrl } from "@/lib/config"

export const convex = convexUrl
  ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })
  : null
