import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";

type DbUser = {
  id: number;
  email: string;
  phone: string;
  password: string;
  role: string;
  permissions: unknown;
};

function getUserFromHeaders(req: Request) {
  const header = req.headers.get("x-user");

  if (!header) {
    return null;
  }

  try {
    return JSON.parse(header);
  } catch {
    return null;
  }
}

function parsePermissions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      return [];
    }
  }

  return [];
}

function normalizePermissionInput(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.filter((item): item is string => typeof item === "string"))];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return [...new Set(parsed.filter((item): item is string => typeof item === "string"))];
      }
    } catch {
      return [];
    }
  }

  return [];
}

function serializePermissions(value: string[]) {
  return JSON.stringify([...new Set(value)]);
}

function hasPermission(user: DbUser | null, permission: string) {
  if (!user) return false;
  if (user.role === "owner") return true;

  const permissions = parsePermissions(user.permissions);
  return permissions.includes(permission);
}

async function getUserById(userId: number) {
  if (!userId || Number.isNaN(userId)) return null;

  return await prisma.user.findUnique({
    where: { id: userId },
  });
}

async function getTrustedUserFromHeader(req: Request) {
  const headerUser = getUserFromHeaders(req);

  if (!headerUser) return null;

  const headerUserId = Number(headerUser.id);

  if (!headerUserId || Number.isNaN(headerUserId)) {
    return null;
  }

  return await getUserById(headerUserId);
}

async function resolveUser(req: Request, body?: any) {
  const trustedHeaderUser = await getTrustedUserFromHeader(req);
  if (trustedHeaderUser) return trustedHeaderUser;

  const bodyUserId = Number(body?.ownerId ?? body?.currentUserId ?? body?.userId);
  if (bodyUserId) {
    return await getUserById(bodyUserId);
  }

  const { searchParams } = new URL(req.url);

  const queryUserId = Number(
    searchParams.get("ownerId") ??
      searchParams.get("currentUserId") ??
      searchParams.get("adminId")
  );

  if (queryUserId) {
    return await getUserById(queryUserId);
  }

  return null;
}

function canManageStaff(user: DbUser | null) {
  if (!user) return false;
  return user.role === "owner" || hasPermission(user, "manage_staff");
}

function sanitizeUser(user: DbUser) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    permissions: parsePermissions(user.permissions),
  };
}

// ===================== GET =====================
export async function GET(req: Request) {
  try {
    const currentUser = await resolveUser(req);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Не авторизован" },
        { status: 401 }
      );
    }

    if (!canManageStaff(currentUser)) {
      return NextResponse.json(
        { success: false, message: "Нет прав на просмотр сотрудников" },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ["owner", "employee"],
        },
      },
      orderBy: [
        { role: "asc" },
        { id: "asc" },
      ],
    });

    return NextResponse.json({
      success: true,
      users: users.map(sanitizeUser),
    });
  } catch (error) {
    console.error("GET STAFF ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Ошибка загрузки сотрудников" },
      { status: 500 }
    );
  }
}

// ===================== POST =====================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const currentUser = await resolveUser(req, body);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Пользователь не найден" },
        { status: 404 }
      );
    }

    if (!canManageStaff(currentUser)) {
      return NextResponse.json(
        { success: false, message: "Нет прав на создание сотрудников" },
        { status: 403 }
      );
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const password = String(body.password ?? "");
    const permissions = normalizePermissionInput(body.permissions);

    if (!email || !phone || !password) {
      return NextResponse.json(
        { success: false, message: "Не заполнены обязательные поля" },
        { status: 400 }
      );
    }

    const existingByEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingByEmail) {
      return NextResponse.json(
        { success: false, message: "Пользователь с таким email уже существует" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        role: "employee",
        permissions: serializePermissions(permissions),
      },
    });

    return NextResponse.json({
      success: true,
      user: sanitizeUser(createdUser),
    });
  } catch (error) {
    console.error("POST STAFF ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Ошибка создания сотрудника" },
      { status: 500 }
    );
  }
}

// ===================== PUT =====================
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const currentUser = await resolveUser(req, body);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Пользователь не найден" },
        { status: 404 }
      );
    }

    if (!canManageStaff(currentUser)) {
      return NextResponse.json(
        { success: false, message: "Нет прав на изменение сотрудников" },
        { status: 403 }
      );
    }

    const targetUserId = Number(body.userId);

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, message: "Не передан id сотрудника" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "Сотрудник не найден" },
        { status: 404 }
      );
    }

    if (targetUser.role === "owner") {
      return NextResponse.json(
        { success: false, message: "Нельзя изменять владельца через этот метод" },
        { status: 403 }
      );
    }

    const nextPermissions = normalizePermissionInput(body.permissions);

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        permissions: serializePermissions(nextPermissions),
      },
    });

    return NextResponse.json({
      success: true,
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    console.error("PUT STAFF ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Ошибка обновления прав сотрудника" },
      { status: 500 }
    );
  }
}

// ===================== DELETE =====================
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const targetUserId = Number(searchParams.get("userId"));
    const currentUser = await resolveUser(req);

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, message: "Не передан id сотрудника" },
        { status: 400 }
      );
    }

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Пользователь не найден" },
        { status: 404 }
      );
    }

    if (!canManageStaff(currentUser)) {
      return NextResponse.json(
        { success: false, message: "Нет прав на удаление сотрудников" },
        { status: 403 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "Сотрудник не найден" },
        { status: 404 }
      );
    }

    if (targetUser.role === "owner") {
      return NextResponse.json(
        { success: false, message: "Нельзя удалить владельца" },
        { status: 403 }
      );
    }

    await prisma.order.updateMany({
      where: {
        employeeId: targetUserId,
      },
      data: {
        employeeId: null,
      },
    });

    await prisma.user.delete({
      where: { id: targetUserId },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE STAFF ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Ошибка удаления сотрудника" },
      { status: 500 }
    );
  }
}