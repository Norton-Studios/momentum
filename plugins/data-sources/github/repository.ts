import { Octokit } from "@octokit/rest";
import "dotenv/config";

export const resources: string[] = ["repository"];

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export const run = async (db: any) => {
  console.log("Importing repositories from GitHub...");

  const { data: repos } = await octokit.repos.listForAuthenticatedUser({
    per_page: 100,
  });

  for (const repo of repos) {
    if (!repo.owner) continue;

    const data = {
      name: repo.name,
      description: repo.description,
      owner: repo.owner.login,
      url: repo.html_url,
      language: repo.language,
      isPrivate: repo.private,
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      issues: repo.open_issues_count ?? 0,
      externalId: repo.id.toString(),
      createdAt: repo.created_at ? new Date(repo.created_at) : new Date(),
      updatedAt: repo.updated_at ? new Date(repo.updated_at) : new Date(),
    };

    await db.repository.upsert({
      where: { externalId: data.externalId },
      update: data,
      create: data,
    });
  }

  console.log(`Imported ${repos.length} repositories.`);
};
