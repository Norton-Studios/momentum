import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("brochure", "routes/brochure/home.tsx"),
  route("setup", "routes/setup/setup.tsx"),
  route("login", "routes/login/login.tsx"),
  route("onboarding/datasources", "routes/onboarding/datasources/datasources.tsx"),
  route("onboarding/repositories", "routes/onboarding/repositories/repositories.tsx"),
  route("onboarding/importing", "routes/onboarding/importing/importing.tsx"),
  route("onboarding/complete", "routes/onboarding/complete/complete.tsx"),
  route("dashboard", "routes/dashboard/dashboard.tsx"),
] satisfies RouteConfig;
