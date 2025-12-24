import { type LoaderFunctionArgs, redirect } from "react-router";
import { getUser } from "~/auth/auth.server";
import { db } from "~/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const adminUser = await db.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!adminUser) {
    throw redirect("/setup");
  }

  const user = await getUser(request);

  if (!user) {
    throw redirect("/login");
  }

  const vcsDataSource = await db.dataSource.findFirst({
    where: {
      provider: {
        in: ["GITHUB", "GITLAB", "BITBUCKET", "AZURE_DEVOPS"],
      },
      isEnabled: true,
    },
  });

  if (!vcsDataSource) {
    throw redirect("/onboarding/data-sources");
  }

  throw redirect("/dashboard");
}

export default function Home() {
  return null;
}
