// lib/auth/api-guard.ts

import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/require-auth";

type ApiErrorBody = {
  success: false;
  error: string;
  code: string;
};

function jsonError(
  error: string,
  code: string,
  status: number
) {
  return NextResponse.json<ApiErrorBody>(
    {
      success: false,
      error,
      code,
    },
    { status }
  );
}

export function handleApiAuthError(error: unknown) {
  if (error instanceof AuthError) {
    if (error.status === 401) {
      return jsonError("Необходима авторизация", "UNAUTHORIZED", 401);
    }

    if (error.status === 403) {
      return jsonError("Недостаточно прав", "FORBIDDEN", 403);
    }

    return jsonError("Ошибка доступа", "AUTH_ERROR", error.status);
  }

  console.error("API AUTH ERROR:", error);

  return jsonError(
    "Внутренняя ошибка сервера",
    "INTERNAL_SERVER_ERROR",
    500
  );
}