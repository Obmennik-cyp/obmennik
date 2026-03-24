import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
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
      permissions: JSON.parse(user.permissions || "[]"),
    }));

    return NextResponse.json({
      success: true,
      users: normalizedUsers,
    });
  } catch (error) {
    console.error("GET STAFF ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ошибка загрузки сотрудников",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const existingUser = await prisma.user.findUnique({
      where: {
        email: body.email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Пользователь с таким email уже существует",
        },
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
        permissions: JSON.parse(newUser.permissions || "[]"),
      },
    });
  } catch (error) {
    console.error("POST STAFF ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ошибка создания сотрудника",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (!body.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Не передан userId",
        },
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        id: Number(body.userId),
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Сотрудник не найден",
        },
        { status: 404 }
      );
    }

    if (currentUser.role === "owner") {
      return NextResponse.json(
        {
          success: false,
          message: "Нельзя изменять права владельца через этот раздел",
        },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: Number(body.userId),
      },
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
        permissions: JSON.parse(updatedUser.permissions || "[]"),
      },
    });
  } catch (error) {
    console.error("PUT STAFF ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ошибка обновления прав сотрудника",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = Number(searchParams.get("userId"));

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Не передан userId",
        },
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Сотрудник не найден",
        },
        { status: 404 }
      );
    }

    if (currentUser.role === "owner") {
      return NextResponse.json(
        {
          success: false,
          message: "Нельзя удалить владельца",
        },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE STAFF ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ошибка удаления сотрудника",
      },
      { status: 500 }
    );
  }
}