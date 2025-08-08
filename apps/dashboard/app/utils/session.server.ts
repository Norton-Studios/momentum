import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { getUserSession, deleteUserSession } from "@mmtm/resource-tenant";
import { prisma as db } from "@mmtm/database";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

// Create cookie-based session storage for dashboard
const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "momentum_session",
    secure: process.env.NODE_ENV === "production",
    secrets: [process.env.SESSION_SECRET],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
  },
});

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function commitSession(session: any) {
  return sessionStorage.commitSession(session);
}

export async function destroySession(session: any) {
  return sessionStorage.destroySession(session);
}

/**
 * Get the current user from the session
 */
export async function getCurrentUser(request: Request) {
  const session = await getSession(request);
  const sessionToken = session.get("sessionToken");

  if (!sessionToken) {
    return null;
  }

  try {
    const userSession = await getUserSession(sessionToken, db);
    if (!userSession) {
      return null;
    }

    return userSession.user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Require user authentication - redirect to signin if not authenticated
 */
export async function requireUser(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    throw redirect("/auth/signin");
  }
  return user;
}

/**
 * Create a session for a user
 */
export async function createUserSessionAndRedirect(sessionToken: string, redirectTo: string = "/") {
  const session = await sessionStorage.getSession();
  session.set("sessionToken", sessionToken);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

/**
 * Logout user by destroying session
 */
export async function logout(request: Request) {
  const session = await getSession(request);
  const sessionToken = session.get("sessionToken");

  // Delete session from database if it exists
  if (sessionToken) {
    try {
      await deleteUserSession(sessionToken, db);
    } catch (error) {
      console.error("Error deleting user session:", error);
    }
  }

  return redirect("/auth/signin", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}
