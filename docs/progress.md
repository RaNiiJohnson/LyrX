# Delivery progress

## Active lot

**Lot 5 — Web structure and lyric entry is complete locally.** Its approved
scope and implementation guidance are recorded in
[web-structure-and-convex-guidance.md](research/web-structure-and-convex-guidance.md).

The lot introduces the Convex React Query integration for public SSR,
reorganizes the web application around route-, application-, and domain-owned
modules, and replaces the historical line editor with one canonical multiline
lyrics field. The large catalogue screens are now factorized by responsibility,
the legacy-data migration has a documented trigger, obsolete editor residue is
removed, and the required checks and local reviews are clean. No later roadmap
lot has started.

## Evidence checklist

- [x] `pnpm install --frozen-lockfile` succeeds from the committed lockfile.
- [x] `pnpm check` passes formatting, lint, TypeScript, 3 tests, and production
      builds for all 4 workspaces. The final run executed 16 cache misses after
      Turbo cache dependencies were corrected.
- [x] The TanStack Start shell returns HTTP 200 and was inspected in the browser
      at 1440×900 and 390×844. It is French, has no horizontal overflow, and
      shows no product capability as already implemented.
- [x] Two fresh reviewers completed independent product/UX and engineering
      reviews. Their two P2 findings were corrected and reverified.
- [x] The branch and commit state are recorded at handoff.
- [x] Lot 2 `pnpm check` passes formatting, lint, TypeScript, 21 tests, and all
      production builds.
- [x] The mandatory Convex review found one cross-account profile-image
      ownership vulnerability. Upload intents, persisted image ownership,
      attachment indexes, and a cross-account regression test now prevent a
      member from attaching or deleting another member's image. The real Convex
      schema push succeeds.
- [x] Verify the corrected authenticated header and sign-in/sign-up redirects,
      the account-loading skeleton, and affected desktop/mobile layouts. Chrome
      with the existing authenticated account redirected both public auth routes
      to `/profile`, showed only profile/sign-out actions, had no console error,
      and had no horizontal overflow at 390×844. A separate anonymous session
      visibly transitioned from the targeted account skeleton to the sign-in
      form and also had no horizontal overflow at 390×844. Sonner success/error
      calls are wired to asynchronous actions and passed typecheck/build; no
      profile or auth mutation was performed merely to manufacture a toast.
- [x] Run `pnpm check` for the corrective diff and repeat the mandatory
      completion review against `097e3ff...HEAD`.
- [x] Record the live authenticated session evidence available in Chrome. Google
      consent return, delivered email, reset/verification links, and live uploads
      were not repeated in this pass; that remaining external evidence stays
      explicit instead of becoming a manual account-linking UI requirement.
- [x] The no-backend state was inspected in Chrome desktop and a narrow in-app
      viewport; navigation is responsive, the limitation is explicit, and the
      browser console has no warning or error.
- [x] The auth proxy returns a structured HTTP 503 when deployment configuration
      is absent, and the production client bundle contains no explicit Node or
      TanStack server-module import.
- [x] Lot 3 `pnpm check` passes formatting, lint, TypeScript, 37 tests, and all
      production builds after the corrective review.
- [x] Chrome verifies the Corail shell in system, light, and dark modes and the
      French/English switch. Both preferences survive a reload, the HTML `lang`
      value follows the locale, and the browser console reports no warning or
      error.
- [x] Desktop and 390×844 layouts were inspected. The mobile shell has no
      horizontal overflow (`scrollWidth === innerWidth === 390`), exposes a
      labelled menu, and closes with Escape while returning focus to its
      trigger.
- [x] The final Standards re-review reports 0 hard violations and 0 judgement
      calls. The final Spec re-review reports 0 implementation defects and 0
      scope-creep findings. The final `pnpm check` is clean.
- [x] The user-directed Soft Pop and photographic-hero correction passes its own
      final Standards re-review with 0 hard violations and 0 judgement calls and
      its final Spec re-review with 0 remaining or new findings and 0 scope
      creep. The final `pnpm check` remains clean with 37 tests.
- [x] Lot 5 `pnpm check` passes formatting, lint, TypeScript, 73 tests, and the
      client/SSR production builds. The local standards/specification review and
      Convex review have no unresolved blocking finding.

## Lot history

