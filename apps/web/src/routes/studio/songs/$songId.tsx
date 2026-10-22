import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/studio/songs/$songId")({
  component: Outlet,
})
