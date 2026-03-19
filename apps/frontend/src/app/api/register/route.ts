import { NextResponse } from "next/server";

// временное хранилище (живёт пока сервер запущен)
const users: any[] = [];

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const newUser = {
      id: Date.now(),
      email: body.email,
      phone: body.phone,
      password: body.password,
    };

    users.push(newUser);

    console.log("ВСЕ ПОЛЬЗОВАТЕЛИ:", users);

    return NextResponse.json({
      success: true,
      message: "Пользователь сохранён",
      user: newUser,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Ошибка",
      },
      { status: 400 }
    );
  }
}