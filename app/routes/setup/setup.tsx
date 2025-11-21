import { type ActionFunctionArgs, Form, redirect, useActionData } from "react-router";
import { Button } from "../../components/button/button";
import { Logo } from "../../components/logo/logo";
import { setupAction } from "./setup.server";
import "./setup.css";
import { db } from "~/db.server";

export function meta() {
  return [
    { title: "Welcome - Momentum Setup" },
    {
      name: "description",
      content: "Set up your Momentum instance",
    },
  ];
}

export async function loader() {
  const adminUser = await db.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (adminUser) {
    throw redirect("/");
  }

  return {};
}

export async function action(args: ActionFunctionArgs) {
  return setupAction(args);
}

export default function Setup() {
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;

  return (
    <div className="setup-container">
      <div className="setup-card">
        <Logo className="setup-logo" />
        <div className="setup-header">
          <h1>Welcome to Momentum</h1>
          <p>Let's set up your instance by creating an administrator account</p>
        </div>

        <Form method="post">
          <div className="form-group">
            <label htmlFor="organizationName">Organization Name</label>
            <input type="text" id="organizationName" name="organizationName" placeholder="Acme Inc" required />
            {errors?.organizationName && <p className="form-error">{errors.organizationName}</p>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input type="text" id="firstName" name="firstName" placeholder="John" required />
              {errors?.firstName && <p className="form-error">{errors.firstName}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input type="text" id="lastName" name="lastName" placeholder="Smith" required />
              {errors?.lastName && <p className="form-error">{errors.lastName}</p>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" name="email" placeholder="admin@acme.com" required />
            {errors?.email && <p className="form-error">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" placeholder="Minimum 12 characters" minLength={12} required />
            <p className="form-help">Use a strong password with letters, numbers, and symbols</p>
            {errors?.password && <p className="form-error">{errors.password}</p>}
          </div>

          <Button type="submit" className="btn-full-width">
            Create Admin Account
          </Button>
        </Form>
      </div>
    </div>
  );
}
