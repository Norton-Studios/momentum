import express from "express";
import { loadRoutes } from "./lib/dynamicRoutes";
import { prisma } from "@developer-productivity/database";
import { createAuthMiddleware } from "./middleware/auth";

const port = process.env.PORT || 3001;

async function createApp() {
  const app = express();
  app.use(express.json());

  // Make database available to routes
  app.set('db', prisma);

  // Load dynamic routes first (includes tenant routes with /tenant endpoint)
  const dynamicRoutes = await loadRoutes();
  
  // Apply authentication middleware (it will skip /tenant POST)
  const authMiddleware = createAuthMiddleware(prisma);
  app.use(authMiddleware);

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

viteNodeApp.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});

export { viteNodeApp };
