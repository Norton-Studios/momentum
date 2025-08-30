import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getCurrentUser } from "~/utils/session.server";
import { getOnboardingProgress } from "@mmtm/resource-tenant";
import { prisma as db } from "@mmtm/database";

export const meta: MetaFunction = () => {
  return [{ title: "Momentum - Developer Productivity Analytics" }, { name: "description", content: "Measure and improve your team's productivity" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getCurrentUser(request);

  if (user) {
    // Check onboarding progress for admin users
    if (user.role === "ADMIN") {
      const onboardingProgress = await getOnboardingProgress(user.tenantId, db);

      // If onboarding is not completed, redirect to the current step
      if (onboardingProgress && !onboardingProgress.completed) {
        // Map the current step to the appropriate route
        const stepRoutes: Record<string, string> = {
          "data-sources": `/onboarding/data-sources?tenant=${user.tenantId}`,
          repositories: `/onboarding/repositories?tenant=${user.tenantId}`,
          team: `/onboarding/team?tenant=${user.tenantId}`,
          review: `/onboarding/review?tenant=${user.tenantId}`,
        };

        const redirectUrl = stepRoutes[onboardingProgress.currentStep] || `/onboarding/data-sources?tenant=${user.tenantId}`;
        throw redirect(redirectUrl);
      }
    }

    // User is authenticated and onboarding is complete (or user is not admin), redirect to dashboard
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
