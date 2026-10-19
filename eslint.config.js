// @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  ...tanstackConfig,
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/routeTree.gen.ts",
      "packages/backend/.agents/**",
      "packages/backend/.claude/**",
      "packages/backend/convex/_generated/**",
    ],
  },
  {
    rules: {
      "import/consistent-type-specifier-style": "off",
      "import/no-cycle": "off",
      "import/order": "off",
      "pnpm/json-enforce-catalog": "off",
      "sort-imports": "off",
    },
  },
]
