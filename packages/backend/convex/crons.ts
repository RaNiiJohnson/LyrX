import { cronJobs } from "convex/server"

import { internal } from "./_generated/api"

const crons = cronJobs()

crons.interval(
  "clean up unclaimed storage",
  { hours: 1 },
  internal.catalogue.sweepUnclaimedStorage,
  {}
)

export default crons
