import type { Router } from "express";

export async function loadRoutes(): Promise<Router[]> {
  const modules = import.meta.glob(
    "../../../../plugins/{resources,data-sources,reports}/*/api/index.ts",
  );

  const routes: Router[] = [];
  for (const path in modules) {
    try {
      const module = (await modules[path]()) as { default: Router };
      if (module.default && typeof module.default === "function") {
        routes.push(module.default);
        console.log(`Loaded routes from: ${path}`);
      }
    } catch (error) {
      console.error(`Error loading routes from ${path}:`, error);
    }
  }

  return routes;
}
