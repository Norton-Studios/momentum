import express from "express";
import { loadRoutes } from "./lib/dynamicRoutes";
import { prisma } from "@developer-productivity/database";

const port = process.env.PORT || 3001;

async function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/", async (req, res) => {
    res.json({ message: "API is up" });
  });

  const dynamicRoutes = await loadRoutes();
  for (const router of dynamicRoutes) {
    app.use("/", router);
  }

  return app;
}

let viteNodeApp = await createApp();

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
