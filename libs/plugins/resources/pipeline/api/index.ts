import { prisma } from "@mmtm/database";
import { Router, type Response } from "express";
import type { AuthenticatedRequest } from "../../../../apps/api/src/middleware/auth";

const router = Router();

// POST /pipeline - Create a new pipeline
router.post("/pipeline", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const pipeline = await prisma.pipeline.create({
      data: {
        ...req.body,
        tenantId,
      },
    });

    res.status(201).json(pipeline);
  } catch (_error) {
    res.status(500).json({ error: "Failed to create pipeline" });
  }
});

// GET /pipelines - Get all pipelines
router.get("/pipelines", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const pipelines = await prisma.pipeline.findMany({
      where: { tenantId },
      include: {
        repository: true,
        mergeRequest: true,
        builds: true,
      },
    });

    res.json(pipelines);
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch pipelines" });
  }
});

// GET /pipeline/:id - Get a specific pipeline
router.get("/pipeline/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const pipeline = await prisma.pipeline.findUnique({
      where: {
        id: Number(req.params.id),
        tenantId,
      },
      include: {
        repository: true,
        mergeRequest: true,
        builds: true,
      },
    });

    if (!pipeline) {
      return res.status(404).json({ error: "Pipeline not found" });
    }

    res.json(pipeline);
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch pipeline" });
  }
});

// PUT /pipeline/:id - Update a pipeline
router.put("/pipeline/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const pipeline = await prisma.pipeline.update({
      where: {
        id: Number(req.params.id),
        tenantId,
      },
      data: req.body,
    });

    res.json(pipeline);
  } catch (_error) {
    res.status(500).json({ error: "Failed to update pipeline" });
  }
});

// DELETE /pipeline/:id - Delete a pipeline
router.delete("/pipeline/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    await prisma.pipeline.delete({
      where: {
        id: Number(req.params.id),
        tenantId,
      },
    });

    res.status(204).send();
  } catch (_error) {
    res.status(500).json({ error: "Failed to delete pipeline" });
  }
});

export default router;
