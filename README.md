# Lyr'X

Fondation du monorepo de la plateforme de paroles et de découverte musicale
Lyr'X. Le lot 1 fournit seulement une application TanStack Start minimale et
les frontières techniques nécessaires aux lots suivants.

## Pré-requis

- Node.js 22.13 ou plus récent sur la branche 22 (`.nvmrc` fixe 22.23.3)
- pnpm 11.28.6 via Corepack

## Démarrage

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

L'application web écoute par défaut sur `http://localhost:3000`.

## Vérification

```bash
pnpm check
```

La commande vérifie le formatage, le lint, TypeScript, les tests et le build de
production. Les commandes individuelles sont également disponibles:
`format:check`, `lint`, `typecheck`, `test` et `build`.

## Workspaces

- `apps/web`: application TanStack Start, en français pour cette preuve de vie.
- `packages/ui`: composants source shadcn/ui réservés au web.
- `packages/shared`: identifiants et types portables, sans API DOM, Node ou native.
- `packages/backend`: frontière Convex commune, sans schéma ni fonction dans ce
  lot.

`apps/mobile` ne sera créé qu'au lot 13. Better Auth, les fonctions Convex, les
données produit et le design Corail complet sont volontairement différés.

## Code généré

`apps/web/src/routeTree.gen.ts` est produit par TanStack Router et régénéré par
`pnpm --filter @lyrx/web generate-routes`; il est exclu du lint et du formatage
manuel. Les fichiers sous `packages/backend/convex/_generated` sont produits par
les outils Convex et restent versionnés lorsqu'ils existent. Les composants
shadcn/ui sont du code source détenu par le dépôt: ils doivent être relus et
testés après toute mise à jour par le CLI.
