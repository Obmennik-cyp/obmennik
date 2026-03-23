import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

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