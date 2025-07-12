import { Router } from 'express';
import { prisma } from '@developer-productivity/database';

const router = Router();

// Create a new contributor
router.post('/contributors', async (req, res) => {
  const contributor = await prisma.contributor.create({
    data: req.body,
  });
  res.status(201).json(contributor);
});

// Get all contributors
router.get('/contributors', async (req, res) => {
  const { includeTeams, includeCommits } = req.query;
  
  const contributors = await prisma.contributor.findMany({
    include: {
      teams: includeTeams === 'true' ? {
        include: {
          team: true,
        },
      } : false,
      commits: includeCommits === 'true' ? {
        take: 10, // Limit to recent commits
        orderBy: {
          authorDate: 'desc',
        },
      } : false,
    },
    orderBy: {
      name: 'asc',
    },
  });
  res.json(contributors);
});

// Get contributors by team
router.get('/teams/:teamId/contributors', async (req, res) => {
  const { teamId } = req.params;
  const { includeInactive } = req.query;
  
  const teamContributors = await prisma.teamContributor.findMany({
    where: {
      teamId,
      isActive: includeInactive === 'true' ? undefined : true,
    },
    include: {
      contributor: true,
    },
    orderBy: {
      joinedAt: 'desc',
    },
  });
  
  res.json(teamContributors);
});

// Get a specific contributor
router.get('/contributors/:id', async (req, res) => {
  const { id } = req.params;
  const { includeTeams, includeCommits } = req.query;
  
  const contributor = await prisma.contributor.findUnique({
    where: { id },
    include: {
      teams: includeTeams === 'true' ? {
        include: {
          team: true,
        },
      } : false,
      commits: includeCommits === 'true' ? {
        take: 20,
        orderBy: {
          authorDate: 'desc',
        },
      } : false,
    },
  });
  
  if (!contributor) {
    return res.status(404).json({ error: 'Contributor not found' });
  }
  
  res.json(contributor);
});

// Get a contributor by email
router.get('/contributors/email/:email', async (req, res) => {
  const { email } = req.params;
  
  const contributor = await prisma.contributor.findUnique({
    where: { email },
    include: {
      teams: {
        include: {
          team: true,
        },
      },
    },
  });
  
  if (!contributor) {
    return res.status(404).json({ error: 'Contributor not found' });
  }
  
  res.json(contributor);
});

// Get a contributor by username
router.get('/contributors/username/:username', async (req, res) => {
  const { username } = req.params;
  
  const contributor = await prisma.contributor.findUnique({
    where: { username },
    include: {
      teams: {
        include: {
          team: true,
        },
      },
    },
  });
  
  if (!contributor) {
    return res.status(404).json({ error: 'Contributor not found' });
  }
  
  res.json(contributor);
});

// Update a contributor
router.put('/contributors/:id', async (req, res) => {
  const { id } = req.params;
  const contributor = await prisma.contributor.update({
    where: { id },
    data: req.body,
  });
  res.json(contributor);
});

// Delete a contributor (soft delete by setting isActive to false)
router.delete('/contributors/:id', async (req, res) => {
  const { id } = req.params;
  const { hard } = req.query;
  
  if (hard === 'true') {
    // Hard delete - remove from database
    await prisma.contributor.delete({
      where: { id },
    });
  } else {
    // Soft delete - set isActive to false
    await prisma.contributor.update({
      where: { id },
      data: { isActive: false },
    });
  }
  
  res.status(204).send();
});

// Add contributor to team
router.post('/teams/:teamId/contributors', async (req, res) => {
  const { teamId } = req.params;
  const { contributorId, role } = req.body;
  
  const teamContributor = await prisma.teamContributor.create({
    data: {
      teamId,
      contributorId,
      role,
    },
    include: {
      contributor: true,
      team: true,
    },
  });
  
  res.status(201).json(teamContributor);
});

// Remove contributor from team
router.delete('/teams/:teamId/contributors/:contributorId', async (req, res) => {
  const { teamId, contributorId } = req.params;
  const { hard } = req.query;
  
  if (hard === 'true') {
    // Hard delete - remove association
    await prisma.teamContributor.deleteMany({
      where: {
        teamId,
        contributorId,
      },
    });
  } else {
    // Soft delete - set leftAt and isActive
    await prisma.teamContributor.updateMany({
      where: {
        teamId,
        contributorId,
        isActive: true,
      },
      data: {
        leftAt: new Date(),
        isActive: false,
      },
    });
  }
  
  res.status(204).send();
});

// Get contributor statistics
router.get('/contributors/:id/stats', async (req, res) => {
  const { id } = req.params;
  
  // Check if contributor exists
  const contributor = await prisma.contributor.findUnique({
    where: { id },
  });
  
  if (!contributor) {
    return res.status(404).json({ error: 'Contributor not found' });
  }
  
  const stats = await prisma.commit.aggregate({
    where: { 
      contributor: {
        id,
      },
    },
    _count: true,
    _sum: {
      additions: true,
      deletions: true,
      changedFiles: true,
    },
  });
  
  const teamCount = await prisma.teamContributor.count({
    where: {
      contributorId: id,
      isActive: true,
    },
  });
  
  res.json({
    totalCommits: stats._count,
    totalAdditions: stats._sum.additions || 0,
    totalDeletions: stats._sum.deletions || 0,
    totalChangedFiles: stats._sum.changedFiles || 0,
    activeTeams: teamCount,
  });
});

export default router;