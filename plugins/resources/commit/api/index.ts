import { Router } from "express";
import { prisma } from "@developer-productivity/database";

const router = Router();

// Create a new commit
router.post("/commits", async (req, res) => {
  const commit = await prisma.commit.create({
    data: req.body,
  });
  res.status(201).json(commit);
});

// Get all commits
router.get("/commits", async (req, res) => {
  const commits = await prisma.commit.findMany({
    include: {
      repository: true,
    },
  });
  res.json(commits);
});

// Get commits by repository
router.get("/repositories/:repositoryId/commits", async (req, res) => {
  const { repositoryId } = req.params;
  const commits = await prisma.commit.findMany({
    where: {
      repositoryId,
    },
    orderBy: {
      authorDate: "desc",
    },
  });
  res.json(commits);
});

// Get a specific commit
router.get("/commits/:id", async (req, res) => {
  const { id } = req.params;
  const commit = await prisma.commit.findUnique({
    where: { id },
    include: {
      repository: true,
    },
  });

  if (!commit) {
    return res.status(404).json({ error: "Commit not found" });
  }

  res.json(commit);
});

// Get a commit by SHA
router.get("/commits/sha/:sha", async (req, res) => {
  const { sha } = req.params;
  const commit = await prisma.commit.findUnique({
    where: { sha },
    include: {
      repository: true,
    },
  });

  if (!commit) {
    return res.status(404).json({ error: "Commit not found" });
  }

  res.json(commit);
});

// Update a commit
router.put("/commits/:id", async (req, res) => {
  const { id } = req.params;
  const commit = await prisma.commit.update({
    where: { id },
    data: req.body,
  });
  res.json(commit);
});

// Delete a commit
router.delete("/commits/:id", async (req, res) => {
  const { id } = req.params;
  await prisma.commit.delete({
    where: { id },
  });
  res.status(204).send();
});

// Get commit statistics for a repository
router.get("/repositories/:repositoryId/commits/stats", async (req, res) => {
  const { repositoryId } = req.params;

  const stats = await prisma.commit.aggregate({
    where: { repositoryId },
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
});

export default router;
