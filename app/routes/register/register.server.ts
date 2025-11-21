import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { createUserSession, register } from "~/auth/auth.server";
import { db } from "~/db.server";

export async function registerAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");
  const email = formData.get("email");
  const password = formData.get("password");
  const terms = formData.get("terms");

  const errors: ActionErrors = {};

  if (typeof firstName !== "string" || firstName.length === 0) {
    errors.firstName = "First name is required";
  }
  if (typeof lastName !== "string" || lastName.length === 0) {
    errors.lastName = "Last name is required";
  }
  if (typeof email !== "string" || email.length === 0) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Invalid email address";
  }
  if (typeof password !== "string" || password.length < 12) {
    errors.password = "Password must be at least 12 characters";
  }
  if (!terms) {
    errors.terms = "You must agree to the terms";
  }

  if (Object.keys(errors).length > 0) {
    return data({ errors }, { status: 400 });
  }

  const existingUser = await db.user.findUnique({
    where: { email: email as string },
  });

  if (existingUser) {
    return data({ errors: { email: "A user with this email already exists" } as ActionErrors }, { status: 400 });
  }

  const name = `${firstName} ${lastName}`;
  const user = await register({
    email: email as string,
    password: password as string,
    name,
  });

  return createUserSession({
    request,
    userId: user.id,
    redirectTo: "/onboarding/datasources",
  });
}

interface ActionErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  terms?: string;
}
