import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import router from '../api/index'

// Mock the database module
vi.mock('@mmtm/database', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    tenant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tenantDataSourceConfig: {
      findMany: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  })),
}))

describe('Tenant API', () => {
  it('should create a tenant with admin user', async () => {
    // Set the system admin token for this test
    process.env.SYSTEM_ADMIN_TOKEN = 'test-admin-token'
    
    const app = express()
    app.use(express.json())
    app.set('db', {
      tenant: {
        create: vi.fn().mockResolvedValue({
          id: 'test-tenant-id',
          name: 'Test Tenant',
          users: [{
            id: 'test-user-id',
            email: 'admin@test.com',
            apiToken: 'test-token',
          }],
        }),
      },
    })
    app.use(router)

    const response = await request(app)
      .post('/tenant')
      .set('x-system-admin-token', 'test-admin-token')
      .send({
        name: 'TestTenant',
        adminEmail: 'admin@test.com',
      })

    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('tenant')
    expect(response.body).toHaveProperty('admin')
    expect(response.body.admin).toHaveProperty('password')
  })

  it('should list all tenants', async () => {
    const app = express()
    app.use(express.json())
    app.set('db', {
      tenant: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'tenant1',
            name: 'Tenant 1',
            _count: { users: 1, tenantDataSourceConfigs: 0 },
          },
        ]),
      },
    })
    app.use(router)

    const response = await request(app).get('/tenants')

    expect(response.status).toBe(200)
    expect(response.body).toBeInstanceOf(Array)
    expect(response.body).toHaveLength(1)
  })

  it('should get a single tenant with users', async () => {
    const app = express()
    app.use(express.json())
    app.set('db', {
      tenant: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'tenant1',
          name: 'Tenant 1',
          users: [
            {
              id: 'user1',
              email: 'user@test.com',
              isAdmin: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          tenantDataSourceConfigs: [],
        }),
      },
    })
    app.use(router)

    const response = await request(app).get('/tenants/tenant1')

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('id', 'tenant1')
    expect(response.body).toHaveProperty('users')
    expect(response.body.users).toHaveLength(1)
  })

  it('should create a new user for a tenant', async () => {
    const app = express()
    app.use(express.json())
    app.set('db', {
      user: {
        create: vi.fn().mockResolvedValue({
          id: 'new-user-id',
          email: 'newuser@test.com',
          apiToken: 'new-token',
          isAdmin: false,
          createdAt: new Date(),
        }),
      },
    })
    app.use(router)

    const response = await request(app)
      .post('/tenants/tenant1/users')
      .send({
        email: 'newuser@test.com',
        password: 'StrongPassword123!',
        isAdmin: false,
      })

    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('id')
    expect(response.body).toHaveProperty('apiToken')
    expect(response.body).not.toHaveProperty('password')
  })

  it('should create a tenant data source config', async () => {
    const app = express()
    app.use(express.json())
    app.set('db', {
      tenantDataSourceConfig: {
        create: vi.fn().mockResolvedValue({
          id: 'config-id',
          tenantId: 'tenant1',
          dataSource: 'github',
          key: 'token',
          value: 'github-token',
        }),
      },
    })
    app.use(router)

    const response = await request(app)
      .post('/tenants/tenant1/configs')
      .send({
        dataSource: 'github',
        key: 'token',
        value: 'github-token',
      })

    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('dataSource', 'github')
    expect(response.body).toHaveProperty('key', 'token')
  })
})