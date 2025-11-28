import { data, type LoaderFunctionArgs, redirect } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";

export async function completeLoader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const organization = await db.organization.findFirst();
  if (!organization) {
    return redirect("/onboarding/datasources");
  }

  await db.organization.update({
    where: { id: organization.id },
    data: { onboardingCompletedAt: new Date() },
  });

  const dataSources = await db.dataSource.findMany({
    where: {
      organizationId: organization.id,
      isEnabled: true,
    },
    include: {
      configs: {
        where: {
          key: { in: ["GITHUB_ORG", "GITLAB_GROUP", "BITBUCKET_WORKSPACE"] },
        },
      },
    },
  });

  const repositories = await db.repository.count({
    where: { isEnabled: true },
  });

  const commits = await db.commit.count();
  const mergeRequests = await db.mergeRequest.count();
  const contributors = await db.contributor.count();

  const dataSourcesSummary = dataSources.map((ds) => ({
    provider: ds.provider,
    name: ds.configs.find((c) => c.key.includes("ORG") || c.key.includes("GROUP") || c.key.includes("WORKSPACE"))?.value || ds.name,
  }));

  return data({
    organization: { name: organization.displayName || organization.name },
    dataSources: dataSourcesSummary,
    summary: {
      repositories,
      commits,
      mergeRequests,
      contributors,
    },
  });
}