### Lot 5 — Web structure and lyric entry (complete)

- La base de revue obligatoire est `481d69c`; le diff du lot jusqu'au commit
  d'implémentation final `ad020b8` est non vide. La revue a porté sur l'ensemble
  de ce diff, et pas seulement sur les derniers correctifs.
- `routes/` possède désormais la composition, les paramètres et les boundaries.
  Les providers et le shell globaux résident dans `app/`; les écrans métier
  résident dans `features/`. Le répertoire historique
  `apps/web/src/components/` n'existe plus. `SongEditor`, `AlbumEditor` et
  `ArtistStudio` sont séparés en contrôleurs, formulaires, étapes, cartes et
  contrôles de publication au lieu de réunir toutes les responsabilités dans
  un seul fichier.
- Le routeur installe `ConvexQueryClient`, `QueryClient` et
  `setupRouterSsrQueryIntegration`. Les pages publiques profil et chanson
  préchargent leur `convexQuery(...)` avec `queryClient.query` et
  `staleTime: "static"`, puis lisent la même requête avec
  `useSuspenseQuery`. Cette forme remplace l'API `ensureQueryData` dépréciée.
  Les requêtes catalogue protégées par Better Auth restent client-only : aucun
  loader serveur protégé n'a été ajouté sans preuve du transfert du jeton au
  client HTTP Convex.
- La page publique `/songs/$songId` rend uniquement les données publiées et les
  paroles en lecture seule. Les projections publiques excluent les identifiants
  de propriétaire et l'attestation de droits. Un brouillon ou le contenu d'un
  membre suspendu reste invisible publiquement.
- Le seul éditeur normal est `lyricsText`, un `textarea` TanStack Form. Le texte
  brut, ses retours à la ligne et ses balises restent la source canonique. Le
  parseur sert seulement à l'aperçu et au rendu. Les tests couvrent CRLF,
  balises françaises/anglaises, balises inconnues, texte sans balise, lignes
  vides, en-têtes consécutifs, limite serveur, conservation exacte, lecture
  publique et compatibilité des anciennes lignes.
- La migration `internal.catalogue.backfillSongLyricsText` traite un morceau par
  transaction, poursuit par curseur planifié et conserve les anciennes tables
  pendant la phase de compatibilité. Le déclencheur reproductible
  `pnpm --filter @lyrx/backend migrate:lyrics` est documenté dans
  `docs/development.md`. Il n'a pas été exécuté automatiquement sur une
  production. Une synchronisation locale `convex dev --once` a uniquement mis
  à jour le déploiement de développement afin de remplacer l'ancien contrat
  `sections` par `lyricsText`.
