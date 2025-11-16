import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("register", "routes/register.tsx"),
  route("onboarding/datasources", "routes/onboarding.datasources.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
] satisfies RouteConfig;
