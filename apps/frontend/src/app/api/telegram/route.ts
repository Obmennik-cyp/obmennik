import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

type DbUser = {
  id: number;
  email: string;
  role: string;
  permissions: unknown;
};

function getUserFromHeaders(req: Request) {
  const header = req.headers.get("x-user");
  if (!header) return null;

  try {
    return JSON.parse(header);
  } catch {
    return null;
  }
}

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

function hasPermission(user: DbUser | null, permission: string) {
  if (!user) return false;
  if (user.role === "owner") return true;

  const permissions = parsePermissions(user.permissions);
  return permissions.includes(permission);
}

async function getUserById(userId: number) {
  if (!userId || Number.isNaN(userId)) return null;

  return prisma.user.findUnique({
    where: { id: userId },
  });
}

async function resolveUser(req: Request) {
  const headerUser = getUserFromHeaders(req);

  if (!headerUser) return null;

  const userId = Number(headerUser.id);
  if (!userId || Number.isNaN(userId)) return null;

  return getUserById(userId);
}

function isMultipartRequest(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  return contentType.includes("multipart/form-data");
}

export async function POST(req: Request) {
  try {
    const user = await resolveUser(req);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Не авторизован" },
        { status: 401 }
      );
    }

    const canPost =
      user.role === "owner" || hasPermission(user, "post_to_telegram");

    if (!canPost) {
      return NextResponse.json(
        { success: false, message: "Нет прав на отправку в Telegram" },
        { status: 403 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID || "@obmennik_demo";

    if (!botToken) {
      return NextResponse.json(
        { success: false, message: "Не настроен TELEGRAM_BOT_TOKEN" },
        { status: 500 }
      );
    }

    let text = "";
    let imageFile: File | null = null;

    if (isMultipartRequest(req)) {
      const formData = await req.formData();
      text = String(formData.get("text") ?? "").trim();

      const file = formData.get("image");
      if (file instanceof File && file.size > 0) {
        imageFile = file;
      }
    } else {
      const body = await req.json();
      text = String(body.text ?? "").trim();
    }

    if (!text && !imageFile) {
      return NextResponse.json(
        { success: false, message: "Пустое сообщение" },
        { status: 400 }
      );
    }

    console.log("TELEGRAM DEBUG:", {
      chatId,
      hasToken: Boolean(botToken),
      userId: user.id,
      userEmail: user.email,
      hasImage: Boolean(imageFile),
      imageName: imageFile?.name ?? null,
      imageSize: imageFile?.size ?? null,
    });

    if (imageFile) {
      const telegramForm = new FormData();
      telegramForm.append("chat_id", chatId);
      telegramForm.append("photo", imageFile, imageFile.name);

      if (text) {
        telegramForm.append("caption", text);
      }

      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/sendPhoto`,
        {
          method: "POST",
          body: telegramForm,
        }
      );

      const telegramData = await telegramResponse.json();

      console.log("TELEGRAM PHOTO RESPONSE:", telegramData);

      if (!telegramResponse.ok || !telegramData.ok) {
        const telegramDescription =
          telegramData?.description || "Неизвестная ошибка Telegram";

        return NextResponse.json(
          {
            success: false,
            message: `Ошибка Telegram: ${telegramDescription}`,
            telegram: telegramData,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Фото отправлено в Telegram",
      });
    }

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      }
    );

    const telegramData = await telegramResponse.json();

    console.log("TELEGRAM RESPONSE:", telegramData);

    if (!telegramResponse.ok || !telegramData.ok) {
      const telegramDescription =
        telegramData?.description || "Неизвестная ошибка Telegram";

      return NextResponse.json(
        {
          success: false,
          message: `Ошибка Telegram: ${telegramDescription}`,
          telegram: telegramData,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Сообщение отправлено",
    });
  } catch (error) {
    console.error("TELEGRAM SEND ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Ошибка сервера",
      },
      { status: 500 }
    );
  }
}