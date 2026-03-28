"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  normalizePermissions,
  hasPermission as checkPermission,
  type Permission,
  type Role,
} from "@/lib/auth/permissions";

export type GuardRole = Role;

export type GuardUser = {
  id: number;
  email: string;
  phone: string;
  role: GuardRole;
  permissions?: Permission[] | string;
};

type UseAuthGuardOptions = {
  redirectIfNoUser?: string;
  redirectIfForbidden?: string;
  allowedRoles?: GuardRole[];
  requiredPermissions?: Permission[];
  requireAllPermissions?: boolean;
};

export function useAuthGuard(options?: UseAuthGuardOptions) {
  const router = useRouter();

  const [user, setUser] = useState<GuardUser | null>(null);
  const [isChecking, setIsChecking] = useState(true);

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
      setIsChecking(false);
      router.push(config.redirectIfNoUser);
      return;
    }

    try {
      const parsedUser = JSON.parse(stored) as GuardUser;

      const normalizedUser: GuardUser = {
        id: Number(parsedUser.id),
        email: parsedUser.email,
        phone: parsedUser.phone,
        role: parsedUser.role,
        permissions: normalizePermissions(parsedUser.permissions),
      };

      const hasAllowedRole =
        config.allowedRoles.length === 0 ||
        config.allowedRoles.includes(normalizedUser.role);

      let hasRequiredPermissions = true;

      if (
        normalizedUser.role !== "owner" &&
        config.requiredPermissions.length > 0
      ) {
        if (config.requireAllPermissions) {
          hasRequiredPermissions = config.requiredPermissions.every(
            (permission) =>
              checkPermission(
                normalizedUser.role,
                normalizedUser.permissions,
                permission
              )
          );
        } else {
          hasRequiredPermissions = config.requiredPermissions.some(
            (permission) =>
              checkPermission(
                normalizedUser.role,
                normalizedUser.permissions,
                permission
              )
          );
        }
      }

      if (!hasAllowedRole || !hasRequiredPermissions) {
        setIsChecking(false);
        router.push(config.redirectIfForbidden);
        return;
      }

      setUser(normalizedUser);
    } catch (error) {
      console.error("AUTH GUARD ERROR:", error);
      localStorage.removeItem("user");
      router.push(config.redirectIfNoUser);
    } finally {
      setIsChecking(false);
    }
  }, [router, config]);

  const permissions = useMemo(
    () => normalizePermissions(user?.permissions),
    [user]
  );

  const hasPermission = (permission: Permission) => {
    if (!user) return false;
    return checkPermission(user.role, permissions, permission);
  };

  const hasAnyPermission = (requiredPermissions: Permission[]) => {
    if (!user) return false;
    if (user.role === "owner") return true;

    return requiredPermissions.some((permission) =>
      checkPermission(user.role, permissions, permission)
    );
  };

  const hasAllPermissions = (requiredPermissions: Permission[]) => {
    if (!user) return false;
    if (user.role === "owner") return true;

    return requiredPermissions.every((permission) =>
      checkPermission(user.role, permissions, permission)
    );
  };

  return {
    user,
    isChecking,
    permissions,
    isOwner: user?.role === "owner",
    isEmployee: user?.role === "employee",
    isClient: user?.role === "client",
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}