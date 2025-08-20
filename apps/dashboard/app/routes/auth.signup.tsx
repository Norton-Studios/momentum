import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useNavigation, useNavigate } from "@remix-run/react";
import { useState, useCallback } from "react";
import { SignupForm, type SignupFormData } from "@mmtm/components";
import { validateOrganizationName, createUserAccount, createUserSession } from "@mmtm/resource-tenant";
import { prisma as db } from "@mmtm/database";
import { createUserSessionAndRedirect, getCurrentUser } from "~/utils/session.server";

export const meta: MetaFunction = () => {
  return [{ title: "Sign Up - Momentum" }, { name: "description", content: "Create your Momentum account" }];
};

export async function loader({ request }: { request: Request }) {
  // If user is already logged in, redirect to dashboard
  const user = await getCurrentUser(request);
  if (user) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/dashboard" },
    });
  }
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const action = formData.get("_action");

    if (action === "validate-organization") {
      const organizationName = formData.get("organizationName") as string;

      if (!organizationName) {
        return json({ error: "Organization name is required" }, { status: 400 });
      }

      const isAvailable = await validateOrganizationName(organizationName, db);
      return json({
        available: isAvailable,
        message: isAvailable ? "Organization name is available" : "Organization name already exists",
      });
    }

    if (action === "signup") {
      const data = {
        organizationName: formData.get("organizationName") as string,
        fullName: formData.get("fullName") as string,
        email: formData.get("email") as string,
        password: formData.get("password") as string,
      };

      // Validate required fields
      if (!data.organizationName || !data.fullName || !data.email || !data.password) {
        return json({ error: "All fields are required" }, { status: 400 });
      }

      // Check organization name availability
      const isAvailable = await validateOrganizationName(data.organizationName, db);
      if (!isAvailable) {
        return json({ error: "Organization name already exists" }, { status: 409 });
      }

      // Create the account
      const tenant = await createUserAccount(data, db);

      // Create user session
      const userSession = await createUserSession(tenant.users[0].id, { onboarding: true }, 30, db);

      // Redirect to dashboard with session
      return createUserSessionAndRedirect(userSession.sessionToken, "/dashboard");
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Signup error:", error);
    return json({ error: "Failed to create account" }, { status: 500 });
  }
}

export default function SignupPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const [organizationNameError, setOrganizationNameError] = useState<string>();

  const isSubmitting = navigation.state === "submitting";

  const handleOrganizationNameChange = useCallback(async (name: string) => {
    if (!name.trim()) {
      setOrganizationNameError(undefined);
      return;
    }

    // Debounce validation
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch("/auth/signup", {
          method: "POST",
          body: new FormData(
            Object.assign(document.createElement("form"), {
              _action: "validate-organization",
              organizationName: name,
            }) as any,
          ),
        });

        const result = await response.json();
        if (!result.available) {
          setOrganizationNameError(result.message);
        } else {
          setOrganizationNameError(undefined);
        }
      } catch (error) {
        console.error("Validation error:", error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, []);

  const handleSubmit = async (data: SignupFormData) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.style.display = "none";

    // Add form fields
    Object.entries(data).forEach(([key, value]) => {
      if (key === "confirmPassword") return; // Don't submit confirm password
      const input = document.createElement("input");
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    // Add action
    const actionInput = document.createElement("input");
    actionInput.name = "_action";
    actionInput.value = "signup";
    form.appendChild(actionInput);

    document.body.appendChild(form);
    form.submit();
  };

  const handleSignIn = () => {
    navigate("/auth/signin");
  };

  return (
    <SignupForm
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      error={actionData && "error" in actionData ? actionData.error : undefined}
      organizationNameError={organizationNameError}
      onOrganizationNameChange={handleOrganizationNameChange}
      onSignIn={handleSignIn}
    />
  );
}
