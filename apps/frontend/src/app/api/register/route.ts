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

    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const password = String(body.password ?? "");
    const confirmPassword = String(
      body.confirmPassword ?? body.repeatPassword ?? ""
    );

    if (!email || !phone || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Заполните все обязательные поля",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Пароль должен содержать минимум 6 символов",
        },
        { status: 400 }
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Пароли не совпадают",
        },
        { status: 400 }
      );
    }

    const existingByEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingByEmail) {
      return NextResponse.json(
        {
          success: false,
          message: "Пользователь с таким email уже существует",
        },
        { status: 409 }
      );
    }

    const existingByPhone = await prisma.user.findFirst({
      where: { phone },
    });

    if (existingByPhone) {
      return NextResponse.json(
        {
          success: false,
          message: "Пользователь с таким телефоном уже существует",
        },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        role: "client",
        permissions: "[]",
      },
    });

    return NextResponse.json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ошибка регистрации",
      },
      { status: 500 }
    );
  }
}