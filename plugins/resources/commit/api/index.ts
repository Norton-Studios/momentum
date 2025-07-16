import { Router, type Response } from "express";
import { prisma } from "@mmtm/database";
import type { AuthenticatedRequest } from "../../../../apps/api/src/middleware/auth";

const router = Router();

// Create a new commit
router.post("/commit", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const commit = await prisma.commit.create({
      data: {
        ...req.body,
        tenantId,
      },
    });

    res.status(201).json(commit);
  } catch (error) {
    res.status(500).json({ error: "Failed to create commit" });
  }
});

// Get all commits
router.get("/commits", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const commits = await prisma.commit.findMany({
      where: { tenantId },
      include: {
        repository: true,
      },
    });

    res.json(commits);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch commits" });
  }
});

// Get commits by repository
router.get("/repositories/:repositoryId/commits", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { repositoryId } = req.params;

    const commits = await prisma.commit.findMany({
      where: {
        repositoryId,
        tenantId,
      },
      orderBy: {
        authorDate: "desc",
      },
    });

    res.json(commits);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch commits" });
  }
});

// Get a specific commit
router.get("/commits/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const commit = await prisma.commit.findUnique({
      where: {
        id,
        tenantId,
      },
      include: {
        repository: true,
      },
    });

    if (!commit) {
      return res.status(404).json({ error: "Commit not found" });
    }

    res.json(commit);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch commit" });
  }
});

// Get a commit by SHA
router.get("/commits/sha/:sha", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { sha } = req.params;

    const commit = await prisma.commit.findUnique({
      where: {
        sha,
        tenantId,
      },
      include: {
        repository: true,
      },
    });

    if (!commit) {
      return res.status(404).json({ error: "Commit not found" });
    }

    res.json(commit);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch commit" });
  }
});

// Update a commit
router.put("/commits/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const commit = await prisma.commit.update({
      where: {
        id,
        tenantId,
      },
      data: req.body,
    });

    res.json(commit);
  } catch (error) {
    res.status(500).json({ error: "Failed to update commit" });
  }
});

// Delete a commit
router.delete("/commits/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    await prisma.commit.delete({
      where: {
        id,
        tenantId,
      },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete commit" });
  }
});

// Get commit statistics for a repository
router.get("/repositories/:repositoryId/commits/stats", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { repositoryId } = req.params;

    const stats = await prisma.commit.aggregate({
      where: {
        repositoryId,
        tenantId,
      },
      _count: true,
      _sum: {
        additions: true,
        deletions: true,
        changedFiles: true,
      },
    });

    res.json({
      totalCommits: stats._count,
      totalAdditions: stats._sum.additions || 0,
      totalDeletions: stats._sum.deletions || 0,
      totalChangedFiles: stats._sum.changedFiles || 0,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch commit statistics" });
  }
});

export default router;
