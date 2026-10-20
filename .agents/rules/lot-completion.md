# Lot completion review gate

## When this applies

Apply this gate after a roadmap lot is implemented and before declaring it
complete or requesting approval to begin the next lot.

## Required reviews

1. Pin the completed lot's fixed point to the final commit of the preceding lot
   or the branch base, and confirm that `<fixed-point>...HEAD` is non-empty.
2. Run the `code-review` skill across the entire lot diff. Keep its Standards
   and Spec reports separate and use the repository documentation as their
   source of truth.
3. Run the `convex:convex-reviewer` skill across every Convex change in the lot.
   If the lot changed no Convex code, record that the Convex review is not
   applicable instead of inventing findings.
4. Resolve every hard standards violation and every Critical or Important
   finding. Re-run the affected review after corrections. Suggestions may remain
   only when their trade-off is documented in `docs/progress.md`.
5. Run the checks required by `docs/development.md`, then record review results,
   corrections, remaining accepted suggestions, and verification evidence in
   `docs/progress.md`.

The lot is complete only when both review axes and the Convex review have no
unresolved blocking findings, required checks pass, documentation is current,
and the final Git state is identifiable. Start the next lot only after the user
approves it.
