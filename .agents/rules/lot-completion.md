# Lot completion review gate

## When this applies

Apply this gate after a roadmap lot is implemented and before declaring it
complete or requesting approval to begin the next lot.

## Required review

1. Pin the completed lot's fixed point to the final commit of the preceding lot
   or the branch base, and confirm that `<fixed-point>...HEAD` is non-empty.
2. The primary agent reviews the entire lot diff once, locally. Check both
   repository standards and the originating request or specification. Do not
   run the `code-review` skill or delegate this review to sub-agents.
3. Run the `convex:convex-reviewer` skill only when the lot changes files under
   `packages/backend/convex/`. Otherwise record that the Convex review is not
   applicable.
4. Resolve every hard standards violation, specification defect, and Critical
   or Important Convex finding. Re-review corrected files locally. Suggestions
   may remain only when their trade-off is documented in `docs/progress.md`.
5. Run the checks required by `docs/development.md`, then record the local review,
   corrections, accepted suggestions, and verification evidence in
   `docs/progress.md`.

The lot is complete only when the local review and any applicable Convex review
have no unresolved blocking findings, required checks pass, documentation is
current, and the final Git state is identifiable. Start the next lot only after
the user approves it.
