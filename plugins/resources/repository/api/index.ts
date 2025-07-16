import { prisma } from "@developer-productivity/database";
import { Router, type Response } from "express";
import type { AuthenticatedRequest } from "../../../../apps/api/src/middleware/auth";

const router = Router();

// Create
router.post("/repository", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { name, url, externalId } = req.body;

    const repository = await prisma.repository.create({
      data: { name, url, externalId, tenantId },
    });

    res.status(201).json(repository);
  } catch (error) {
    res.status(500).json({ error: "Failed to create repository" });
  }
});

// Read (all)
router.get("/repositories", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const repositories = await prisma.repository.findMany({
      where: { tenantId },
    });

    res.json(repositories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});

// Read (one)
router.get("/repository/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const repository = await prisma.repository.findUnique({
      where: {
        id: Number(id),
        tenantId,
      },
    });

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    res.json(repository);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch repository" });
  }
});

// Update
router.put("/repository/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { name, url, externalId } = req.body;

    const repository = await prisma.repository.update({
      where: {
        id: Number(id),
        tenantId,
      },
      data: { name, url, externalId },
    });

    res.json(repository);
  } catch (error) {
    res.status(500).json({ error: "Failed to update repository" });
  }
});

// Delete
router.delete("/repository/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    await prisma.repository.delete({
      where: {
        id: Number(id),
        tenantId,
      },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete repository" });
  }
});

export default router;
