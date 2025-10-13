import express from "express";
import { loadRoutes } from "./lib/dynamic-routes";
import { prisma } from "@mmtm/database";
import { createAuthMiddleware } from "./middleware/auth";

const PORT = process.env.PORT || 3001;

async function createApp() {
  const app = express();
  app.use(express.json());

  // Make database available to routes
  app.set("db", prisma);

  // Load dynamic routes
  const dynamicRoutes = await loadRoutes();

  // Apply authentication middleware (it will skip /tenant POST and /)
  const authMiddleware = createAuthMiddleware(prisma);
  app.use(authMiddleware);

  // Register health check route
  app.get("/", async (_req, res) => {
    res.json({ message: "API is up" });
  });

  // Register all dynamic routes
  for (const router of dynamicRoutes) {
    app.use("/", router);
  }

  return app;
}

const viteNodeApp = await createApp();

if (import.meta.hot) {
  import.meta.hot.accept(async (mod) => {
    console.log("HMR update detected. Re-loading API routes...");
    if (mod) {
      mod.viteNodeApp = await createApp();
    }
  });
}

viteNodeApp.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});

export { viteNodeApp };
