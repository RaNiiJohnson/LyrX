// Compatibility for a backfill queued before the T1 module migration.
// Its next scheduled page uses catalogue/aggregates.
export { backfill } from "./catalogue/aggregates"
