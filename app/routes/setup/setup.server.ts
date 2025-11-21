import { type ActionFunctionArgs, data, redirect } from "react-router";
import { createUserSession, hashPassword } from "~/auth/auth.server";
import { db } from "~/db.server";

export async function setupAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const organizationName = formData.get("organizationName");
  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");
  const email = formData.get("email");
  const password = formData.get("password");

  const errors: Record<string, string> = {};

  if (typeof organizationName !== "string" || organizationName.length === 0) {
    errors.organizationName = "Organization name is required";
  }

  if (typeof firstName !== "string" || firstName.length === 0) {
    errors.firstName = "First name is required";
  }

  if (typeof lastName !== "string" || lastName.length === 0) {
    errors.lastName = "Last name is required";
  }

  if (typeof email !== "string" || !email.includes("@")) {
    errors.email = "Valid email is required";
  }

  if (typeof password !== "string" || password.length < 12) {
    errors.password = "Password must be at least 12 characters";
  }

  if (Object.keys(errors).length > 0) {
    return data({ errors }, { status: 400 });
  }

  const adminExists = await db.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (adminExists) {
    throw redirect("/");
  }

  await db.organization.create({
    data: {
      name: organizationName as string,
      displayName: organizationName as string,
    },
  });

  const hashedPassword = await hashPassword(password as string);
  const fullName = `${firstName} ${lastName}`;

  const user = await db.user.create({
    data: {
      email: email as string,
      password: hashedPassword,
      name: fullName,
      role: "ADMIN",
    },
  });

  return createUserSession({
    request,
    userId: user.id,
    redirectTo: "/",
  });
}
