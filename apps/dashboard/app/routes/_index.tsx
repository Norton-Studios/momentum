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
  console.log("Index loader - user:", user ? { role: user.role, tenantId: user.tenantId } : "null");

  if (user) {
    // Check onboarding progress for admin users
    if (user.role === "ADMIN") {
      console.log("Index loader - checking onboarding for admin user");
      const onboardingProgress = await getOnboardingProgress(user.tenantId, db);
      console.log("Index loader - onboardingProgress:", onboardingProgress);

      // If onboarding is not completed, redirect to the current step
      if (onboardingProgress && !onboardingProgress.completed) {
        // Map the current step to the appropriate route
        const stepRoutes: Record<string, string> = {
          "data-sources": "/onboarding/data-sources",
          repositories: "/onboarding/repositories",
          team: "/onboarding/team",
          review: "/onboarding/review",
        };

        const redirectUrl = stepRoutes[onboardingProgress.currentStep] || "/onboarding/data-sources";
        console.log("Index loader - redirecting to onboarding:", redirectUrl);
        throw redirect(redirectUrl);
      } else {
        console.log("Index loader - onboarding complete or not found, going to dashboard");
      }
    } else {
      console.log("Index loader - non-admin user, going to dashboard");
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
