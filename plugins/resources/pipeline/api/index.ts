import { prisma } from "@mmtm/database";
import { Router } from "express";

const router = Router();

function getTenantId(req: any): string {
  return req.user?.tenantId;
}

// POST /pipeline - Create a new pipeline
router.post("/pipeline", async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const pipeline = await prisma.pipeline.create({
      data: {
        ...req.body,
        tenantId,
      },
    });

    res.status(201).json(pipeline);
  } catch (error) {
    res.status(500).json({ error: "Failed to create pipeline" });
  }
});

// GET /pipelines - Get all pipelines
router.get("/pipelines", async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const pipelines = await prisma.pipeline.findMany({
      where: { tenantId },
      include: {
        repository: true,
        mergeRequest: true,
        builds: true,
      },
    });

    res.json(pipelines);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pipelines" });
  }
});

// GET /pipeline/:id - Get a specific pipeline
router.get("/pipeline/:id", async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const pipeline = await prisma.pipeline.findUnique({
      where: { 
        id: Number(req.params.id),
        tenantId 
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
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pipeline" });
  }
});

// PUT /pipeline/:id - Update a pipeline
router.put("/pipeline/:id", async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const pipeline = await prisma.pipeline.update({
      where: { 
        id: Number(req.params.id),
        tenantId 
      },
      data: req.body,
    });

    res.json(pipeline);
  } catch (error) {
    res.status(500).json({ error: "Failed to update pipeline" });
  }
});

// DELETE /pipeline/:id - Delete a pipeline
router.delete("/pipeline/:id", async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await prisma.pipeline.delete({
      where: { 
        id: Number(req.params.id),
        tenantId 
      },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete pipeline" });
  }
});

export default router;