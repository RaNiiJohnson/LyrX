# Fondation web Lyr’X : TanStack Start, Convex et Better Auth

État de la recherche : 19 octobre 2026. Sources consultées : documentation et dépôts officiels des projets. Les recommandations ci-dessous respectent le choix imposé de TypeScript, TanStack Start, Convex, Better Auth et shadcn/ui ; aucune authentification ni fonctionnalité métier n’est à implémenter dans le lot de fondation.

## Faits vérifiés

### TanStack Start et pnpm

La documentation TanStack marque Start comme stable, basé sur TanStack Router, avec SSR, streaming et fonctions serveur. Le démarrage officiel actuel utilise `npx @tanstack/cli@latest create` ; l’assistant demande le gestionnaire de paquets et propose des add-ons. Le CLI documente TypeScript et pnpm dans ses métadonnées de projet, mais sa page actuelle le marque encore « alpha ». Le guide Convex TanStack plus ancien parle encore d’une release candidate et d’un autre générateur ; pour le statut et le scaffold, le guide Start actuel est la source la plus récente. ([Start, aperçu](https://tanstack.com/start/latest/docs/framework/react/overview), [Start, démarrage](https://tanstack.com/start/latest/docs/framework/react/getting-started), [CLI TanStack](https://tanstack.com/cli/latest), [ancien quickstart Convex](https://docs.convex.dev/quickstart/tanstack-start))

pnpm définit un workspace par `pnpm-workspace.yaml` à la racine. Ses workspaces partagent normalement un seul lockfile, et `workspace:*` garantit qu’une dépendance vise réellement un paquet local. Au 19 octobre, sa documentation d’installation présente pnpm 12 comme version courante ; l’installation par npm requiert Node.js 22.13 ou plus récent. ([pnpm, workspaces](https://pnpm.io/workspaces), [pnpm, installation](https://pnpm.io/installation))

### shadcn/ui

Le guide officiel prend en charge TanStack Start : `pnpm dlx shadcn@latest init -t start`. Le CLI peut ajouter des composants depuis l’app, ou avec `-c apps/web` depuis la racine du monorepo. Son option `--monorepo` crée un modèle avec deux workspaces (`web` et `ui`) et Turborepo ; c’est un choix de scaffold explicite, pas une exigence de pnpm. ([installation TanStack](https://ui.shadcn.com/docs/installation/tanstack), [monorepo shadcn/ui](https://ui.shadcn.com/docs/monorepo))

### Convex

Le quickstart Convex TanStack recommande `convex` et, pour ses exemples SSR avec React Query, `@convex-dev/react-query`, `@tanstack/react-router-ssr-query` et `@tanstack/react-query`. Le CLI Convex `dev` configure un projet/déploiement, pousse les fonctions et actualise les types générés. `convex.json`, lorsqu’il est utilisé, se place à la racine du projet Convex (à côté de son `package.json`) ; il permet de définir l’emplacement des fonctions. Le CLI prend aussi en charge un backend local anonyme en environnement non interactif, sans connexion Convex ni clé de déploiement. ([quickstart TanStack](https://docs.convex.dev/quickstart/tanstack-start), [CLI `convex dev`](https://docs.convex.dev/cli/reference/dev), [`convex.json`](https://docs.convex.dev/config/convex.json), [mode local pour agents](https://docs.convex.dev/cli/agent-mode))

### Better Auth avec Convex et TanStack Start : compatibilité actuelle

Le guide Convex dédié à TanStack Start indique `convex@latest`, `@convex-dev/better-auth`, `better-auth@~1.6.15`, `@types/node` et Convex ≥ 1.25. Il décrit aussi le bundle SSR Vite (`ssr.noExternal` pour le composant), les fichiers Convex `convex.config.ts`, `auth.config.ts`, `auth.ts`, `http.ts`, les helpers TanStack dans `src/lib`, la route proxy `/api/auth/$` et le fournisseur React à la racine. Les secrets d’authentification sont configurés côté déploiement Convex ; les URLs publiques générées par `convex dev` vont dans `.env.local`. ([guide Convex + Better Auth pour TanStack Start](https://labs.convex.dev/better-auth/framework-guides/tanstack-start), [intégration Better Auth + Convex](https://better-auth.com/docs/integrations/convex))

Le guide de compatibilité ne reflète toutefois plus les versions publiées au jour de cette recherche : le dépôt officiel du composant affiche `@convex-dev/better-auth` 0.12.5, avec les pairs `better-auth >=1.6.11 <1.7.0` et `convex ^1.25.0`. Better Auth 1.7.11 a été publié le 19 octobre. Le PR de migration du composant vers Better Auth 1.7 est toujours en brouillon et non déployé ; il propose un pair `>=1.7.5 <1.8.0`. ([package.json du composant](https://github.com/convex/better-auth/blob/main/package.json), [versions Better Auth](https://github.com/better-auth/better-auth/releases), [PR de migration 1.7](https://github.com/convex/better-auth/pull/444))

Il existe aussi un problème ouvert dans le dépôt Convex : il rapporte une incompatibilité de types entre la version publiée 0.12.5 et Better Auth 1.6.18 à 1.6.30, y compris 1.6.22. Le rapport donne 1.6.17 comme dernière version testée passant le typecheck et indique que 1.6.22 corrige un avis de sécurité auquel il fait référence. C’est un signalement maintenu dans le dépôt, pas une validation indépendante de toutes les combinaisons. Il suffit néanmoins à déconseiller de copier la plage `~1.6.15` sans revalidation. ([problème #420](https://github.com/convex/better-auth/issues/420))

## Recommandations pour le lot de fondation

**Structure recommandée (déduction de l’organisation de projet, pas structure imposée par les fournisseurs) :**

```text
package.json                 # scripts racine, paquet privé
pnpm-workspace.yaml          # apps/* et packages/*
apps/web/
  package.json               # TanStack Start et Convex, versions gérées par pnpm
  src/
  convex/                    # backend Convex de cette app
  convex.json                # seulement si une configuration Convex est nécessaire
packages/ui/                 # à ajouter si l’UI est réellement partagée
```

Garder le backend Convex dans `apps/web/convex/` place ses fichiers à côté du manifeste de l’app, conforme à la convention du CLI. Une seule app peut conserver ses composants shadcn dans `apps/web/src/components/ui` ; créer `packages/ui` quand au moins un second consommateur justifie le partage. Si le générateur shadcn `--monorepo` est retenu, accepter explicitement sa structure `web`/`ui` et son ajout de Turborepo ; sinon, garder le workspace pnpm simple et initialiser shadcn depuis l’app. ([pnpm workspaces](https://pnpm.io/workspaces), [Convex `convex.json`](https://docs.convex.dev/config/convex.json), [shadcn monorepo](https://ui.shadcn.com/docs/monorepo))

Utiliser le CLI TanStack actuel pour créer une app Start React en TypeScript, choisir pnpm dans l’assistant, puis conserver les scripts Vite générés (`dev: vite dev`, `build: vite build`). Ajouter un script `convex:dev: convex dev` dans `apps/web/package.json` et des scripts racine qui délèguent à `@lyrx/web` avec `pnpm --filter`, qui sélectionne un paquet du workspace par nom. Reporter le choix d’un runtime/déploiement de production : les scripts `start` dépendent de la cible et du setup Nitro. Le statut alpha du CLI justifie de relire ses fichiers générés avant de les adopter. ([CLI Start](https://tanstack.com/start/latest/docs/framework/react/getting-started), [Start, build Vite](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch), [hébergement Start](https://tanstack.com/start/latest/docs/framework/react/guide/hosting), [pnpm, filtres](https://pnpm.io/filtering))

Initialiser pnpm avec le fichier de workspace à la racine et un lockfile partagé. Épingler une version exacte de pnpm dans le manifeste racine après avoir choisi la version Node et le mode d’installation ; c’est une recommandation de reproductibilité, pas une valeur prescrite par TanStack. Éviter les versions `latest` dans les manifestes commis ; les utiliser seulement dans les commandes de scaffold, puis conserver le lockfile généré. ([pnpm workspaces](https://pnpm.io/workspaces), [pnpm installation](https://pnpm.io/installation))

Pour Convex, la fondation peut installer le client, réserver `apps/web/convex/`, et déclarer les variables d’URL attendues dans un `.env.example` sans valeurs secrètes. Pour un vrai fonctionnement sans identifiants Cloud, le CLI permet un backend local anonyme en mode non interactif ; sinon l’initialisation cloud et ses URLs attendront le compte/projet. L’URL `VITE_CONVEX_URL` est destinée au client et donc publique ; ne pas préfixer une clé ou un secret par `VITE_`. ([Convex local](https://docs.convex.dev/cli/agent-mode), [URLs Convex/Vite](https://docs.convex.dev/client/react/deployment-urls), [variables TanStack Start](https://tanstack.com/start/latest/docs/framework/react/guide/environment-variables))

**Ne pas installer ni configurer Better Auth dans ce lot.** Attendre une version publiée de `@convex-dev/better-auth` dont le pair supporte la version Better Auth retenue et dont l’exemple TanStack passe le typecheck. Revalider le statut du PR #444 et la plage de pairs publiée. Ensuite seulement, suivre le guide TanStack Start mis à jour, sans reprendre l’ancien pin par défaut. Il est possible de poser aujourd’hui les dépendances conceptuelles/fichiers prévus dans cette note, mais pas de fournir une intégration fiable avec les paquets publiés vérifiés ici. ([plage actuelle du composant](https://github.com/convex/better-auth/blob/main/package.json), [PR #444](https://github.com/convex/better-auth/pull/444), [problème de types #420](https://github.com/convex/better-auth/issues/420))

Une fois la compatibilité résolue, l’intégration officielle réclame au minimum `BETTER_AUTH_SECRET` et `SITE_URL` côté environnement Convex, ainsi que `VITE_CONVEX_URL` et `VITE_CONVEX_SITE_URL` côté app. Les connexions OAuth nécessitent les identifiants client du fournisseur ; l’exemple non vérifié par email/password n’en requiert pas. Vérification email, liens magiques et réinitialisation de mot de passe exigent une intégration d’envoi d’email. Aucun de ces secrets ni flux n’est nécessaire à la fondation. ([guide Convex + Better Auth](https://labs.convex.dev/better-auth/framework-guides/tanstack-start), [OAuth Better Auth](https://better-auth.com/docs/concepts/oauth), [mot de passe et vérification email](https://better-auth.com/docs/authentication/email-password))

## Actions pour l’Implementer

1. Créer le workspace pnpm et l’app `apps/web` avec le CLI TanStack actuel ; choisir Start, React, TypeScript et pnpm, sans add-on d’authentification.
2. Initialiser shadcn dans l’app ; choisir `--monorepo` seulement si le modèle `web`/`ui` avec Turborepo convient.
3. Ajouter la base Convex à l’app et documenter séparément le chemin du backend local sans compte ; ne pas créer de schéma métier.
4. Ne pas ajouter Better Auth ni l’adaptateur Convex + Better Auth tant que la compatibilité publiée n’a pas été revalidée. Ne pas ajouter d’OAuth, d’email ou de secrets.
5. Après génération, vérifier les manifestes, le lockfile, le `vite.config.ts`, les scripts et les alias shadcn dans l’emplacement réel du monorepo.

## Inconnues à revalider avant le lot d’auth

- Date de fusion et de publication de la migration Convex vers Better Auth 1.7 ; version publiée et plage peer résultante.
- Résolution du problème de type `authClient` pour la version Better Auth choisie et état de l’avis de sécurité lié à la plage 1.6.x.
- Cible d’hébergement de production, runtime Nitro et noms définitifs des URLs locales/de production.
- Choix de conserver shadcn local à l’app ou d’extraire un paquet UI réellement partagé.
