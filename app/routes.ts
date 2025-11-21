import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("brochure", "routes/brochure/home.tsx"),
  route("setup", "routes/setup/setup.tsx"),
  route("login", "routes/login/login.tsx"),
  route("onboarding/datasources", "routes/onboarding/datasources/datasources.tsx"),
  route("dashboard", "routes/dashboard/dashboard.tsx"),
] satisfies RouteConfig;
