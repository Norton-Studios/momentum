import { Router } from 'express';
import fg from 'fast-glob';
import path from 'path';

export async function loadRoutes(): Promise<Router[]> {
  const router = Router();
  const patterns = [
    '../metrics/*/api/index.ts',
    '../data-sources/*/api/index.ts',
    '../reports/*/api/index.ts',
  ];

  const routePaths = await fg(patterns, {
    absolute: true,
    cwd: __dirname,
  });

  const routes: Router[] = [];

  for (const routePath of routePaths) {
    try {
      const module = await import(routePath);
      if (module.default && typeof module.default === 'function') {
        routes.push(module.default);
        console.log(`Loaded routes from: ${path.relative(process.cwd(), routePath)}`);
      }
    } catch (error) {
      console.error(`Error loading routes from ${routePath}:`, error);
    }
  }

  return routes;
}
