import bcrypt from "bcrypt";
import { redirect } from "react-router";
import { db } from "~/db.server";
import { createUserSession, getUserId } from "./session.server";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function register({ email, password, name }: { email: string; password: string; name: string }) {
  const hashedPassword = await hashPassword(password);

  const user = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  return user;
}

export async function login({ email, password }: { email: string; password: string }) {
  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.password);

  if (!isValid) {
    return null;
  }

  return user;
}

export async function requireUserId(request: Request, redirectTo: string = "/login"): Promise<string> {
  const userId = await getUserId(request);

  if (!userId) {
    throw redirect(redirectTo);
  }

  return userId;
}

export async function requireUser(request: Request) {
  const userId = await requireUserId(request);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    throw redirect("/login");
  }

  return user;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);

  if (!userId) {
    return null;
  }

  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });
}

export async function requireAdmin(request: Request) {
  const user = await requireUser(request);

  if (user.role !== "ADMIN") {
    throw redirect("/dashboard");
  }

  return user;
}

export { createUserSession };
