// lib/auth/permissions.ts

export type Role = "owner" | "employee" | "client";

export const PERMISSIONS = {
  EMPLOYEES_VIEW: "employees.view",
  EMPLOYEES_CREATE: "employees.create",
  EMPLOYEES_UPDATE: "employees.update",
  EMPLOYEES_DELETE: "employees.delete",

  RATES_VIEW: "rates.view",
  RATES_CREATE: "rates.create",
  RATES_UPDATE: "rates.update",
  RATES_DELETE: "rates.delete",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.EMPLOYEES_CREATE,
    PERMISSIONS.EMPLOYEES_UPDATE,
    PERMISSIONS.EMPLOYEES_DELETE,
    PERMISSIONS.RATES_VIEW,
    PERMISSIONS.RATES_CREATE,
    PERMISSIONS.RATES_UPDATE,
    PERMISSIONS.RATES_DELETE,
  ],
  employee: [],
  client: [],
};

export function normalizePermissions(value: unknown): Permission[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is Permission => typeof item === "string");
}

export function hasPermission(
  role: Role | null | undefined,
  userPermissions: unknown,
  requiredPermission: Permission
): boolean {
  if (!role) return false;

  if (role === "owner") return true;

  const normalizedUserPermissions = normalizePermissions(userPermissions);
  const rolePermissions = ROLE_PERMISSIONS[role] ?? [];

  return (
    normalizedUserPermissions.includes(requiredPermission) ||
    rolePermissions.includes(requiredPermission)
  );
}