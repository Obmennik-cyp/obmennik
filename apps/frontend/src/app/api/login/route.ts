import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

function parsePermissions(value: string | null) {
  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.email || !body.password) {
      return NextResponse.json(
        {
          success: false,
          message: "Не заполнены email или пароль",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: body.email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Пользователь не найден",
        },
        { status: 404 }
      );
    }

    if (user.password !== body.password) {
      return NextResponse.json(
        {
          success: false,
          message: "Неверный пароль",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        permissions: parsePermissions(user.permissions),
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ошибка сервера",
      },
      { status: 500 }
    );
  }
}