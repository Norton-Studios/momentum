import { prisma } from "@mmtm/database";
import { Router, type Response } from "express";
import type { AuthenticatedRequest } from "../../../../apps/api/src/middleware/auth";

const router = Router();

// POST /merge-request - Create a new merge request
router.post("/merge-request", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const mergeRequest = await prisma.mergeRequest.create({
      data: {
        ...req.body,
        tenantId,
      },
    });

    res.status(201).json(mergeRequest);
  } catch (_error) {
    res.status(500).json({ error: "Failed to create merge request" });
  }
});

// GET /merge-requests - Get all merge requests
router.get("/merge-requests", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    // Parse pagination parameters
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // Use select instead of include to avoid N+1 queries
    const mergeRequests = await prisma.mergeRequest.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        state: true,
        sourceBranch: true,
        targetBranch: true,
        createdAt: true,
        updatedAt: true,
        repository: {
          select: {
            id: true,
            name: true,
            owner: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            commits: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    // Get total count for pagination metadata
    const totalCount = await prisma.mergeRequest.count({
      where: { tenantId },
    });

    res.json({
      data: mergeRequests,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
    });
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch merge requests" });
  }
});

// GET /merge-request/:id - Get a specific merge request
router.get("/merge-request/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const mergeRequest = await prisma.mergeRequest.findUnique({
      where: {
        id: Number(req.params.id),
        tenantId,
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
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch merge request" });
  }
});

// PUT /merge-request/:id - Update a merge request
router.put("/merge-request/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const mergeRequest = await prisma.mergeRequest.update({
      where: {
        id: Number(req.params.id),
        tenantId,
      },
      data: req.body,
    });

    res.json(mergeRequest);
  } catch (_error) {
    res.status(500).json({ error: "Failed to update merge request" });
  }
});

// DELETE /merge-request/:id - Delete a merge request
router.delete("/merge-request/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    await prisma.mergeRequest.delete({
      where: {
        id: Number(req.params.id),
        tenantId,
      },
    });

    res.status(204).send();
  } catch (_error) {
    res.status(500).json({ error: "Failed to delete merge request" });
  }
});

export default router;
