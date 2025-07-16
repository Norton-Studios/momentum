import type { Request, Response, NextFunction } from "express";
import type { PrismaClient } from "@developer-productivity/database";
import bcrypt from "bcrypt";

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    tenantId: string;
    isAdmin: boolean;
  };
}

export function createAuthMiddleware(db: PrismaClient) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Skip auth for tenant creation endpoint - it handles its own auth
    if (req.path === "/tenant" && req.method === "POST") {
      return next();
    }

    // Skip auth for health check endpoint
    if (req.path === "/" && req.method === "GET") {
      return next();
    }

    // Extract Basic Auth credentials
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const base64Credentials = authHeader.slice(6);
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
    const [email, password] = credentials.split(":");

    if (!email || !password) {
      return res.status(401).json({ error: "Invalid credentials format" });
    }

    try {
      // Find user by email or API token
      const user = await db.user.findFirst({
        where: {
          OR: [
            { email },
            { apiToken: email }, // Allow using API token as username
          ],
        },
        include: {
          tenant: true,
        },
      });

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password or API token
      let isValid = false;

      if (user.apiToken === email && user.apiToken === password) {
        // Using API token as both username and password
        isValid = true;
      } else if (user.email === email) {
        // Using email and password
        isValid = await bcrypt.compare(password, user.password);
      }

      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Attach user info to request
      req.user = {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        isAdmin: user.isAdmin,
      };

      next();
    } catch (error) {
      console.error("Authentication error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  };
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
