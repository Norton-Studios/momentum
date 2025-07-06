import { PrismaClient } from '@prisma/client';
import { Router } from 'express';

const prisma = new PrismaClient();
const router = Router();

// Create
router.post('/team', async (req, res) => {
  const { name } = req.body;
  const team = await prisma.team.create({
    data: { name },
  });
  res.json(team);
});

// Read (all)
router.get('/team', async (req, res) => {
  const teams = await prisma.team.findMany({
    include: { repositories: true },
  });
  res.json(teams);
});

// Read (one)
router.get('/team/:id', async (req, res) => {
  const { id } = req.params;
  const team = await prisma.team.findUnique({
    where: { id: Number(id) },
    include: { repositories: true },
  });
  res.json(team);
});

// Update
router.put('/team/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const team = await prisma.team.update({
    where: { id: Number(id) },
    data: { name },
  });
  res.json(team);
});

// Delete
router.delete('/team/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.teamRepository.deleteMany({
    where: { teamId: Number(id) },
  });
  await prisma.team.delete({
    where: { id: Number(id) },
  });
  res.json({ message: 'Team deleted' });
});

// Add repository to team
router.post('/team/:teamId/repository/:repositoryId', async (req, res) => {
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
router.delete('/team/:teamId/repository/:repositoryId', async (req, res) => {
  const { teamId, repositoryId } = req.params;
  await prisma.teamRepository.delete({
    where: {
      teamId_repositoryId: {
        teamId: Number(teamId),
        repositoryId: Number(repositoryId),
      },
    },
  });
  res.json({ message: 'Repository removed from team' });
});

export default router;
