// lib/auth/permissions.ts

export type Role = "owner" | "employee" | "client";

export const PERMISSIONS = {
  // Staff
  MANAGE_STAFF: "manage_staff",
  EMPLOYEES_VIEW: "employees.view",
  EMPLOYEES_CREATE: "employees.create",
  EMPLOYEES_UPDATE: "employees.update",
  EMPLOYEES_DELETE: "employees.delete",

  // Orders
  MANAGE_ORDERS: "manage_orders",
  ORDERS_VIEW: "orders.view",
  CHANGE_STATUS: "change_status",
  DELETE_ORDERS: "delete_orders",
  SEND_MESSAGES: "send_messages",
  POST_TO_TELEGRAM: "post_to_telegram",

  // Rates
  MANAGE_RATES: "manage_rates",
  MANAGE_FEES: "manage_fees",
  RATES_VIEW: "rates.view",
  RATES_CREATE: "rates.create",
  RATES_UPDATE: "rates.update",
  RATES_DELETE: "rates.delete",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    PERMISSIONS.MANAGE_STAFF,
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.EMPLOYEES_CREATE,
    PERMISSIONS.EMPLOYEES_UPDATE,
    PERMISSIONS.EMPLOYEES_DELETE,

    PERMISSIONS.MANAGE_ORDERS,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.CHANGE_STATUS,
    PERMISSIONS.DELETE_ORDERS,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.POST_TO_TELEGRAM,

    PERMISSIONS.MANAGE_RATES,
    PERMISSIONS.MANAGE_FEES,
    PERMISSIONS.RATES_VIEW,
    PERMISSIONS.RATES_CREATE,
    PERMISSIONS.RATES_UPDATE,
    PERMISSIONS.RATES_DELETE,
  ],
  employee: [],
  client: [],
};

export function normalizePermissions(value: unknown): Permission[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is Permission => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is Permission => typeof item === "string"
        );
      }
    } catch {
      return [];
    }
  }

  return [];
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

export function hasAnyPermission(
  role: Role | null | undefined,
  userPermissions: unknown,
  requiredPermissions: Permission[]
): boolean {
  if (!role) return false;

  if (role === "owner") return true;

  const normalizedUserPermissions = normalizePermissions(userPermissions);
  const rolePermissions = ROLE_PERMISSIONS[role] ?? [];

  return requiredPermissions.some(
    (permission) =>
      normalizedUserPermissions.includes(permission) ||
      rolePermissions.includes(permission)
  );
}

export function hasAllPermissions(
  role: Role | null | undefined,
  userPermissions: unknown,
  requiredPermissions: Permission[]
): boolean {
  if (!role) return false;

  if (role === "owner") return true;

  const normalizedUserPermissions = normalizePermissions(userPermissions);
  const rolePermissions = ROLE_PERMISSIONS[role] ?? [];

  return requiredPermissions.every(
    (permission) =>
      normalizedUserPermissions.includes(permission) ||
      rolePermissions.includes(permission)
  );
}