- Revue locale Standards/Spec : les écarts trouvés (boundaries dépendantes de
  providers pas encore montés, absence de page publique de chanson et message
  d'erreur catalogue trop spécifique) ont été corrigés puis revus. Il ne reste
  aucune violation dure ni défaut de spécification bloquant.
- Revue Convex : 0 finding Critical et 0 Important. Suggestion acceptée : la
  lecture de compatibilité d'un ancien morceau peut lire jusqu'à 4 000 lignes,
  mais elle reste bornée, temporaire et couverte par un backfill paginé et
  relançable ; supprimer les anciennes tables fera l'objet d'une migration
  séparée après vérification de chaque déploiement.
- `pnpm check` passe avec 28 tests shared, 27 tests backend et 18 tests web,
  soit 73 tests, ainsi que les builds client et SSR. La route profil publique a
  été observée en SSR et le brouillon public a renvoyé l'état introuvable sans
  débordement à 390 px avant que l'utilisateur choisisse de reprendre lui-même
  les vérifications visuelles finales. Aucune publication n'a été provoquée
  pour fabriquer une preuve visuelle.

### Lot 4 — Catalogue artiste (complete)

- Ajout des brouillons de morceaux et d’albums, de l’édition, des aperçus,
  de la publication/dépublication, des paroles structurées avec identifiants
  stables, des pochettes et de l’ordre des pistes.
- Le formulaire de morceau utilise TanStack Form en trois étapes. Les champs
  obligatoires de l’étape Informations bloquent la progression, affichent leur
  erreur et reprennent le focus. Les sections et lignes peuvent être déplacées
  sans perdre leurs identifiants.
- L’onboarding présente désormais Fan et Artiste sous forme de choix explicites.
  Les champs facultatifs sont annoncés comme tels dans l’onboarding, le profil
  et les éditeurs de catalogue. Les onglets Studio et les CTA de l’accueil
  suivent correctement l’orientation et l’état de session.
- Les mises à jour de métadonnées et de pistes d’un album sont atomiques. Les
  contenus publiés d’un membre suspendu ne sont plus publics. Une pochette est
  validée puis enregistrée sur son intention avant l’attachement ; une intention
  expirée supprime le fichier enregistré mais non attaché.
- Les listes Studio utilisent la pagination Convex native et restent donc
  accessibles au-delà de 100 éléments. Un cron Convex horaire unique nettoie
  les uploads orphelins, y compris ceux envoyés tard pendant la validité de
  l’URL, et parcourt toutes les pages de stockage sans multiplier les balayages
  par intention.
- La publication exige une attestation explicite des droits ou autorisations
  nécessaires pour le contenu, les paroles et la pochette. Cette attestation est
  validée côté Convex et horodatée sur le morceau ou l’album. Toute modification
  de contenu, de pistes ou de pochette remet l’élément en brouillon et exige une
  nouvelle attestation avant republication.
- Les erreurs catalogue sont localisées et persistantes, et les écrans de détail
  disposent d’un repli localisé au lieu de laisser remonter une erreur racine.
- Vérification navigateur : accueil authentifié sans CTA d’authentification,
  validation et focus de la première étape, onglets Studio horizontaux, aucun
  débordement à 390 px. `pnpm check` passe avec 57 tests et les builds client/SSR.
- Après synchronisation avec `convex dev --once`, le Studio paginé a été rechargé
  dans le navigateur : l’erreur de contrat obsolète a disparu et les onglets,
  l’état vide et les actions sont de nouveau visibles.
- La clôture obligatoire rapporte 0 violation Standards, 0 défaut ou scope creep
  Spec, et 0 finding Convex Critical ou Important. Les suggestions restantes et
  leurs arbitrages sont consignés ci-dessous.
- Git de clôture : branche `feat/artist-catalogue-albums`, base de revue
  `f990788`, commit d’implémentation final `3b9825d`. Le commit documentaire de
  clôture le suit sans modification du produit.
- Correctif post-clôture du 2026-10-22 : les routes parentes d’un morceau et
  d’un album rendent désormais leur route enfant, tandis que l’éditeur réside
  dans une route index dédiée. Le bouton Aperçu affiche donc bien l’aperçu au
  lieu de réafficher le formulaire, et une création ou une modification réussie
  redirige vers cet aperçu. `pnpm check` reste vert avec 57 tests et les builds
  client/SSR. La revue locale du diff ne relève aucun défaut ; la revue Convex
  est non applicable car aucun fichier Convex n’a changé. La vérification
  visuelle finale avec un contenu appartenant à l’utilisateur lui est laissée,
  à sa demande. Commit du correctif : `cfd0f7d`.

#### Décision post-lot — éditeur de paroles du lot 5

- Le lot 4 conserve son éditeur structuré historique. Le lot 5 le remplacera
  par un seul `textarea` : le texte brut, les retours à la ligne et les en-têtes
  comme `[Couplet 1]` ou `[Refrain]` sont la source d’auteur. Il ne s’agit plus
  d’un import `.txt` séparé, ni d’un ensemble d’inputs ligne par ligne.
- Un parseur pourra présenter une validation ou un aperçu non modifiable, avec
  les en-têtes inconnus comme sections personnalisées. Les corrections se font
  toujours dans le même `textarea`; les PDF et l’OCR ne font pas partie de ce
  lot.

#### Idée différée — carnet d’écriture avec audio local

- Ne pas intégrer dans le lot 4. Distinguer ce futur **carnet d’écriture** du
  carnet V1 de passages sauvegardés : il contiendrait des textes libres privés,
  autosauvegardés, nommables et classables en idée, brouillon ou archive. Une
  note pourrait ensuite être transformée ou liée à un brouillon de morceau sans
  publication automatique.
- Prévoir un mode d’écriture sans audio en priorité : sauvegarde automatique,
  historique léger, compteur, recherche et fonctionnement hors ligne sur
  mobile. Le texte reste synchronisé dans Convex ; aucune note n’est publique.
- Pour accompagner l’écriture, parler d’**attacher un audio local** plutôt que
  de l’importer : le lecteur garde seulement une référence locale et ses
  métadonnées, sans envoyer ni dupliquer le MP3 dans Convex. Afficher un petit
  lecteur persistant avec lecture/pause, déplacement, vitesse et boucle A–B
  pendant que l’éditeur reste utilisable.
- Sur le Web, un fichier choisi sans téléversement ne peut être garanti après
  fermeture de la page ; il faudra éventuellement le resélectionner. Réserver
  l’expérience persistante au client mobile, avec permission locale durable et
  demande de resélection si le fichier a été déplacé, supprimé ou si l’accès a
  expiré. Ne pas héberger d’audio dans Lyr’X et ne pas promettre de synchroniser
  le MP3 entre appareils.

#### Arbitrages de revue conservés

- Les petits composants `OptionalLabel` restent pour l’instant proches de
  chacun des quatre formulaires : leur extraction imposerait une API partagée
  uniquement pour un fragment de texte localisé. Les centraliser lorsqu’un
  troisième comportement, et pas seulement un troisième rendu, apparaît.
- La table de correspondance des types de sections reste dupliquée entre
  l’éditeur et l’aperçu afin de ne pas coupler leurs modèles de présentation.
  Extraire un module de domaine lorsque la lecture publique ajoutera un
  troisième consommateur.
- Les requêtes publiques utilisent encore les documents catalogue internes.
  Introduire des DTO publics minimaux avec le lot Découverte, quand leur contrat
  de recherche et de page publique sera défini, plutôt que figer aujourd’hui un
  second schéma incomplet. L’attestation et les identifiants techniques ne sont
  pas rendus visuellement.
- Le chemin réel upload → enregistrement → attachement a été déployé mais n’est
  pas revendiqué comme vérifié de bout en bout dans cette passe : `convex-test`
  ne conserve pas le type MIME du Blob. Garder ce contrôle d’intégration dans la
  checklist externe avant production.

### Lot 1 — Monorepo foundation and working documentation

Delivered on 2026-10-19 on `chore/foundation-monorepo`.

- pnpm/Turborepo workspace with `apps/web`, `packages/ui`, `packages/shared`,
  and the reserved `packages/backend` Convex boundary.
- Minimal server-rendered TanStack Start page, shadcn source component, portable
  shared product identifiers, strict TypeScript, lint, tests, and build gate.
- Official Convex AI files installed with `npx convex ai-files install`; no schema,
  server function, deployment, or authentication was introduced.
- Durable product specification, architecture, roadmap, development guide, and
  official integration research.
- Review corrections: preserved the complete cross-lot product decisions in
  `docs/specification.md`; made ESLint/TypeScript root configs invalidate Turbo
  cache; moved the page component out of the route to restore code splitting.

### Lot 2 — Backend, auth, roles, and profiles (complete)

Implemented locally on 2026-10-19 on `feat/backend-auth-profiles`.

- Repository-owned Better Auth component with generated schema, Convex HTTP
  routes, TanStack Start proxy/provider wiring, and exact compatible dependency
  pins (`@convex-dev/better-auth@0.12.5`, `better-auth@1.6.33`).
- Email/password registration, verification and reset callbacks, conditional
  Google sign-in, Better Auth automatic trusted-provider linking, sign-out, and
  truthful capability states when external providers are absent.
- Verified-email onboarding into immutable Fan or Artist roles; separate
  administrator flag with single-use internal bootstrap; active/suspended
  server authorization.
- Unique public handles, editable fan/artist profiles, allowlisted social and
  custom links, public projections, avatar/banner Convex storage with type/size
  validation and replacement cleanup.
- shadcn-based account, onboarding, profile, loading, empty, error, unavailable,
  and suspension states. The TweakCN Caffeine tokens are the installed baseline;
  the deeper Lyr’X visual pass remains reserved for lot 3.
- Automated Convex authorization/profile tests and local schema generation pass.
  Production web bundling passes without the reported TanStack server-module
  leakage.

The Convex cloud development project `johnsontolotriniavo/lyrx` is now created in
Europe (Ireland). The functions and local Better Auth component were pushed
successfully to `lovely-dolphin-50`; live queries prove the anonymous session and
provider capability states. Google and Resend credentials are configured. The
Google flow reaches the real consent screen, while final consent/return, actual
email delivery, reset/verification links, authenticated session cookies,
webhook events, and live storage uploads are not yet claimed as verified. See
[authentication.md](authentication.md).

`pnpm peers check` also reports Better Auth's optional Vitest peer range ending
at Vitest 4 while this workspace uses Vitest 5. The application and Better Auth
runtime do not consume that optional testing peer; the warning is kept visible
rather than suppressed, and all repository tests pass.

### Lot 2 mandatory review — 2026-10-20

The `code-review` Standards and Spec axes and `convex:convex-reviewer` ran on
`097e3ff...HEAD`, the complete diff since the final lot 1 commit.

- The blocking storage finding was corrected by binding each upload intent and
  stored profile image to its authenticated member. The Resend webhook secret is
  now also part of the typed Convex deployment contract.
- The corrective re-review additionally required ownership-gated replacement
  cleanup. Upload intents now expire after ten minutes, are deleted by a
  scheduled internal mutation, and are limited to five per member per window by
  the official Convex Rate Limiter component. A submitted storage object must
  have been created during the intent lifetime; unowned rejected objects are
  preserved rather than deleted from a client-supplied identifier.
- The final Standards re-review reports no implementation-blocking finding. The
  final Convex re-review reports 0 Critical and 0 Important findings; its
  lifecycle-test suggestion was then closed with explicit pre-intent rejection
  and scheduled-expiry tests.
- That review recorded missing real-path authentication evidence separately from
  implementation findings. The later account-UX corrective pass must now repeat
  the final code review; external checks that cannot be performed stay disclosed
  rather than becoming artificial blocking requirements.
- One non-blocking structure suggestion remains accepted for now: the two
  profile forms repeat small field validators. Extracting them before the deeper
  visual work would create a temporary interface that lot 3 is expected to
  reshape; reassess it while composing the lot 3 forms.

### Lot 2 corrective final review — 2026-10-20

- The Standards and Spec axes re-ran on `097e3ff...HEAD`. Their initial findings
  identified an overclaimed toast verification and hard-coded post-auth routing
  to onboarding. The evidence wording now distinguishes observed browser states
  from typecheck/build evidence, and `/account` routes each live member state to
  verification, onboarding, profile, suspension, or sign-in as appropriate.
- The final Standards re-review reports no hard violation. The final Spec
  re-review reports no remaining or new finding.
- The final Convex review remains at 0 Critical and 0 Important. The corrective
  commits do not touch `packages/backend/convex/`. Its unused
  `profileImages.by_member_id_and_kind` index suggestion is accepted as
  non-blocking pending the next image-management operation.
- Two non-blocking code-structure judgement calls remain: the email action forms
  duplicate a small layout/state pattern, and `profile-editor.tsx` still combines
  profile fields with image-upload concerns. Reassess these seams during the
  deeper account UI composition instead of introducing temporary interfaces at
  this gate.
- `pnpm check` passes formatting, lint, TypeScript, 21 tests, and production
  client/SSR builds. Authenticated and anonymous browser checks cover the account
  resolver, auth-route guards, header state, targeted skeleton transition,
  keyboard focus, console state, and 390×844 overflow.

### Lot 3 — Corail shell, theme, and i18n (complete)

Implemented on `feat/corail-shell-theme-i18n`.

- Built the initial Corail token pass from the TweakCN Caffeine baseline; the
  later user-directed correction below supersedes that baseline with Soft Pop
  while retaining the exact coral brand mark.
- Added the responsive shadcn/Radix shell, desktop and mobile account navigation,
  semantic loading states, and an editorial landing composition that does not
  claim future catalogue capabilities are already available.
- Added `next-themes` light/dark/system preferences under the `lyrx-theme`
  storage key and a French-first shared message catalogue with remembered
  French/English switching under `lyrx-locale`. Existing auth, onboarding,
  profile, loading, validation, and toast UI now follows that locale.
- The initial Standards review found duplicated SSR metadata ownership and a
  missing semantic foreground for the exact coral logo mark. The initial Spec
  review additionally found raw provider/server error details could escape in
  the wrong language. Corrections now source SSR metadata from the shared
  catalogue, add an accessible `brand-foreground` pair, and normalize stable
  Better Auth/Convex error codes into localized messages while hiding unknown
  provider text behind a translated fallback.
- The previous profile-validation duplication was closed with shared portable
  handle/display-name predicates and regression tests. The browser-side handle
  rule now matches the server’s normalized boundary rule instead of accepting
  leading or trailing punctuation that Convex would later reject.
- Lot 3 changes no file under `packages/backend/convex/`; the required Convex
  review is therefore not applicable under the completion rule rather than
  producing invented backend findings.
- The corrective Standards re-review reports 0 hard violations and 0 judgement
  calls. The corrective Spec re-review reports 0 implementation defects and 0
  scope-creep findings. Chrome supplied the available browser evidence; other
  browser engines were not available in this environment and are not claimed as
  verified.
- The initial completion `pnpm check` passed formatting, lint, TypeScript, 38
  tests, and all production client and SSR builds before the final landing
  simplification below removed its obsolete account-state test.

### Lot 3 visual correction — 2026-10-21

- Replaced the landing hero's decorative blurred color treatment with a locally
  served AI-generated editorial studio photograph. The optimized WebP is 124 KB,
  has localized alternative text, and contains no product promise or readable
  embedded copy.
- Adopted the user-selected TweakCN Soft Pop tokens while retaining the exact
  coral Lyr'X brand mark. DM Sans Variable, Newsreader Variable, and Space Mono
  are self-hosted through Fontsource so the selected typography does not depend
  on a visitor's system fonts. Newsreader is limited to the landing display
  headline; the interface and long-form reading remain in DM Sans.
- Browser verification confirms the image loads at its intrinsic width, the
  computed body family is DM Sans Variable, no rendered element uses a CSS
  gradient, the post-reload console is clean, and the 390×844 layout has no
  horizontal overflow.
- The first corrective review found inaccessible light secondary/destructive
  contrast and hand-built feature-card surfaces. The fixes use accessible
  semantic pairs and the installed shadcn Card composition. Follow-up review
  then restored semantic `h2` headings and removed a typography override from
  `CardDescription`.
- Commits `d8ab13d` and `e3e1edd` completed the approved editorial composition:
  the existing photograph now fills a shorter borderless hero, the centered
  headline uses a smaller normal/italic Newsreader treatment, and the capsule
  header shares the hero's content width. The redundant landing account card
  and its obsolete backend-limitation test were removed; account state remains
  available through the header and dedicated account routes.
- The mandatory follow-up gate reviewed `ebdaab7...HEAD`. Its first pass found
  only stale typography and verification documentation; after correction, the
  Standards re-review reports 0 hard violations and 0 judgement calls, and the
  Spec re-review reports 0 remaining or new findings and 0 scope creep. No file
  under `packages/backend/convex/` changed, so the Convex review is not
  applicable.
- The final Standards re-review reports 0 hard violations and 0 judgement calls.
  The final Spec re-review reports 0 remaining or new findings and 0 scope creep.
  Lot 3 still changes no Convex file, so its Convex review remains not
  applicable.
- `pnpm check` passes formatting, lint, TypeScript, 37 tests, and all production
  client and SSR builds after the final corrections.

## Known external prerequisites

Hosting/domain, EAS, and Android signing configuration have not been supplied.
Google consent return and real email delivery/reset/verification remain recorded
as unverified live integrations; they did not produce a code-review blocker.

## Deferred configuration checklist

- [ ] Rotate the Google OAuth client secret once, then keep the replacement only
      in the Convex dashboard. Never copy provider secrets into
      `apps/web/.env.local` or any `VITE_` variable.
- [ ] When Lyr’X owns its production email domain, verify that domain in Resend,
      add `EMAIL_FROM` to the Convex dashboard, and replace the temporary
      `Lyr’X <noreply@hallomada.de>` sender without changing application code.
- [ ] Register and verify all `email.*` events against
      `https://lovely-dolphin-50.eu-west-1.convex.site/resend-webhook`, then
      prove delivery, bounce, and complaint status in the Convex Resend
      component tables.
- [ ] Before production, change `SITE_URL` and the Google authorized callback
      from localhost to the final HTTPS origin and repeat the full OAuth return
      test.

## Next mission

Implement the approved Lot 5 only. The writing notebook with local audio and
the Genius-style sharing-card refinement remain proposal-only.
