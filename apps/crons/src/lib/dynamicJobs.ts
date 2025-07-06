import fg from "fast-glob";
import path from "path";

export interface CronJob {
  name: string;
  schedule: string;
  handler: () => void;
}

export async function loadJobs(): Promise<CronJob[]> {
  const jobPaths = await fg(
    ["../data-sources/*/cron/index.ts", "../reports/*/cron/index.ts"],
    {
      absolute: true,
      cwd: __dirname,
    },
  );

  const jobs: CronJob[] = [];

  for (const jobPath of jobPaths) {
    try {
      const module = await import(jobPath);
      if (
        module.default &&
        typeof module.default === "object" &&
        module.default.schedule &&
        module.default.handler
      ) {
        const jobName = path.basename(path.dirname(path.dirname(jobPath)));
        jobs.push({ name: jobName, ...module.default });
        console.log(
          `Loaded job: ${jobName} from: ${path.relative(process.cwd(), jobPath)}`,
        );
      }
    } catch (error) {
      console.error(`Error loading job from ${jobPath}:`, error);
    }
  }

  return jobs;
}
