import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Проверка существующего пользователя
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

    // Проверяем сколько пользователей в базе
    const usersCount = await prisma.user.count();
    const isFirstUser = usersCount === 0;

    // Создание пользователя
    const newUser = await prisma.user.create({
      data: {
        email: body.email,
        phone: body.phone,
        password: body.password,

        role: isFirstUser ? "owner" : "employee",

        permissions: isFirstUser
          ? JSON.stringify([
              "manage_orders",
              "change_status",
              "delete_orders",
              "send_messages",
              "post_to_telegram",
              "manage_rates",
              "manage_fees",
              "manage_staff",
            ])
          : JSON.stringify([]),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Пользователь сохранён в базе",
      user: newUser,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ошибка сервера",
      },
      { status: 500 }
    );
  }
}