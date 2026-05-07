// Scheduled jobs.
//
// Currently only one: a daily sweep that deletes regular user accounts
// past the 60-day TTL. See `convex/account_lifecycle.ts` for the
// cascade rules and safety bounds.

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run once every 24 hours. Convex's `interval` schedules from the moment
// the cron is deployed, which is fine for this use case — there's no
// time-of-day requirement, just "roughly daily".
crons.interval(
  "purge expired user accounts",
  { hours: 24 },
  internal.account_lifecycle.runDailyCleanup,
  {},
);

export default crons;
