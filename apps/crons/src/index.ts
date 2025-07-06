import cron from "node-cron";
import { loadJobs } from "./lib/dynamicJobs";

async function startScheduler() {
  console.log("Starting cron scheduler...");
  const jobs = await loadJobs();

  jobs.forEach((job) => {
    if (cron.validate(job.schedule)) {
      cron.schedule(job.schedule, job.handler);
      console.log(`Scheduled job: ${job.name} with schedule: ${job.schedule}`);
    } else {
      console.error(
        `Invalid cron schedule for job ${job.name}: ${job.schedule}`,
      );
    }
  });
}

startScheduler();
