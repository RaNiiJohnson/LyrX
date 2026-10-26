import { createFileRoute, Outlet } from "@tanstack/react-router"
import { appRouteBoundaries } from "@/app/route-states"

export const Route = createFileRoute("/community/$contributionId")({
  ...appRouteBoundaries,
  component: Outlet,
})
