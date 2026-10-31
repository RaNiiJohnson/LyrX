# Pre-lot 10 architecture verification

Date: 31 October 2026. Branch: `codex/pre-lot10-architecture`.
Fixed review point: `940129c` (current main/origin/main when work started).
Worktree: `/home/niiavo/Desktop/lyrx-pre-lot10`.

## Scope and preservation

The public home, three discovery lists, public song/album/profile and community
reading routes own their composition and preload/read contracts. Functional
filters/pagination, profile identity/banner, optional artist catalogue,
community reporting, form controllers and moderation stay in features.
Account redirection and liked-page access/header now belong to routes; the
Studio and its editors share one Artist presentation gate. Public data is loaded
before rendering where required, while private/optional reads keep their
existing session gates and pagination. No lot 10 notebook or sharing work.

The original `personal-project` checkout remains on main. Its sidebar, shell,
release-slider and discovery-read changes were not copied into this branch.
The approved architecture instructions supplied in this worktree are retained
as this feature's decisions. No whole-repository stage, reset or destructive
checkout was used. Removed source files went to the recoverable desktop Trash
through a `trash` wrapper around `gio trash` (trash-cli is not installed).
Ignored development configuration was copied locally, never staged.

## Automated evidence

- The complete `pnpm check` passed 438 tests before the navigation follow-up.
- Navigation follow-up: the real root auth handler in a memory router originally
  ran three times for initial visit, preload and navigation; after moving its
  initialization to a non-reloading root loader, it runs once. Server transport
  is mocked, not server authorization or the actual root loader configuration.
- Two real-Link/Router/Query integration cases cover mouseover and touchstart,
  exact page/sort/origin/genre cache keys, no navigation during preload, one
  fetch reused on arrival, and a distinct fetch when URL arguments change.
  They also exercise cold pending feedback within 200 ms and immediate release
  after data arrives using the application's actual pending configuration.
- React retains hidden previous content during Suspense transitions. The pending
  assertion checks for the visible loading text rather than requiring the
  previous page's textContent to disappear from the DOM.
- Existing route-content tests now render the real `Route.options.component`;
  only route hook inputs and the independently tested shell are supplied by
  test adapters. The production route files export no extra page components.
- Existing happy-dom listening-player tests still report disabled external
  iframe loading. These are not new integration failures or suppressed warnings.

## Chrome and album-card diagnosis

Chrome verified the home, public lists and actual album reading with the
configured development backend and existing published content. At 390×844,
Albums has `scrollWidth === innerWidth === 390`. Desktop reading and navigation
were exercised at the browser's normal desktop size. Both floating devtools
open; Router displays intent preloading, and React Query exposes the shared
public cache. The Albums list query was present before navigating from Songs.
No publication, profile save, comment/report submission, role change, deletion,
merge or production deployment was used to produce evidence.

Temporary, tagged local instrumentation measured a real **mon 1er album** card:

| Observation | Cold click | Click after completed hover preload |
| --- | --- | --- |
| Detail present before click | No (devtools showed list only) | Yes; loader reports `preload:true,cached:false`, then completes before click |
| Convex/Query loader | ~3,775 ms on this sample | 250 ms before click; 2.9 ms cached loader on click |
| Suspense query in page | ~2.1 ms | ~1.1 ms |
| Click to committed album page | ~3,989 ms | ~87.5 ms (router resolved ~126.8 ms after click) |
| Pending boundary | Appeared ~186 ms after click / ~150 ms after navigation began | Did not appear |

The cold pointer entered the card only 29 ms before click, before the router's
50 ms intent delay. The warm pointer was placed on the same album's real card
without following the link (right-click, then Escape); instrumentation confirms
that its loader completed before the normal click and the URL remained on the
origin page until then. These are separate development-browser samples, not a
controlled production benchmark. React development checks render/effect twice;
calculations use the first commit and browser-local timestamps.

The large cold delay in this observation occurs while awaiting Convex data,
not inside the page's Suspense hook or a CSS/card transition. The redundant
initial-token round trip was separately reproduced and removed. Lowering the
pending threshold only changes feedback; it does not make a cold network fetch
instantaneous. The development connection also produced intermittent SSR/auth
`fetch failed` errors and browser-control timeouts; successful reads and retries
must not be generalized into an always-fast or always-connected claim.

All `[DEBUG-albumnav]` instrumentation is removed before final validation.
The same real card was clicked successfully again after cleanup.
Physical-device touch latency, cross-engine timing, anonymous live sign-out and
full production performance are not claimed. Touch intent and private query
gating have isolated automated evidence.

## Review and delivery gate

The primary agent owns the complete local standards/specification review from
`940129c`, including new modules, tests, deleted facades, lockfile and corrected
navigation behavior. No completion review is delegated. Convex review is not
applicable: this feature changes no file under `packages/backend/convex/`.
Backend behavior remains covered by its 105 existing tests. Final `pnpm check`
passes 439 tests (29 shared, 105 backend, 305 web), formatting, lint, types and
client/SSR builds after diagnostic cleanup and dependency alignment. Query
Devtools matches Query 5.104.5. The peer check only reports the existing optional
Better Auth/Vitest range warning. Production devtool/diagnostic scans pass.

Implementation `167eab8` is pushed to `origin/codex/pre-lot10-architecture`.
The reviewed diff from `940129c` is non-empty. Chrome's GitHub form has its
English Markdown proposal filled, targets main and remains unsubmitted.
The delivery-record commit changes documentation only. The original checkout's
five-file patch still matches the snapshot taken before this feature.

## Integration references

- [Convex with TanStack Start](https://docs.convex.dev/client/tanstack/tanstack-start/)
- [Convex query adapter](https://docs.convex.dev/client/tanstack/tanstack-query)
- [TanStack Router devtools](https://tanstack.com/router/latest/docs/devtools)
- [React Query devtools](https://tanstack.com/query/latest/docs/framework/react/devtools)

## Helpers cache follow-up — 1 November 2026

User-authored local migrations were preserved on the same branch. Helpers reads
are used for selected non-loader subscriptions; mutations remain SDK hooks and
variable-term search stays uncached. Explicit idle retention: 300,000 ms / 250
entries. Both caches share a client, not a cache namespace. See architecture for
selection and identity-boundary rules.

The web suite passes 312 tests after updating old hook mocks (initial run: 78
failures). Six integration cases exercise actual Helpers and SDK hooks with a
substituted watch/auth transport: reactive return/expiry, skip and deletion
errors, pagination/filter/loading/empty continuation and cached-page reuse,
TanStack coexistence, new-document account lifetimes, and the 250-idle bound.
The actual logout UI additionally asserts document navigation. Account A →
anonymous → B is isolated lifecycle evidence, not real credential exchange or
cross-tab switching. Existing sign-in/logout construct fresh clients through
document navigation. Helpers itself does not partition results by principal.

Chrome verified read-only Studio → home → Studio with published songs visible on
return. Existing catalogue size did not permit live multi-page testing; pagination
is covered by isolated hooks and the existing backend tests. No publication,
mutation, account logout or role change was performed to manufacture evidence.
Primary-agent delta review has no blocking finding; backend unchanged.

Final follow-up `pnpm check` passed formatting, lint, types, 446 tests and
client/SSR builds. The subsequent user request authorizes PR creation. No merge,
deployment or lot 10 work is included.
