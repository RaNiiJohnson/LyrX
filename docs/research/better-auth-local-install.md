# Intégration locale Better Auth + Convex pour Lyr’X

État de la recherche : **19 octobre 2026**, complétée par les résultats du lot 2. Les sources citées sont les guides, manifests et dépôts officiels de Better Auth, Convex et TanStack; l’intégration Hallomada est utilisée comme référence de code, pas comme preuve de compatibilité pour Lyr’X.

## Verdict

**Validé avec Better Auth 1.6.33 épinglé; pas prêt pour Better Auth 1.7.x avec le composant Convex publié.** Le lot 2 a figé `@convex-dev/better-auth@0.12.5` et `better-auth@1.6.33`. La génération du schéma, le typecheck backend/web, les tests, le build TanStack de production et le push du composant sur le déploiement de développement passent. Le composant local permet de posséder le schéma et les index Better Auth, mais ne remplace ni l’adaptateur publié ni son plugin Convex : il ne contourne donc pas la rupture 1.7. Les parcours Google et email restent à prouver avec leurs fournisseurs.

Le mot « local » désigne ici le composant et son schéma conservés dans le dépôt. Il ne signifie pas que Convex devient un serveur de base de données local : le guide demande un projet Convex et `convex dev`. Lyr’X utilise désormais le projet cloud de développement `johnsontolotriniavo/lyrx`. ([guide Local Install](https://labs.convex.dev/better-auth/features/local-install), [guide TanStack Start](https://labs.convex.dev/better-auth/framework-guides/tanstack-start), [progression Lyr’X](../progress.md))

## État observé

Dans Lyr’X, packages/backend existe déjà avec Convex 1.47.0, convex.json et le dossier packages/backend/convex/. Il n’y a actuellement ni Better Auth, ni auth.config.ts, ni http.ts, ni schéma ou fonction métier. apps/web utilise TanStack Start 1.168.61 et Vite 8.3.4; son vite.config.ts n’a pas encore la configuration SSR de Better Auth. Aucun fichier d’environnement d’exemple n’existe encore dans Lyr’X. ([architecture Lyr’X](../architecture.md), [package backend](../../packages/backend/package.json), [package web](../../apps/web/package.json), [vite.config.ts](../../apps/web/vite.config.ts))

Dans le dépôt de référence Hallomada, package.json et pnpm-lock.yaml résolvent @convex-dev/better-auth 0.12.3, Better Auth 1.6.19 et Convex 1.46.0. Le paquet déclare Better Auth >=1.6.11 <1.7.0 comme peer dependency. Son installation locale ajoute convex/betterAuth/convex.config.ts, un schéma généré par la CLI, un schéma final avec index additionnels et un adapter.ts qui appelle toujours createApi depuis @convex-dev/better-auth. Hallomada garde la configuration Better Auth réelle dans convex/auth/auth.ts; son convex/betterAuth/auth.ts ne contient que l’export statique utilisé par la génération. ([manifest publié 0.12.5](https://raw.githubusercontent.com/get-convex/better-auth/v0.12.5/package.json); fichiers observés : package.json, pnpm-lock.yaml et convex/betterAuth/{convex.config.ts,auth.ts,adapter.ts,generatedSchema.ts,schema.ts})

Hallomada configure email/mot de passe avec vérification d’adresse, Google, callbacks d’envoi et réinitialisation d’email, champs Better Auth additionnels et convex({ authConfig }). convex/auth.config.ts appelle getAuthConfigProvider(); convex/http.ts enregistre les routes Better Auth sur le routeur HTTP Convex. Les méthodes utiles sont réutilisables comme motifs, mais les champs de profil et les plugins Hallomada ne doivent pas être copiés tels quels dans le modèle Lyr’X.

## Ce que l’installation locale fait — et ne fait pas

La procédure officielle remplace l’enregistrement du composant externe par defineComponent("betterAuth"), génère le schéma Better Auth dans son dossier, appelle createApi(schema, createAuthOptions) et fournit ce schéma au client du composant. Elle permet d’ajouter des champs/index et de lire les tables du composant depuis ses fonctions. Les champs et tables générés doivent rester la sortie de la CLI; les index customisés se placent dans le schéma final séparé. ([procédure Local Install](https://labs.convex.dev/better-auth/features/local-install))

Cette procédure conserve le paquet partagé pour son adaptateur et le plugin Convex obligatoire. Or le manifest publié 0.12.5 annonce toujours Better Auth <1.7.0; le code de convex() importe better-auth/plugins/oidc-provider. Better Auth 1.7 a supprimé cet export au profit de @better-auth/oauth-provider; la génération locale du schéma ne peut pas réparer un import absent dans un autre paquet. L’issue #433 décrit un échec au bundling Convex en 1.7 et reste ouverte au moment de cette recherche. Elle rapporte aussi que 0.12.5 avec 1.6.30 a fonctionné dans six applications. ([manifest 0.12.5](https://raw.githubusercontent.com/get-convex/better-auth/v0.12.5/package.json), [issue Convex #433](https://github.com/convex/better-auth/issues/433), [guide officiel Better Auth 1.7](https://better-auth.com/docs/guides/1-7-upgrade-guide))

**Version retenue au lot 2 :** `@convex-dev/better-auth@0.12.5` avec `better-auth@1.6.33`, toutes deux épinglées exactement dans les manifests et le lockfile. Le gate local Lyr’X valide le schéma, les types, les tests et le build; il ne transforme pas cette preuve locale en preuve de déploiement. Ne pas laisser une plage résoudre vers Better Auth 1.7. ([versions Better Auth](https://github.com/better-auth/better-auth/releases), [issue Convex #433](https://github.com/convex/better-auth/issues/433))

Si Lyr’X exige 1.7 dès le lot 2, la dépendance reste un bloqueur : attendre une version officielle de l’adaptateur, vérifier son peer range et ses imports, puis refaire le test de bundling. L’issue #433 mentionne une migration de PR sans version publiée validée; ne pas prendre ce travail non publié pour une compatibilité acquise. ([issue Convex #433](https://github.com/convex/better-auth/issues/433), [guide migration Convex 0.12](https://labs.convex.dev/better-auth/migrations/migrate-to-0-12))

## Réutiliser Hallomada sans reprendre son intégration Next

À réutiliser comme motifs : createAuthOptions(ctx) séparé de createAuth(ctx), l’adaptateur local fondé sur le schéma généré, getAuthConfigProvider(), l’enregistrement authComponent.registerRoutes(http, createAuth), convexClient() côté client et ConvexBetterAuthProvider. Les validations de rôles, la vérification d’email au niveau des fonctions Convex et le filtrage des champs publics illustrent aussi des responsabilités qui doivent rester côté backend.

À ne pas copier : convexBetterAuthNextJs, la route app/api/auth/[...all]/route.ts, le préfixe NEXT_PUBLIC_, la directive React "use client" imposée par le fichier Next, les composants de providers Next/next-intl, les chemins localisés de retour et les modèles de profil d’emploi. La route Next Hallomada ne fait que réexporter handler du helper Next; elle n’est pas une route TanStack Start.

Ne pas confondre non plus l’intégration Convex avec le guide autonome Better Auth pour TanStack. Dans le mode Convex, Better Auth s’exécute dans une fonction HTTP Convex : la route TanStack transmet la requête avec handler venant de convexBetterAuthReactStart. Le guide autonome qui appelle auth.handler(request) et recommande tanstackStartCookies() suppose que Better Auth tourne dans le serveur TanStack; ce n’est pas le chemin Lyr’X. ([Convex + Better Auth TanStack Start](https://labs.convex.dev/better-auth/framework-guides/tanstack-start), [intégration autonome Better Auth TanStack](https://better-auth.com/docs/integrations/tanstack))

## Structure à viser au futur lot 2

Garder l’authentification serveur sous packages/backend/convex/ et l’adapter aux conventions déjà présentes dans ce workspace. La documentation officielle utilise convex/betterAuth/; dans Lyr’X, le préfixe est donc packages/backend/convex/betterAuth/.

    packages/backend/convex/
      convex.config.ts                 # monte le composant local et type les env Convex
      auth.config.ts                   # getAuthConfigProvider()
      http.ts                          # registerRoutes(authComponent, createAuth)
      auth.ts                          # createAuthOptions(ctx), createAuth(ctx), helpers
      betterAuth/
        convex.config.ts               # defineComponent("betterAuth")
        auth.ts                        # export statique isolé pour la génération CLI
        adapter.ts                     # createApi(schema, createAuthOptions)
        generatedSchema.ts             # sortie CLI, ne pas éditer à la main
        schema.ts                      # tables générées + index Lyr’X additionnels
      auth/                            # autorisation métier séparée si nécessaire

    apps/web/src/
      lib/auth-client.ts               # createAuthClient + convexClient()
      lib/auth-server.ts               # convexBetterAuthReactStart()
      routes/api/auth/$.ts             # GET/POST proxy via handler TanStack
      routes/__root.tsx                # provider Convex/Better Auth et jeton initial SSR

Le guide Convex demande ssr.noExternal: ["@convex-dev/better-auth"] dans Vite. L’API client utilise createAuthClient + convexClient(); les helpers serveur utilisent convexBetterAuthReactStart avec URL Convex et URL du site Convex; le catch-all src/routes/api/auth/$.ts délègue GET/POST au handler retourné. Le root peut obtenir getToken() dans un createServerFn, donner ce jeton à ConvexBetterAuthProvider et, si l’app adopte le SSR Convex Query présenté dans le guide, configurer le contexte route avec ConvexQueryClient. ([guide TanStack Start Convex](https://labs.convex.dev/better-auth/framework-guides/tanstack-start))

Un risque TanStack séparé est connu : dans @convex-dev/better-auth@0.12.5, le module react-start importe dynamiquement @tanstack/react-start/server; l’issue #409 rapporte que l’import peut entraîner des modules serveur Node dans le bundle client quand les helpers partagés sont référencés depuis les loaders. L’issue fournit un correctif d’import protection (include élargi au paquet et behavior.build: "mock"), vérifié par son auteur sur Start 1.168.32 avec le paquet 0.12.5. Lyr’X a Start 1.168.61, mais Vite 8.3.4; cela n’établit pas encore que le build actuel passe. Ajouter les garde-fous adaptés au plugin TanStack si le problème se reproduit et valider le bundle client. ([issue Convex #409](https://github.com/convex/better-auth/issues/409), [configuration SSR officielle Convex](https://labs.convex.dev/better-auth/framework-guides/tanstack-start))

## Comptes, rôles, variables et prérequis

- Activer email/mot de passe et requireEmailVerification; connecter un fournisseur d’email transactionnel aux callbacks Better Auth depuis le backend Convex. La vérification est inutilisable de bout en bout sans expédition des liens. Le prérequis email est déjà déclaré absent dans l’architecture Lyr’X. ([spécification Lyr’X](../specification.md), [Better Auth email](https://better-auth.com/docs/concepts/email), [email/mot de passe](https://better-auth.com/docs/authentication/email-password))
- Configurer Google seulement quand les secrets OAuth existent. Les identifiants restent côté Convex; l’interface ne doit pas prétendre que Google fonctionne sans eux. Better Auth construit le callback avec son URL de base; enregistrer le callback exact correspondant au domaine utilisé et vérifier le retour OAuth via le proxy TanStack. Le prérequis Google manque encore à Lyr’X. ([spécification Lyr’X](../specification.md), [Better Auth Google](https://better-auth.com/docs/authentication/google))
- Garder les rôles produit Fan/Artist distincts du droit d’administration, du profil artiste crédité et du contributeur. Ne pas exposer d’API publique qui puisse s’auto-attribuer admin; initialiser le premier admin par un chemin contrôlé côté serveur. Toute autorisation s’effectue dans les fonctions Convex. ([spécification Lyr’X](../specification.md), [guides Convex locaux](../../packages/backend/convex/_generated/ai/guidelines.md))
- Lier des comptes sur l’identité confirmée d’un fournisseur et le flux contrôlé retenu par le produit, jamais sur une simple comparaison de chaînes email. La documentation Better Auth permet de désactiver le lien implicite si le produit demande une confirmation explicite; les tests doivent notamment couvrir une adresse identique non vérifiée, puis Google avec adresse vérifiée. ([spécification Lyr’X](../specification.md), [Better Auth comptes et liaison](https://better-auth.com/docs/concepts/users-accounts))
- Pour les secrets backend, utiliser les variables d’environnement du déploiement Convex (BETTER_AUTH_SECRET, SITE_URL, les deux secrets Google et le secret du fournisseur email choisi). Les URL publiques du développement web sont des variables VITE_ : le guide utilise VITE_CONVEX_URL, VITE_CONVEX_SITE_URL et VITE_SITE_URL; elles ne sont pas des secrets. convex dev génère les URL Convex dans .env.local. Ne jamais exposer le secret Better Auth ou les identifiants Google sous un préfixe VITE_, ni les committer.
- Pour les variables Convex typées, suivre les consignes du backend Lyr’X : les déclarer dans packages/backend/convex/convex.config.ts avec defineApp({ env: ... }) et les lire depuis ./_generated/server, au lieu de copier sans adaptation les exemples process.env des guides. ([guide Convex TanStack Start](https://labs.convex.dev/better-auth/framework-guides/tanstack-start), [règles Convex Lyr’X](../../packages/backend/convex/_generated/ai/guidelines.md), [guide développement Lyr’X](../development.md))

Les noms d’environnement Hallomada ont été lus uniquement dans .env-template; aucune valeur de .env.local n’a été lue. Ses noms pertinents sont BETTER_AUTH_SECRET, SITE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et RESEND_API_KEY. Cela ne signifie pas que Lyr’X a choisi Resend : le fournisseur email reste à décider. Lyr’X ne possède pas encore son propre .env.example.

## Résultat du gate du lot 2

Le schéma local, le typecheck, les tests, le build Vite et le push du composant local vers le déploiement de développement ont été exécutés. Le scan du bundle client n’a trouvé ni import `node:` ni module serveur TanStack explicite. Les requêtes live `members:current` et `configuration:authCapabilities` répondent. Aucun parcours Google ou email réel n’a été exécuté faute de configuration fournisseur.

1. Revalider sur le registre le couple publié, vérifier peerDependencies et les imports du plugin Convex; figer la paire Better Auth 1.6 dans le lockfile. La génération locale seule ne compte pas comme compatibilité.
2. Lancer la génération du schéma depuis packages/backend/convex/betterAuth/ avec la CLI Better Auth de la version épinglée; conserver sa sortie et vérifier que les champs configurés y figurent. Garder les index propres dans schema.ts.
3. Vérifier convex dev/le bundling du composant, le typecheck et le build Vite de production, puis le gate pnpm check du dépôt. Examiner le bundle client à la recherche de modules node: si auth-server.ts est partagé avec des loaders.
4. Avec un déploiement de développement, vérifier l’inscription email, la vérification et le reset, la session Convex après connexion/déconnexion, la route proxy GET/POST, et le refus serveur d’une fonction anonyme. Vérifier les rôles et l’absence de promotion admin publique.
5. Quand les credentials existent, tester de vrais retours Google OAuth, les origines/callbacks et le cas de liaison d’identité vérifiée. Sans credentials ou service email, signaler ces parcours « non vérifiés » et garder l’indisponibilité explicite dans l’interface.

Le choix permet donc de maintenir le lot 2 autour du composant local sans annoncer de support 1.7. Les inconnues restantes sont la publication d’un adaptateur 1.7 compatible, le fournisseur transactionnel d’email et la configuration Google OAuth. ([roadmap Lyr’X](../roadmap.md), [guide de développement](../development.md), [issue Convex #433](https://github.com/convex/better-auth/issues/433))
