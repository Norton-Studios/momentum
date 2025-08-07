import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useNavigation, useNavigate } from "@remix-run/react";
import { prisma as db } from "@mmtm/database";
import { createUserSession } from "@mmtm/resource-tenant";
import { createUserSessionAndRedirect, getCurrentUser } from "~/utils/session.server";
import { SignInForm, type SignInFormData } from "@mmtm/components";
import * as bcrypt from "bcrypt";

export const meta: MetaFunction = () => {
  return [{ title: "Sign In - Momentum" }, { name: "description", content: "Sign in to your Momentum account" }];
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
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/dashboard";

  // Validate required fields
  if (!email || !password) {
    return json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user || !user.password) {
      return json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Create user session
    const userSession = await createUserSession(user.id, { loginTime: new Date() }, 30, db);

    // Redirect with session
    return createUserSessionAndRedirect(userSession.sessionToken, redirectTo);
  } catch (error) {
    console.error("Sign-in error:", error);
    return json({ error: "Sign-in failed. Please try again." }, { status: 500 });
  }
}

export default function SignInPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();

  const isSubmitting = navigation.state === "submitting";

  const handleSubmit = async (data: SignInFormData) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.style.display = "none";

    // Add form fields
    Object.entries(data).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  const handleSignUp = () => {
    navigate("/auth/signup");
  };

  const handleForgotPassword = () => {
    navigate("/auth/forgot-password");
  };

  return (
    <SignInForm onSubmit={handleSubmit} isSubmitting={isSubmitting} error={actionData?.error} onSignUp={handleSignUp} onForgotPassword={handleForgotPassword} />
  );
}
