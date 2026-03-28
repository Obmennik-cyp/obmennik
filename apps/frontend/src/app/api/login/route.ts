import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";

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

function sanitizeUser(user: {
  id: number;
  email: string;
  phone: string;
  role: string;
  permissions: unknown;
}) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    permissions: parsePermissions(user.permissions),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const login = String(body.email ?? body.login ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!login || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Введите email и пароль",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: login },
          { phone: login },
        ],
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

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
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
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ошибка входа",
      },
      { status: 500 }
    );
  }
}