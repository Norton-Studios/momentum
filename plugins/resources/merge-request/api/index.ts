import { prisma } from "@mmtm/database";
import { Router } from "express";

const router = Router();

function getTenantId(req: any): string {
  return req.user?.tenantId;
}

// POST /merge-request - Create a new merge request
router.post("/merge-request", async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const mergeRequest = await prisma.mergeRequest.create({
      data: {
        ...req.body,
        tenantId,
      },
    });

    res.status(201).json(mergeRequest);
  } catch (error) {
    res.status(500).json({ error: "Failed to create merge request" });
  }
});

// GET /merge-requests - Get all merge requests
router.get("/merge-requests", async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const mergeRequests = await prisma.mergeRequest.findMany({
      where: { tenantId },
      include: {
        repository: true,
        author: true,
        assignee: true,
        commits: true,
      },
    });

    res.json(mergeRequests);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch merge requests" });
  }
});

// GET /merge-request/:id - Get a specific merge request
router.get("/merge-request/:id", async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const mergeRequest = await prisma.mergeRequest.findUnique({
      where: { 
        id: Number(req.params.id),
        tenantId 
      },
      include: {
        repository: true,
        author: true,
        assignee: true,
        commits: true,
      },
    });

    if (!mergeRequest) {
      return res.status(404).json({ error: "Merge request not found" });
    }

    res.json(mergeRequest);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch merge request" });
  }
});

// PUT /merge-request/:id - Update a merge request
router.put("/merge-request/:id", async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const mergeRequest = await prisma.mergeRequest.update({
      where: { 
        id: Number(req.params.id),
        tenantId 
      },
      data: req.body,
    });

    res.json(mergeRequest);
  } catch (error) {
    res.status(500).json({ error: "Failed to update merge request" });
  }
});

// DELETE /merge-request/:id - Delete a merge request
router.delete("/merge-request/:id", async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await prisma.mergeRequest.delete({
      where: { 
        id: Number(req.params.id),
        tenantId 
      },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete merge request" });
  }
});

export default router;