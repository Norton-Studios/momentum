import { Router, type Response } from "express";
import type { PrismaClient } from "@mmtm/database";
import { z } from "zod";
// TODO: Fix auth middleware import path
type AuthenticatedRequest = any;
import { generateSecurePassword, generateApiToken, hashPassword } from "../lib/auth-utils.js";

const router = Router();

const CreateTenantSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9-_]+$/, {
      message: "Name must be alphanumeric with hyphens and underscores only",
    }),
  adminEmail: z.string().email({}),
});

const _UpdateTenantSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9-_]+$/, {
      message: "Name must be alphanumeric with hyphens and underscores only",
    })
    .optional(),
});

const _CreateUserSchema = z.object({
  email: z.string().email({}),
  fullName: z.string().optional(),
  password: z.string().min(8).optional(),
  isAdmin: z.boolean().optional().default(false),
  ssoProvider: z.string().optional(),
  ssoProviderId: z.string().optional(),
});

const _UpdateUserSchema = z.object({
  email: z.string().email({}).optional(),
  fullName: z.string().optional(),
  password: z.string().min(8).optional(),
  isAdmin: z.boolean().optional(),
  ssoProvider: z.string().optional(),
  ssoProviderId: z.string().optional(),
});

const _TenantDataSourceConfigSchema = z.object({
  dataSource: z.string().min(1),
  key: z.string().min(1),
  value: z.string(),
});

const _OnboardingProgressSchema = z.object({
  currentStep: z.string(),
  completedSteps: z.array(z.string()),
  wizardData: z.record(z.string(), z.any()),
  completed: z.boolean().optional().default(false),
});

const _SignupSchema = z.object({
  organizationName: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email({}),
  password: z
    .string()
    .min(12)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/, {
      message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    }),
});

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
    const hashedPassword = await hashPassword(adminPassword);
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
        onboardingProgress: {
          create: {
            currentStep: "data-sources",
            completedSteps: [],
            wizardData: {},
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
      return res.status(400).json({ error: "Invalid request data", details: error.issues });
    }
    console.error("Error creating tenant:", error);
    res.status(500).json({ error: "Failed to create tenant" });
  }
});

// Tenant CRUD endpoints
router.get("/tenants", async (req: AuthenticatedRequest, res: Response) => {
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
    const tenants = await db.tenant.findMany({
      include: {
        _count: {
          select: {
            users: true,
            tenantDataSourceConfigs: true,
          },
        },
        onboardingProgress: true,
      },
    });
    res.json(tenants);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

export default router;
