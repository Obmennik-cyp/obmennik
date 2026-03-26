import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

function getUserFromHeaders(req: Request) {
  const header = req.headers.get("x-user");

  if (!header) {
    return null;
  }

  try {
    return JSON.parse(header);
  } catch {
    return null;
  }
}

async function getUserById(userId: number) {
  if (!userId || Number.isNaN(userId)) return null;

  return await prisma.user.findUnique({
    where: { id: userId },
  });
}

async function resolveUser(req: Request, body?: any) {
  const headerUser = getUserFromHeaders(req);
  if (headerUser) return headerUser;

  const bodyUserId = Number(body?.userId);
  if (bodyUserId) {
    return await getUserById(bodyUserId);
  }

  const { searchParams } = new URL(req.url);
  const queryUserId = Number(searchParams.get("userId"));
  if (queryUserId) {
    return await getUserById(queryUserId);
  }

  return null;
}

function hasPermission(user: any, permission: string) {
  if (!user) return false;
  if (user.role === "owner") return true;
  if (!Array.isArray(user.permissions)) return false;

  return user.permissions.includes(permission);
}

// ===================== GET =====================
// Читать могут все авторизованные пользователи.
// Для клиента/обычного пользователя отдаём только активные курсы.
// Для owner / manage_rates / rates.view — все курсы.
export async function GET(req: Request) {
  try {
    const user = await resolveUser(req);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Не авторизован" },
        { status: 401 }
      );
    }

    const canViewAll =
      user.role === "owner" ||
      hasPermission(user, "manage_rates") ||
      hasPermission(user, "rates.view");

    const rates = await prisma.exchangeRate.findMany({
      where: canViewAll ? {} : { isActive: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({
      success: true,
      rates: rates.map((item) => ({
        id: item.id,
        giveCurrency: item.giveCurrency,
        receiveCurrency: item.receiveCurrency,
        fromCurrency: item.giveCurrency,
        toCurrency: item.receiveCurrency,
        rate: item.rate,
        feePercent: item.feePercent,
        isActive: item.isActive,
      })),
    });
  } catch (error) {
    console.error("GET RATES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ошибка загрузки курсов",
      },
      { status: 500 }
    );
  }
}

// ===================== POST =====================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = await resolveUser(req, body);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const canManageRates =
      user.role === "owner" || hasPermission(user, "manage_rates");

    if (!canManageRates) {
      return NextResponse.json(
        { success: false, message: "Нет прав на создание курсов" },
        { status: 403 }
      );
    }

    const giveCurrency = body.giveCurrency || body.fromCurrency;
    const receiveCurrency = body.receiveCurrency || body.toCurrency;

    if (!giveCurrency || !receiveCurrency || !body.rate) {
      return NextResponse.json(
        {
          success: false,
          message: "Не заполнены обязательные поля",
        },
        { status: 400 }
      );
    }

    const createdRate = await prisma.exchangeRate.create({
      data: {
        giveCurrency,
        receiveCurrency,
        rate: Number(body.rate),
        feePercent: Number(body.feePercent ?? 0),
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      rate: createdRate,
    });
  } catch (error) {
    console.error("POST RATES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ошибка создания курса",
      },
      { status: 500 }
    );
  }
}

// ===================== PUT =====================
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const user = await resolveUser(req, body);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const canManageRates =
      user.role === "owner" || hasPermission(user, "manage_rates");

    const canManageFees =
      user.role === "owner" || hasPermission(user, "manage_fees");

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Не передан id курса",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.exchangeRate.findUnique({
      where: { id: Number(body.id) },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Курс не найден" },
        { status: 404 }
      );
    }

    if (!canManageRates && !canManageFees) {
      return NextResponse.json(
        { success: false, message: "Нет прав на изменение курса" },
        { status: 403 }
      );
    }

    if (!canManageRates) {
      body.rate = existing.rate;
      body.giveCurrency = existing.giveCurrency;
      body.receiveCurrency = existing.receiveCurrency;
      body.fromCurrency = existing.giveCurrency;
      body.toCurrency = existing.receiveCurrency;
    }

    if (!canManageFees) {
      body.feePercent = existing.feePercent;
    }

    const updatedRate = await prisma.exchangeRate.update({
      where: { id: Number(body.id) },
      data: {
        giveCurrency: body.giveCurrency || body.fromCurrency,
        receiveCurrency: body.receiveCurrency || body.toCurrency,
        rate: Number(body.rate),
        feePercent: Number(body.feePercent ?? 0),
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      rate: updatedRate,
    });
  } catch (error) {
    console.error("PUT RATES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ошибка обновления курса",
      },
      { status: 500 }
    );
  }
}

// ===================== DELETE =====================
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Не передан id",
        },
        { status: 400 }
      );
    }

    const user = await resolveUser(req);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const canDelete =
      user.role === "owner" || hasPermission(user, "manage_rates");

    if (!canDelete) {
      return NextResponse.json(
        { success: false, message: "Нет прав на удаление курса" },
        { status: 403 }
      );
    }

    await prisma.exchangeRate.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE RATES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ошибка удаления курса",
      },
      { status: 500 }
    );
  }
}