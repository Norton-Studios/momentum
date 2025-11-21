import type { ActionFunctionArgs } from "react-router";
import { Form, Link, useActionData } from "react-router";
import { Button } from "../../components/button/button";
import { Logo } from "../../components/logo/logo";
import { loginAction } from "./login.server";
import "./login.css";

export function meta() {
  return [
    { title: "Sign In - Momentum" },
    {
      name: "description",
      content: "Sign in to your Momentum account",
    },
  ];
}

export async function action(args: ActionFunctionArgs) {
  return loginAction(args);
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;

  return (
    <div className="login-container">
      <div className="login-card">
        <Logo className="login-logo" linkTo="/" />

        <div className="form-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your account</p>
        </div>

        {errors?.form && <div className="form-error-banner">{errors.form}</div>}

        <Form method="post">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" name="email" placeholder="john.smith@company.com" />
            {errors?.email && <p className="form-error">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" placeholder="Enter your password" />
            {errors?.password && <p className="form-error">{errors.password}</p>}
          </div>

          <Button type="submit" className="btn-full-width">
            Sign In
          </Button>
        </Form>

        <div className="form-footer">
          Don't have an account? <Link to="/register">Create Account</Link>
        </div>
      </div>
    </div>
  );
}
