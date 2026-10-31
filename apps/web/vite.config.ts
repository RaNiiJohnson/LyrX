import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    tailwindcss(),
    // Exercise route components synchronously in DOM/SSR tests. The Start
    // plugin otherwise replaces Route.options.component with a lazy chunk.
    !process.env.VITEST && tanstackStart(),
    viteReact(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    noExternal: ["@convex-dev/better-auth"],
  },
})
