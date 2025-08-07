import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getCurrentUser } from "~/utils/session.server";

export const meta: MetaFunction = () => {
  return [{ title: "Momentum - Developer Productivity Analytics" }, { name: "description", content: "Measure and improve your team's productivity" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getCurrentUser(request);

  if (user) {
    // User is authenticated, redirect to dashboard
    throw redirect("/dashboard");
  } else {
    // User is not authenticated, redirect to sign-in
    throw redirect("/auth/signin");
  }
}

export default function Index() {
  // This component should never render since we always redirect
  return null;
}
