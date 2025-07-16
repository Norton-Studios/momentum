import { prisma } from "@mmtm/database";
import { Router, type Response } from "express";
import type { AuthenticatedRequest } from "../../../../apps/api/src/middleware/auth";

const router = Router();

// POST /build - Create a new build
router.post("/build", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const build = await prisma.build.create({
      data: {
        ...req.body,
        tenantId,
      },
    });

    res.status(201).json(build);
  } catch (_error) {
    res.status(500).json({ error: "Failed to create build" });
  }
});

// GET /builds - Get all builds
router.get("/builds", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const builds = await prisma.build.findMany({
      where: { tenantId },
      include: {
        pipeline: true,
        commit: true,
        steps: true,
      },
    });

    res.json(builds);
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch builds" });
  }
});

// GET /build/:id - Get a specific build
router.get("/build/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const build = await prisma.build.findUnique({
      where: {
        id: Number(req.params.id),
        tenantId,
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
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch build" });
  }
});

// PUT /build/:id - Update a build
router.put("/build/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const build = await prisma.build.update({
      where: {
        id: Number(req.params.id),
        tenantId,
      },
      data: req.body,
    });

    res.json(build);
  } catch (_error) {
    res.status(500).json({ error: "Failed to update build" });
  }
});

// DELETE /build/:id - Delete a build
router.delete("/build/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    await prisma.build.delete({
      where: {
        id: Number(req.params.id),
        tenantId,
      },
    });

    res.status(204).send();
  } catch (_error) {
    res.status(500).json({ error: "Failed to delete build" });
  }
});

export default router;
