import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { createUserSession, login } from "~/auth/auth.server";

export async function loginAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  const errors: ActionErrors = {};

  if (typeof email !== "string" || email.length === 0) {
    errors.email = "Email is required";
  }
  if (typeof password !== "string" || password.length === 0) {
    errors.password = "Password is required";
  }

  if (Object.keys(errors).length > 0) {
    return data({ errors }, { status: 400 });
  }

  const user = await login({
    email: email as string,
    password: password as string,
  });

  if (!user) {
    return data({ errors: { form: "Invalid email or password" } as ActionErrors }, { status: 400 });
  }

  return createUserSession({
    request,
    userId: user.id,
    redirectTo: "/",
  });
}

interface ActionErrors {
  email?: string;
  password?: string;
  form?: string;
}
