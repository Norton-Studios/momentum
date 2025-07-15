import { prisma } from "@mmtm/database";
import { Router } from "express";

const router = Router();

function getTenantId(req: any): string {
  return req.user?.tenantId;
}

// POST /build - Create a new build
router.post("/build", async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const build = await prisma.build.create({
      data: {
        ...req.body,
        tenantId,
      },
    });

    res.status(201).json(build);
  } catch (error) {
    res.status(500).json({ error: "Failed to create build" });
  }
});

// GET /builds - Get all builds
router.get("/builds", async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const builds = await prisma.build.findMany({
      where: { tenantId },
      include: {
        pipeline: true,
        commit: true,
        steps: true,
      },
    });

    res.json(builds);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch builds" });
  }
});

// GET /build/:id - Get a specific build
router.get("/build/:id", async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const build = await prisma.build.findUnique({
      where: { 
        id: Number(req.params.id),
        tenantId 
      },
      include: {
        pipeline: true,
        commit: true,
        steps: true,
      },
    });

    if (!build) {
      return res.status(404).json({ error: "Build not found" });
    }

    res.json(build);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch build" });
  }
});

// PUT /build/:id - Update a build
router.put("/build/:id", async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const build = await prisma.build.update({
      where: { 
        id: Number(req.params.id),
        tenantId 
      },
      data: req.body,
    });

    res.json(build);
  } catch (error) {
    res.status(500).json({ error: "Failed to update build" });
  }
});

// DELETE /build/:id - Delete a build
router.delete("/build/:id", async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await prisma.build.delete({
      where: { 
        id: Number(req.params.id),
        tenantId 
      },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete build" });
  }
});

export default router;