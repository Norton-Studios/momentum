import { Router, type Response } from "express";
import type { PrismaClient } from "@mmtm/database";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import type { AuthenticatedRequest } from "../../../../apps/api/src/middleware/auth";

const router = Router();

const SALT_ROUNDS = 10;

const CreateTenantSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9-_]+$/, "Name must be alphanumeric with hyphens and underscores only"),
  adminEmail: z.string().email(),
});

const UpdateTenantSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9-_]+$/, "Name must be alphanumeric with hyphens and underscores only")
    .optional(),
});

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  isAdmin: z.boolean().optional().default(false),
});

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  isAdmin: z.boolean().optional(),
});

const TenantDataSourceConfigSchema = z.object({
  dataSource: z.string().min(1),
  key: z.string().min(1),
  value: z.string(),
});

function generateSecurePassword(): string {
  const PASSWORD_LENGTH = 16;
  const LOWERCASE_CHARS = "abcdefghijklmnopqrstuvwxyz";
  const UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const NUMERIC_CHARS = "0123456789";
  const SPECIAL_CHARS = "!@#$%^&*()_+-=";
  const PASSWORD_CHARSET = LOWERCASE_CHARS + UPPERCASE_CHARS + NUMERIC_CHARS + SPECIAL_CHARS;
  let password = "";
  const randomBytes = crypto.randomBytes(PASSWORD_LENGTH);

  // Ensure at least one of each type
  const requirements = [LOWERCASE_CHARS, UPPERCASE_CHARS, NUMERIC_CHARS, SPECIAL_CHARS];

  requirements.forEach((req, index) => {
    password += req[randomBytes[index] % req.length];
  });

  // Fill the rest randomly
  for (let i = requirements.length; i < PASSWORD_LENGTH; i++) {
    password += PASSWORD_CHARSET[randomBytes[i] % PASSWORD_CHARSET.length];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

function generateApiToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// POST /tenant - Create a new tenant (requires system admin token)
// This endpoint is special - it bypasses normal auth and uses system admin token
router.post("/tenant", async (req: any, res: Response) => {
  const db = req.app.get("db") as PrismaClient;

  // Check system admin token
  const systemAdminToken = process.env.SYSTEM_ADMIN_TOKEN;
  const providedToken = req.headers["x-system-admin-token"];

  if (!systemAdminToken) {
    return res.status(500).json({ error: "System admin token not configured" });
  }

  if (providedToken !== systemAdminToken) {
    return res.status(401).json({ error: "Invalid system admin token" });
  }

  try {
    const data = CreateTenantSchema.parse(req.body);

    // Generate admin credentials
    const adminPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);
    const apiToken = generateApiToken();

    // Create tenant record with admin user
    const tenant = await db.tenant.create({
      data: {
        name: data.name,
        users: {
          create: {
            email: data.adminEmail,
            password: hashedPassword,
            apiToken,
            isAdmin: true,
          },
        },
      },
      include: {
        users: {
          where: { email: data.adminEmail },
          select: {
            id: true,
            email: true,
            apiToken: true,
          },
        },
      },
    });

    res.status(201).json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
      admin: {
        id: tenant.users[0].id,
        email: tenant.users[0].email,
        apiToken: tenant.users[0].apiToken,
        password: adminPassword, // Return only on creation - MUST BE SAVED BY USER
      },
      message: "Tenant created successfully. Please save the admin password as it will not be shown again.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("Error creating tenant:", error);
    res.status(500).json({ error: "Failed to create tenant" });
  }
});

// Tenant CRUD endpoints
router.get("/tenants", async (req: AuthenticatedRequest, res: Response) => {
  const db = req.app.get("db") as PrismaClient;

  try {
    const tenants = await db.tenant.findMany({
      include: {
        _count: {
          select: {
            users: true,
            tenantDataSourceConfigs: true,
          },
        },
      },
    });
    res.json(tenants);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

router.get("/tenants/:id", async (req: AuthenticatedRequest, res: Response) => {
  const db = req.app.get("db") as PrismaClient;
  const { id } = req.params;

  try {
    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            isAdmin: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        tenantDataSourceConfigs: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.json(tenant);
  } catch (error) {
    console.error("Error fetching tenant:", error);
    res.status(500).json({ error: "Failed to fetch tenant" });
  }
});

// POST /tenants removed - only system admins can create tenants via POST /tenant

router.patch("/tenants/:id", async (req: AuthenticatedRequest, res: Response) => {
  const db = req.app.get("db") as PrismaClient;
  const { id } = req.params;

  try {
    const data = UpdateTenantSchema.parse(req.body);

    const tenant = await db.tenant.update({
      where: { id },
      data,
    });

    res.json(tenant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("Error updating tenant:", error);
    res.status(500).json({ error: "Failed to update tenant" });
  }
});

router.delete("/tenants/:id", async (req: AuthenticatedRequest, res: Response) => {
  const db = req.app.get("db") as PrismaClient;
  const { id } = req.params;

  try {
    await db.tenant.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting tenant:", error);
    res.status(500).json({ error: "Failed to delete tenant" });
  }
});

// User endpoints
router.get("/tenants/:tenantId/users", async (req: AuthenticatedRequest, res: Response) => {
  const db = req.app.get("db") as PrismaClient;
  const { tenantId } = req.params;

  try {
    const users = await db.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/tenants/:tenantId/users", async (req: AuthenticatedRequest, res: Response) => {
  const db = req.app.get("db") as PrismaClient;
  const { tenantId } = req.params;

  try {
    const data = CreateUserSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    const apiToken = generateApiToken();

    const user = await db.user.create({
      data: {
        tenantId,
        email: data.email,
        password: hashedPassword,
        apiToken,
        isAdmin: data.isAdmin,
      },
      select: {
        id: true,
        email: true,
        apiToken: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.patch("/users/:id", async (req: AuthenticatedRequest, res: Response) => {
  const db = req.app.get("db") as PrismaClient;
  const { id } = req.params;

  try {
    const data = UpdateUserSchema.parse(req.body);
    const updateData: any = { ...data };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/users/:id", async (req: AuthenticatedRequest, res: Response) => {
  const db = req.app.get("db") as PrismaClient;
  const { id } = req.params;

  try {
    await db.user.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// TenantDataSourceConfig endpoints
router.get("/tenants/:tenantId/configs", async (req: AuthenticatedRequest, res: Response) => {
  const db = req.app.get("db") as PrismaClient;
  const { tenantId } = req.params;

  try {
    const configs = await db.tenantDataSourceConfig.findMany({
      where: { tenantId },
    });

    res.json(configs);
  } catch (error) {
    console.error("Error fetching configs:", error);
    res.status(500).json({ error: "Failed to fetch configs" });
  }
});

router.post("/tenants/:tenantId/configs", async (req: AuthenticatedRequest, res: Response) => {
  const db = req.app.get("db") as PrismaClient;
  const { tenantId } = req.params;

  try {
    const data = TenantDataSourceConfigSchema.parse(req.body);

    const config = await db.tenantDataSourceConfig.create({
      data: {
        tenantId,
        ...data,
      },
    });

    res.status(201).json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("Error creating config:", error);
    res.status(500).json({ error: "Failed to create config" });
  }
});

router.put("/tenants/:tenantId/configs/:dataSource/:key", async (req: AuthenticatedRequest, res: Response) => {
  const db = req.app.get("db") as PrismaClient;
  const { tenantId, dataSource, key } = req.params;
  const { value } = req.body;

  try {
    const config = await db.tenantDataSourceConfig.upsert({
      where: {
        tenantId_dataSource_key: {
          tenantId,
          dataSource,
          key,
        },
      },
      update: { value },
      create: {
        tenantId,
        dataSource,
        key,
        value,
      },
    });

    res.json(config);
  } catch (error) {
    console.error("Error upserting config:", error);
    res.status(500).json({ error: "Failed to upsert config" });
  }
});

router.delete("/tenants/:tenantId/configs/:dataSource/:key", async (req: AuthenticatedRequest, res: Response) => {
  const db = req.app.get("db") as PrismaClient;
  const { tenantId, dataSource, key } = req.params;

  try {
    await db.tenantDataSourceConfig.delete({
      where: {
        tenantId_dataSource_key: {
          tenantId,
          dataSource,
          key,
        },
      },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting config:", error);
    res.status(500).json({ error: "Failed to delete config" });
  }
});

export default router;
