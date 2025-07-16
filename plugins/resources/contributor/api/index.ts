import { Router, type Response } from "express";
import { prisma } from "@mmtm/database";
import type { AuthenticatedRequest } from "../../../../apps/api/src/middleware/auth";

const router = Router();

// Create a new contributor
router.post("/contributor", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const contributor = await prisma.contributor.create({
      data: {
        ...req.body,
        tenantId,
      },
    });

    res.status(201).json(contributor);
  } catch (_error) {
    res.status(500).json({ error: "Failed to create contributor" });
  }
});

// Get all contributors
router.get("/contributors", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { includeTeams, includeCommits, isActive } = req.query;

    // Parse pagination parameters
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { tenantId };
    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    // Use select instead of include to avoid N+1 queries
    const contributors = await prisma.contributor.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        teams:
          includeTeams === "true"
            ? {
                select: {
                  id: true,
                  role: true,
                  isActive: true,
                  joinedAt: true,
                  team: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
                where: { isActive: true },
              }
            : false,
        _count:
          includeCommits === "true"
            ? {
                select: {
                  commits: true,
                },
              }
            : false,
      },
      orderBy: {
        name: "asc",
      },
      skip,
      take: limit,
    });

    // Get total count for pagination metadata
    const totalCount = await prisma.contributor.count({
      where,
    });

    res.json({
      data: contributors,
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
    res.status(500).json({ error: "Failed to fetch contributors" });
  }
});

// Get contributors by team
router.get("/teams/:teamId/contributors", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { teamId } = req.params;
    const { includeInactive } = req.query;

    const teamContributors = await prisma.teamContributor.findMany({
      where: {
        teamId,
        team: { tenantId }, // Ensure team belongs to tenant
        isActive: includeInactive === "true" ? undefined : true,
      },
      include: {
        contributor: true,
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    res.json(teamContributors);
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch team contributors" });
  }
});

// Get a specific contributor
router.get("/contributors/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { includeTeams, includeCommits } = req.query;

    const contributor = await prisma.contributor.findUnique({
      where: {
        id,
        tenantId,
      },
      include: {
        teams:
          includeTeams === "true"
            ? {
                include: {
                  team: true,
                },
              }
            : false,
        commits:
          includeCommits === "true"
            ? {
                take: 20,
                orderBy: {
                  authorDate: "desc",
                },
              }
            : false,
      },
    });

    if (!contributor) {
      return res.status(404).json({ error: "Contributor not found" });
    }

    res.json(contributor);
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch contributor" });
  }
});

// Get a contributor by email
router.get("/contributors/email/:email", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { email } = req.params;

    const contributor = await prisma.contributor.findUnique({
      where: {
        email,
        tenantId,
      },
      include: {
        teams: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!contributor) {
      return res.status(404).json({ error: "Contributor not found" });
    }

    res.json(contributor);
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch contributor" });
  }
});

// Get a contributor by username
router.get("/contributors/username/:username", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { username } = req.params;

    const contributor = await prisma.contributor.findUnique({
      where: {
        username,
        tenantId,
      },
      include: {
        teams: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!contributor) {
      return res.status(404).json({ error: "Contributor not found" });
    }

    res.json(contributor);
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch contributor" });
  }
});

// Update a contributor
router.put("/contributors/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const contributor = await prisma.contributor.update({
      where: {
        id,
        tenantId,
      },
      data: req.body,
    });

    res.json(contributor);
  } catch (_error) {
    res.status(500).json({ error: "Failed to update contributor" });
  }
});

// Delete a contributor (soft delete by setting isActive to false)
router.delete("/contributors/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { hard } = req.query;

    if (hard === "true") {
      // Hard delete - remove from database
      await prisma.contributor.delete({
        where: {
          id,
          tenantId,
        },
      });
    } else {
      // Soft delete - set isActive to false
      await prisma.contributor.update({
        where: {
          id,
          tenantId,
        },
        data: { isActive: false },
      });
    }

    res.status(204).send();
  } catch (_error) {
    res.status(500).json({ error: "Failed to delete contributor" });
  }
});

// Add contributor to team
router.post("/teams/:teamId/contributor", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { teamId } = req.params;
    const { contributorId, role } = req.body;

    // Verify team belongs to tenant
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
        tenantId,
      },
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Verify contributor belongs to tenant
    const contributor = await prisma.contributor.findUnique({
      where: {
        id: contributorId,
        tenantId,
      },
    });

    if (!contributor) {
      return res.status(404).json({ error: "Contributor not found" });
    }

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
  } catch (_error) {
    res.status(500).json({ error: "Failed to add contributor to team" });
  }
});

// Remove contributor from team
router.delete("/teams/:teamId/contributors/:contributorId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { teamId, contributorId } = req.params;
    const { hard } = req.query;

    // Verify team belongs to tenant
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
        tenantId,
      },
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    if (hard === "true") {
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
  } catch (_error) {
    res.status(500).json({ error: "Failed to remove contributor from team" });
  }
});

// Get contributor statistics
router.get("/contributors/:id/stats", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    // Check if contributor exists and belongs to tenant
    const contributor = await prisma.contributor.findUnique({
      where: {
        id,
        tenantId,
      },
    });

    if (!contributor) {
      return res.status(404).json({ error: "Contributor not found" });
    }

    const stats = await prisma.commit.aggregate({
      where: {
        contributor: {
          id,
        },
        tenantId,
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
        team: { tenantId }, // Ensure teams belong to tenant
      },
    });

    res.json({
      totalCommits: stats._count,
      totalAdditions: stats._sum.additions || 0,
      totalDeletions: stats._sum.deletions || 0,
      totalChangedFiles: stats._sum.changedFiles || 0,
      activeTeams: teamCount,
    });
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch contributor statistics" });
  }
});

export default router;
