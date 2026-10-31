# Cache Convex Helpers et TanStack — note de décision

**Note historique : recherche du 31 octobre 2026.** La décision adoptée le
1 novembre 2026 est désormais dans [architecture.md](../architecture.md) :
Helpers 0.1.133 est une dépendance web directe, avec rétention bornée des lectures
sans loader sélectionnées par l'utilisateur. Les constats ci-dessous décrivent
le dépôt avant cette adoption.

**Statut initial : recherche uniquement, 31 octobre 2026.** Cette note ne prescrit
aucun changement de code. Elle examine `convex-helpers` 0.1.128, version déjà
verrouillée dans Lyr'X.

## Ce que fait `convex-helpers/react/cache`

`ConvexQueryCacheProvider`, placé sous `ConvexProvider`, conserve ouvertes les
subscriptions Convex de ses propres hooks `useQuery`, `useQueries` et
`usePaginatedQuery` après le démontage d'un écran. La durée par défaut est de
**5 minutes** et le maximum par défaut de **250 entrées inactives** ; ce cache
est explicitement un compromis UX contre davantage de bande passante, pas un
cache de données gratuit. Ce n'est pas une précharge : la première visite reste
froide; le bénéfice vise un retour avant expiration ou éviction.
[Documentation du paquet](https://github.com/convex/convex-helpers#query-caching).

La pagination est prise en charge par son `usePaginatedQuery` de remplacement.
Il conserve les subscriptions des pages ; la documentation précise aussi
`customPagination: true` si le backend utilise les helpers `stream` ou
`paginator`. [Implémentation et contrat du hook](https://github.com/convex/convex-helpers/blob/main/packages/convex-helpers/react/cache/hooks.ts).
L'implémentation signale toutefois une différence au hook Convex standard :
`latestPageSize` est fixé par défaut. Studio appelle toujours `loadMore(24)`;
il faut garder ce comportement couvert par un test si ce hook est adopté.

## Ce que fait déjà Lyr'X avec TanStack

Le couple `ConvexQueryClient` + TanStack Query garde lui aussi les
subscriptions `convexQuery(...)` actives après le démontage pendant `gcTime`
(**5 minutes** par défaut). Convex indique que c'est observable dans les React
Query Devtools et que ces valeurs restent à jour réactivement ; il n'y a pas
d'invalidation manuelle à ajouter. [Guide TanStack Start](https://docs.convex.dev/client/tanstack/tanstack-start/#staying-subscribed-to-queries), [guide de l'adaptateur](https://docs.convex.dev/client/tanstack/tanstack-query/#differences-from-using-fetch-with-tanstack-query).

Dans le worktree observé, les routes publiques (par exemple chanson) ont un
loader qui précharge `convexQuery(...)` et lisent le même résultat avec
`useSuspenseQuery`. Elles bénéficient donc du cache TanStack/Convex existant.
Ajouter `ConvexQueryCacheProvider` ne crée ni ne gère les entrées du
`QueryClient` TanStack : sa rétention est activée uniquement pour les hooks
importés de `convex-helpers/react/cache`. Les deux familles peuvent tout de
même utiliser le même client Convex; leurs politiques de cache restent
distinctes.

## Pourquoi le Studio refait un skeleton

`CatalogueDashboard` utilise actuellement le `usePaginatedQuery` standard de
`convex/react`, sans loader de route. Pour le hook React standard, Convex
documente que la subscription est créée au premier usage puis annulée au
démontage. Revenir à l'accueil puis au Studio recrée donc les listes et leur
état `LoadingFirstPage`; le skeleton constaté est cohérent avec cette
architecture. [Cycle de vie des hooks React Convex](https://docs.convex.dev/client/react/overview#reactivity).

Le cache des helpers pourrait techniquement réduire ce flash pour ces listes
brutes, à condition d'ajouter le provider et de remplacer **explicitement**
ces imports par ceux de `convex-helpers/react/cache`. Ce serait un deuxième
mécanisme de conservation de subscriptions, distinct de TanStack, et il faut
choisir une expiration/limite adaptées ainsi que mesurer le coût de bande
passante. Ce n'est pas requis pour les écrans déjà passés à
`convexQuery`/`useSuspenseQuery`. Le garde `ArtistAccess` utilise aussi le
`useQuery` standard pour `members.current` et montre un skeleton de catalogue
pendant son chargement; si ce flash est également indésirable, son hook devrait
être évalué séparément.

## Compatibilité et décision recommandée

Convex documente que les hooks React Convex standards peuvent coexister avec
les hooks TanStack et partagent le même client Convex. En revanche, la
documentation officielle ne décrit pas une intégration spécifique entre le
provider de `convex-helpers/react/cache` et le cache TanStack : ne pas les
traiter comme un cache unique. [TanStack Start : coexistence](https://docs.convex.dev/client/tanstack/tanstack-start/#using-convex-react-hooks), [mise en place de l'adaptateur](https://docs.convex.dev/client/tanstack/tanstack-query/#setup).

Dans le manifeste courant, `convex-helpers` 0.1.128 est déclaré par
`packages/backend`, pas par `apps/web`; un import depuis le code web ne se
résout donc pas actuellement. Cette version déclare le peer Convex
`^1.46.0`, compatible avec la version `1.47.0` de l'application web, mais
l'adoption nécessiterait tout de même une dépendance directe de `apps/web`.
Le point de montage naturel serait dans `BackendProvider`, sous
`ConvexBetterAuthProvider`, puisque le cache helper lit le client via le
contexte Convex. Le README du helper ne documente pas explicitement TanStack
Start/SSR : il faudrait vérifier le rendu initial et l'hydratation avant de
généraliser l'intégration.

Direction à valider avant code :

1. Garder TanStack (`loader` + `convexQuery` + `useSuspenseQuery`) comme chemin
   principal des pages dont les données sont indispensables au rendu.
2. Pour les listes Studio et les widgets secondaires, décider au cas par cas :
   soit une précharge TanStack adaptée, soit le cache `convex-helpers` pour les
   hooks Convex qui doivent rester réactifs hors route. Ne pas installer les
   deux caches globalement sans nécessité démontrée.
3. Vérifier dans React Query Devtools si une requête TanStack reste active lors
   d'une navigation ; cela distingue une vraie absence de cache d'un skeleton
   issu d'une autre requête non préchargée.
