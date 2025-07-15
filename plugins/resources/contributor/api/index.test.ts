import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import router from './index';

vi.mock('@mmtm/database', () => {
  const mockPrisma = {
    contributor: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    teamContributor: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    commit: {
      aggregate: vi.fn(),
    },
  };

  return {
    prisma: mockPrisma,
  };
});

const app = express();
app.use(express.json());
app.use(router);

import { prisma } from '@mmtm/database';

describe('Contributor API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /contributors', () => {
    it('should create a new contributor', async () => {
      const mockContributor = {
        id: '1',
        externalId: 'ext-1',
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        avatarUrl: 'https://avatar.example.com/john.jpg',
        bio: 'Software Engineer',
        company: 'Example Corp',
        location: 'San Francisco',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.contributor.create).mockResolvedValue(mockContributor);

      const response = await request(app)
        .post('/contributors')
        .send({
          externalId: 'ext-1',
          name: 'John Doe',
          email: 'john@example.com',
          username: 'johndoe',
          avatarUrl: 'https://avatar.example.com/john.jpg',
          bio: 'Software Engineer',
          company: 'Example Corp',
          location: 'San Francisco',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(mockContributor.id);
      expect(response.body.name).toBe(mockContributor.name);
      expect(response.body.email).toBe(mockContributor.email);
      expect(prisma.contributor.create).toHaveBeenCalledOnce();
    });
  });

  describe('GET /contributors', () => {
    it('should return all contributors', async () => {
      const mockContributors = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      ];

      vi.mocked(prisma.contributor.findMany).mockResolvedValue(mockContributors as any);

      const response = await request(app).get('/contributors');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockContributors);
      expect(prisma.contributor.findMany).toHaveBeenCalledWith({
        include: {
          teams: false,
          commits: false,
        },
        orderBy: {
          name: 'asc',
        },
      });
    });

    it('should include teams when requested', async () => {
      const mockContributors = [
        { 
          id: '1', 
          name: 'John Doe', 
          email: 'john@example.com',
          teams: [{ team: { name: 'Team A' } }],
        },
      ];

      vi.mocked(prisma.contributor.findMany).mockResolvedValue(mockContributors as any);

      const response = await request(app).get('/contributors?includeTeams=true');

      expect(response.status).toBe(200);
      expect(prisma.contributor.findMany).toHaveBeenCalledWith({
        include: {
          teams: {
            include: { team: true },
          },
          commits: false,
        },
        orderBy: {
          name: 'asc',
        },
      });
    });
  });

  describe('GET /teams/:teamId/contributors', () => {
    it('should return contributors for a specific team', async () => {
      const mockTeamContributors = [
        {
          contributorId: '1',
          teamId: 'team-1',
          role: 'admin',
          contributor: { id: '1', name: 'John Doe', email: 'john@example.com' },
        },
      ];

      vi.mocked(prisma.teamContributor.findMany).mockResolvedValue(mockTeamContributors as any);

      const response = await request(app).get('/teams/team-1/contributors');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTeamContributors);
      expect(prisma.teamContributor.findMany).toHaveBeenCalledWith({
        where: {
          teamId: 'team-1',
          isActive: true,
        },
        include: {
          contributor: true,
        },
        orderBy: {
          joinedAt: 'desc',
        },
      });
    });
  });

  describe('GET /contributors/:id', () => {
    it('should return a specific contributor', async () => {
      const mockContributor = { id: '1', name: 'John Doe', email: 'john@example.com' };
      vi.mocked(prisma.contributor.findUnique).mockResolvedValue(mockContributor as any);

      const response = await request(app).get('/contributors/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockContributor);
      expect(prisma.contributor.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          teams: false,
          commits: false,
        },
      });
    });

    it('should return 404 if contributor not found', async () => {
      vi.mocked(prisma.contributor.findUnique).mockResolvedValue(null);

      const response = await request(app).get('/contributors/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Contributor not found' });
    });
  });

  describe('GET /contributors/email/:email', () => {
    it('should return a contributor by email', async () => {
      const mockContributor = { id: '1', name: 'John Doe', email: 'john@example.com' };
      vi.mocked(prisma.contributor.findUnique).mockResolvedValue(mockContributor as any);

      const response = await request(app).get('/contributors/email/john@example.com');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockContributor);
      expect(prisma.contributor.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        include: {
          teams: {
            include: { team: true },
          },
        },
      });
    });
  });

  describe('GET /contributors/username/:username', () => {
    it('should return a contributor by username', async () => {
      const mockContributor = { id: '1', name: 'John Doe', username: 'johndoe' };
      vi.mocked(prisma.contributor.findUnique).mockResolvedValue(mockContributor as any);

      const response = await request(app).get('/contributors/username/johndoe');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockContributor);
      expect(prisma.contributor.findUnique).toHaveBeenCalledWith({
        where: { username: 'johndoe' },
        include: {
          teams: {
            include: { team: true },
          },
        },
      });
    });
  });

  describe('PUT /contributors/:id', () => {
    it('should update a contributor', async () => {
      const updatedContributor = {
        id: '1',
        name: 'John Updated',
        email: 'john@example.com',
      };
      vi.mocked(prisma.contributor.update).mockResolvedValue(updatedContributor as any);

      const response = await request(app)
        .put('/contributors/1')
        .send({ name: 'John Updated' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedContributor);
      expect(prisma.contributor.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'John Updated' },
      });
    });
  });

  describe('DELETE /contributors/:id', () => {
    it('should soft delete a contributor by default', async () => {
      vi.mocked(prisma.contributor.update).mockResolvedValue({} as any);

      const response = await request(app).delete('/contributors/1');

      expect(response.status).toBe(204);
      expect(prisma.contributor.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
    });

    it('should hard delete when hard=true', async () => {
      vi.mocked(prisma.contributor.delete).mockResolvedValue({} as any);

      const response = await request(app).delete('/contributors/1?hard=true');

      expect(response.status).toBe(204);
      expect(prisma.contributor.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });

  describe('POST /teams/:teamId/contributors', () => {
    it('should add contributor to team', async () => {
      const mockTeamContributor = {
        teamId: 'team-1',
        contributorId: 'contributor-1',
        role: 'member',
        contributor: { name: 'John Doe' },
        team: { name: 'Team A' },
      };

      vi.mocked(prisma.teamContributor.create).mockResolvedValue(mockTeamContributor as any);

      const response = await request(app)
        .post('/teams/team-1/contributors')
        .send({
          contributorId: 'contributor-1',
          role: 'member',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockTeamContributor);
      expect(prisma.teamContributor.create).toHaveBeenCalledWith({
        data: {
          teamId: 'team-1',
          contributorId: 'contributor-1',
          role: 'member',
        },
        include: {
          contributor: true,
          team: true,
        },
      });
    });
  });

  describe('DELETE /teams/:teamId/contributors/:contributorId', () => {
    it('should remove contributor from team (soft delete)', async () => {
      vi.mocked(prisma.teamContributor.updateMany).mockResolvedValue({ count: 1 } as any);

      const response = await request(app).delete('/teams/team-1/contributors/contributor-1');

      expect(response.status).toBe(204);
      expect(prisma.teamContributor.updateMany).toHaveBeenCalledWith({
        where: {
          teamId: 'team-1',
          contributorId: 'contributor-1',
          isActive: true,
        },
        data: {
          leftAt: expect.any(Date),
          isActive: false,
        },
      });
    });
  });

  describe('GET /contributors/:id/stats', () => {
    it('should return contributor statistics', async () => {
      const mockContributor = { id: '1', name: 'John Doe' };
      const mockStats = {
        _count: 50,
        _sum: {
          additions: 1000,
          deletions: 200,
          changedFiles: 150,
        },
      };

      vi.mocked(prisma.contributor.findUnique).mockResolvedValue(mockContributor as any);
      vi.mocked(prisma.commit.aggregate).mockResolvedValue(mockStats as any);
      vi.mocked(prisma.teamContributor.count).mockResolvedValue(3);

      const response = await request(app).get('/contributors/1/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        totalCommits: 50,
        totalAdditions: 1000,
        totalDeletions: 200,
        totalChangedFiles: 150,
        activeTeams: 3,
      });
    });

    it('should return 404 if contributor not found', async () => {
      vi.mocked(prisma.contributor.findUnique).mockResolvedValue(null);

      const response = await request(app).get('/contributors/999/stats');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Contributor not found' });
    });
  });
});