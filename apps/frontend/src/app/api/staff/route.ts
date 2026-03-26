import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

async function getUser(userId: number) {
  if (!userId) return null;

  return await prisma.user.findUnique({
    where: { id: userId },
  });
}

function parsePermissions(value: string | null) {
  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
}

async function checkOwner(userId: number) {
  const user = await getUser(userId);
  return user?.role === "owner";
}

// ===================== GET =====================
// Только владелец может смотреть список сотрудников
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = Number(searchParams.get("userId"));

    if (!(await checkOwner(userId))) {
      return NextResponse.json(
        { success: false, message: "Нет доступа" },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ["owner", "employee"],
        },
      },
      orderBy: { id: "asc" },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
      },
    });

    const normalizedUsers = users.map((user) => ({
      ...user,
      permissions: parsePermissions(user.permissions),
    }));

    return NextResponse.json({
      success: true,
      users: normalizedUsers,
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
// Только владелец может создавать работников
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const ownerId = Number(body.userId);

    if (!(await checkOwner(ownerId))) {
      return NextResponse.json(
        { success: false, message: "Нет доступа" },
        { status: 403 }
      );
    }

    if (!body.email || !body.phone || !body.password) {
      return NextResponse.json(
        { success: false, message: "Заполните все поля" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Пользователь уже существует" },
        { status: 400 }
      );
    }

    const newUser = await prisma.user.create({
      data: {
        email: body.email,
        phone: body.phone,
        password: body.password,
        role: "employee",
        permissions: JSON.stringify(body.permissions ?? []),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        permissions: parsePermissions(newUser.permissions),
      },
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
// Только владелец может менять права работников
export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const ownerId = Number(body.ownerId);
    const userId = Number(body.userId);

    if (!(await checkOwner(ownerId))) {
      return NextResponse.json(
        { success: false, message: "Нет доступа" },
        { status: 403 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Не передан userId" },
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Сотрудник не найден" },
        { status: 404 }
      );
    }

    if (currentUser.role === "owner") {
      return NextResponse.json(
        { success: false, message: "Нельзя изменять владельца" },
        { status: 400 }
      );
    }

    if (currentUser.role !== "employee") {
      return NextResponse.json(
        { success: false, message: "Права можно менять только у работников" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        permissions: JSON.stringify(body.permissions ?? []),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        permissions: parsePermissions(updatedUser.permissions),
      },
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
// Только владелец может удалять работников
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const userId = Number(searchParams.get("userId"));
    const ownerId = Number(searchParams.get("ownerId"));

    if (!(await checkOwner(ownerId))) {
      return NextResponse.json(
        { success: false, message: "Нет доступа" },
        { status: 403 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Не передан userId" },
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Сотрудник не найден" },
        { status: 404 }
      );
    }

    if (currentUser.role === "owner") {
      return NextResponse.json(
        { success: false, message: "Нельзя удалить владельца" },
        { status: 400 }
      );
    }

    if (currentUser.role !== "employee") {
      return NextResponse.json(
        { success: false, message: "Можно удалять только работников" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
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