// lib/auth/require-auth.ts

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  hasPermission,
  normalizePermissions,
  type Permission,
  type Role,
} from "@/lib/auth/permissions";

export type CurrentUserAccess = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isActive: boolean;
  permissions: Permission[];
};

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export async function getCurrentUserAccess(): Promise<CurrentUserAccess | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      permissions: true,
    },
  });

  if (!user) return null;
  if (!user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    isActive: user.isActive,
    permissions: normalizePermissions(user.permissions),
  };
}

export async function requireAuth(): Promise<CurrentUserAccess> {
  const user = await getCurrentUserAccess();

  if (!user) {
    throw new AuthError("UNAUTHORIZED", 401);
  }

  return user;
}

export async function requireRole(allowedRoles: Role[]): Promise<CurrentUserAccess> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    throw new AuthError("FORBIDDEN", 403);
  }

  return user;
}

export async function requirePermission(
  permission: Permission
): Promise<CurrentUserAccess> {
  const user = await requireAuth();

  if (!hasPermission(user.role, user.permissions, permission)) {
    throw new AuthError("FORBIDDEN", 403);
  }

  return user;
}

export async function requireAdminPageAccess(permission?: Permission) {
  const user = await requireAuth();

  if (user.role === "client") {
    redirect("/");
  }

  if (permission && !hasPermission(user.role, user.permissions, permission)) {
    redirect("/admin");
  }

  return user;
}