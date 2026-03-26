// lib/auth/api-guard.ts

import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/require-auth";

export function handleApiAuthError(error: unknown) {
  if (error instanceof AuthError) {
    if (error.status === 401) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    if (error.status === 403) {
      return NextResponse.json(
        { error: "Недостаточно прав" },
        { status: 403 }
      );
    }
  }

  console.error("API error:", error);

  return NextResponse.json(
    { error: "Внутренняя ошибка сервера" },
    { status: 500 }
  );
}