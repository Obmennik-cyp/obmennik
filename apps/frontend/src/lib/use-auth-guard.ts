"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type GuardRole = "owner" | "employee" | "client";

export type GuardUser = {
  id: number;
  email: string;
  phone: string;
  role: GuardRole;
  permissions?: string[];
};

type UseAuthGuardOptions = {
  redirectIfNoUser?: string;
  redirectIfForbidden?: string;
  allowedRoles?: GuardRole[];
  requiredPermissions?: string[];
  requireAllPermissions?: boolean;
};

export function useAuthGuard(options?: UseAuthGuardOptions) {
  const router = useRouter();

  const [user, setUser] = useState<GuardUser | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // ❗ фикс: сохраняем опции один раз
  const config = useMemo(() => {
    return {
      redirectIfNoUser: options?.redirectIfNoUser ?? "/login",
      redirectIfForbidden: options?.redirectIfForbidden ?? "/dashboard",
      allowedRoles: options?.allowedRoles ?? [],
      requiredPermissions: options?.requiredPermissions ?? [],
      requireAllPermissions: options?.requireAllPermissions ?? false,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      router.push(config.redirectIfNoUser);
      return;
    }

    try {
      const parsedUser = JSON.parse(stored) as GuardUser;

      const normalizedUser: GuardUser = {
        id: parsedUser.id,
        email: parsedUser.email,
        phone: parsedUser.phone,
        role: parsedUser.role,
        permissions: parsedUser.permissions ?? [],
      };

      const isOwner = normalizedUser.role === "owner";

      const hasAllowedRole =
        config.allowedRoles.length === 0 ||
        config.allowedRoles.includes(normalizedUser.role);

      let hasPermissions = true;

      if (!isOwner && config.requiredPermissions.length > 0) {
        if (config.requireAllPermissions) {
          hasPermissions = config.requiredPermissions.every((p) =>
            normalizedUser.permissions?.includes(p)
          );
        } else {
          hasPermissions = config.requiredPermissions.some((p) =>
            normalizedUser.permissions?.includes(p)
          );
        }
      }

      if (!hasAllowedRole || !hasPermissions) {
        router.push(config.redirectIfForbidden);
        return;
      }

      setUser(normalizedUser);
    } catch (error) {
      console.error("AUTH GUARD ERROR:", error);
      localStorage.removeItem("user");
      router.push(config.redirectIfNoUser);
      return;
    } finally {
      setIsChecking(false);
    }
  }, [router, config]);

  const permissions = useMemo(() => user?.permissions ?? [], [user]);

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === "owner") return true;
    return permissions.includes(permission);
  };

  return {
    user,
    isChecking,
    permissions,
    isOwner: user?.role === "owner",
    isEmployee: user?.role === "employee",
    isClient: user?.role === "client",
    hasPermission,
  };
}