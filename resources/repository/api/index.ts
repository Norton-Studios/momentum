import { PrismaClient } from '@prisma/client';
import { Router } from 'express';

const prisma = new PrismaClient();
const router = Router();

// Create
router.post('/repository', async (req, res) => {
  const { name, url, externalId } = req.body;
  const repository = await prisma.repository.create({
    data: { name, url, externalId },
  });
  res.json(repository);
});

// Read (all)
router.get('/repository', async (req, res) => {
  const repositories = await prisma.repository.findMany();
  res.json(repositories);
});

// Read (one)
router.get('/repository/:id', async (req, res) => {
  const { id } = req.params;
  const repository = await prisma.repository.findUnique({
    where: { id: Number(id) },
  });
  res.json(repository);
});

// Update
router.put('/repository/:id', async (req, res) => {
  const { id } = req.params;
  const { name, url, externalId } = req.body;
  const repository = await prisma.repository.update({
    where: { id: Number(id) },
    data: { name, url, externalId },
  });
  res.json(repository);
});

// Delete
router.delete('/repository/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.repository.delete({
    where: { id: Number(id) },
  });
  res.json({ message: 'Repository deleted' });
});

export default router;
