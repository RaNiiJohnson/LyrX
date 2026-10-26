import { cronJobs } from "convex/server"

import { internal } from "./_generated/api"

const crons = cronJobs()
crons.interval(
  "recover public discovery maintenance",
  { minutes: 1 },
  internal.discovery.maintenance.recover,
  {}
)

crons.interval(
  "resume stalled account deletion",
  { minutes: 5 },
  internal.accounts.deletion.resumeStalledJobs,
  {}
)

crons.interval(
  "clean up unclaimed storage",
  { hours: 1 },
  internal.catalogue.artwork.sweepUnclaimedStorage,
  {}
)

export default crons
