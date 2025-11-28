import { type ActionFunctionArgs, data, type LoaderFunctionArgs, redirect } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";

export async function importingLoader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const vcsDataSource = await db.dataSource.findFirst({
    where: {
      provider: { in: ["GITHUB", "GITLAB", "BITBUCKET"] },
      isEnabled: true,
    },
  });

  if (!vcsDataSource) {
    return redirect("/onboarding/datasources");
  }

  const enabledRepos = await db.repository.count({
    where: {
      dataSourceId: vcsDataSource.id,
      isEnabled: true,
    },
  });

  return data({
    enabledRepos,
    message: "Import has been initiated for enabled repositories. Data will be collected in the background.",
  });
}

export async function importingAction({ request }: ActionFunctionArgs) {
  await requireAdmin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "continue") {
    return redirect("/onboarding/complete");
  }

  return data({ error: "Invalid intent" }, { status: 400 });
}
