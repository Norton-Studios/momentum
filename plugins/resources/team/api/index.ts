import { prisma } from "@mmtm/database";
import { Router, type Response } from "express";
import type { AuthenticatedRequest } from "../../../../apps/api/src/middleware/auth";

const router = Router();

// Create
router.post("/team", async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body;
  const tenantId = req.user.tenantId;

  const team = await prisma.team.create({
    data: { name, tenantId },
  });
  res.json(team);
});

// Read (all)
router.get("/teams", async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user.tenantId;

  const teams = await prisma.team.findMany({
    where: { tenantId },
    include: { repositories: true },
  });
  res.json(teams);
});

// Read (one)
router.get("/team/:id", async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  const team = await prisma.team.findFirst({
    where: {
      id: Number(id),
      tenantId,
    },
    include: { repositories: true },
  });

  if (!team) {
    return res.status(404).json({ error: "Team not found" });
  }

  res.json(team);
});

// Update
router.put("/team/:id", async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  const tenantId = req.user.tenantId;

  const team = await prisma.team.updateMany({
    where: {
      id: Number(id),
      tenantId,
    },
    data: { name },
  });

  if (team.count === 0) {
    return res.status(404).json({ error: "Team not found" });
  }

  const updatedTeam = await prisma.team.findFirst({
    where: { id: Number(id), tenantId },
  });

  res.json(updatedTeam);
});

// Delete
router.delete("/team/:id", async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  // Verify team belongs to tenant before deleting
  const team = await prisma.team.findFirst({
    where: { id: Number(id), tenantId },
  });

  if (!team) {
    return res.status(404).json({ error: "Team not found" });
  }

  await prisma.teamRepository.deleteMany({
    where: { teamId: Number(id) },
  });
  await prisma.team.delete({
    where: { id: Number(id) },
  });
  res.json({ message: "Team deleted" });
});

// Add repository to team
router.post("/team/:teamId/repository/:repositoryId", async (req: AuthenticatedRequest, res: Response) => {
  const { teamId, repositoryId } = req.params;
  const teamRepository = await prisma.teamRepository.create({
    data: {
      teamId: Number(teamId),
      repositoryId: Number(repositoryId),
    },
  });
  res.json(teamRepository);
});

// Remove repository from team
router.delete("/team/:teamId/repository/:repositoryId", async (req: AuthenticatedRequest, res: Response) => {
  const { teamId, repositoryId } = req.params;
  await prisma.teamRepository.delete({
    where: {
      teamId_repositoryId: {
        teamId: Number(teamId),
        repositoryId: Number(repositoryId),
      },
    },
  });
  res.json({ message: "Repository removed from team" });
});

export default router;
