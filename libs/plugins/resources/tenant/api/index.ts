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

const UpdateTenantSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9-_]+$/, {
      message: "Name must be alphanumeric with hyphens and underscores only",
    })
    .optional(),
});

const CreateUserSchema = z.object({
  email: z.string().email({}),
  fullName: z.string().optional(),
  password: z.string().min(8).optional(),
  isAdmin: z.boolean().optional().default(false),
  ssoProvider: z.string().optional(),
  ssoProviderId: z.string().optional(),
});

const UpdateUserSchema = z.object({
  email: z.string().email({}).optional(),
  fullName: z.string().optional(),
  password: z.string().min(8).optional(),
  isAdmin: z.boolean().optional(),
  ssoProvider: z.string().optional(),
  ssoProviderId: z.string().optional(),
});

const TenantDataSourceConfigSchema = z.object({
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
        onboardingProgress: true,
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
      return res.status(400).json({ error: "Invalid request data", details: error.issues });
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
    const hashedPassword = data.password ? await hashPassword(data.password) : undefined;
    const apiToken = generateApiToken();

    const userData: any = {
      tenantId,
      email: data.email,
      apiToken,
      isAdmin: data.isAdmin,
      fullName: data.fullName,
      ssoProvider: data.ssoProvider,
      ssoProviderId: data.ssoProviderId,
    };

    if (data.password) {
      userData.password = hashedPassword;
    }

    const user = await db.user.create({
      data: userData,
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
      return res.status(400).json({ error: "Invalid request data", details: error.issues });
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
    const updateData: any = {
      email: data.email,
      fullName: data.fullName,
      isAdmin: data.isAdmin,
      ssoProvider: data.ssoProvider,
      ssoProviderId: data.ssoProviderId,
    };

    if (data.password) {
      updateData.password = await hashPassword(data.password);
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
      return res.status(400).json({ error: "Invalid request data", details: error.issues });
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
        dataSource: data.dataSource,
        key: data.key,
        value: data.value,
      },
    });

    res.status(201).json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.issues });
    }
    console.error("Error creating config:", error);
    res.status(500).json({ error: "Failed to create config" });
  }
});

// Onboarding endpoints
router.get("/tenants/:tenantId/onboarding", async (req: AuthenticatedRequest, res: Response) => {
  const db = req.app.get("db") as PrismaClient;
  const { tenantId } = req.params;

  try {
    const { getOnboardingProgress } = await import("../hooks/onboarding-progress.js");
    const progress = await getOnboardingProgress(tenantId, db);

    if (!progress) {
      return res.status(404).json({ error: "Onboarding progress not found" });
    }

    res.json(progress);
  } catch (error) {
    console.error("Error fetching onboarding progress:", error);
    res.status(500).json({ error: "Failed to fetch onboarding progress" });
  }
});

router.put("/tenants/:tenantId/onboarding", async (req: AuthenticatedRequest, res: Response) => {
  const db = req.app.get("db") as PrismaClient;
  const { tenantId } = req.params;

  try {
    const data = _OnboardingProgressSchema.parse(req.body);

    const { updateOnboardingProgress } = await import("../hooks/onboarding-progress.js");
    const progress = await updateOnboardingProgress(tenantId, data.currentStep, data.completedSteps, data.wizardData, db);

    res.json(progress);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.issues });
    }
    console.error("Error updating onboarding progress:", error);
    res.status(500).json({ error: "Failed to update onboarding progress" });
  }
});

// Signup endpoint for onboarding
router.post("/signup", async (req: any, res: Response) => {
  const db = req.app.get("db") as PrismaClient;

  try {
    const data = _SignupSchema.parse(req.body);

    // Use hooks for validation and account creation
    const { validateOrganizationName } = await import("../hooks/organization.js");
    const { createUserAccount } = await import("../hooks/user-account.js");

    // Check if organization name is unique
    const isAvailable = await validateOrganizationName(data.organizationName, db);
    if (!isAvailable) {
      return res.status(409).json({ error: "Organization name already exists" });
    }

    // Create tenant with admin user and onboarding progress
    const tenant = await createUserAccount(
      {
        organizationName: data.organizationName,
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      },
      db,
    );

    res.status(201).json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
      user: tenant.users[0],
      onboardingProgress: tenant.onboardingProgress,
      message: "Account created successfully. Welcome to Momentum!",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.issues });
    }
    console.error("Error creating account:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// Validate organization name endpoint
router.post("/validate-organization", async (req: any, res: Response) => {
  const db = req.app.get("db") as PrismaClient;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Organization name is required" });
  }

  try {
    const { validateOrganizationName } = await import("../hooks/organization.js");
    const isAvailable = await validateOrganizationName(name, db);

    res.json({
      available: isAvailable,
      message: isAvailable ? "Organization name is available" : "Organization name already exists",
    });
  } catch (error) {
    console.error("Error validating organization name:", error);
    res.status(500).json({ error: "Failed to validate organization name" });
  }
});

export default router;
