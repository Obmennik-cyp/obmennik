import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

type DbUser = {
  id: number;
  email: string;
  phone: string;
  role: string;
  permissions: unknown;
};

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

  return await prisma.user.findUnique({
    where: { id: userId },
  });
}

async function getTrustedUserFromHeader(req: Request) {
  const headerUser = getUserFromHeaders(req);

  if (!headerUser) return null;

  const headerUserId = Number(headerUser.id);

  if (!headerUserId || Number.isNaN(headerUserId)) {
    return null;
  }

  return await getUserById(headerUserId);
}

async function resolveUser(req: Request, body?: any) {
  const trustedHeaderUser = await getTrustedUserFromHeader(req);
  if (trustedHeaderUser) return trustedHeaderUser;

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

function normalizeCurrency(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function sanitizeRate(item: {
  id: number;
  giveCurrency: string;
  receiveCurrency: string;
  rate: number;
  feePercent: number;
  isActive: boolean;
}) {
  return {
    id: item.id,
    giveCurrency: item.giveCurrency,
    receiveCurrency: item.receiveCurrency,
    fromCurrency: item.giveCurrency,
    toCurrency: item.receiveCurrency,
    rate: item.rate,
    feePercent: item.feePercent,
    isActive: item.isActive,
  };
}

// ===================== GET =====================
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
      hasPermission(user, "manage_fees") ||
      hasPermission(user, "rates.view");

    const rates = await prisma.exchangeRate.findMany({
      where: canViewAll ? {} : { isActive: true },
      orderBy: [
        { giveCurrency: "asc" },
        { receiveCurrency: "asc" },
      ],
    });

    return NextResponse.json({
      success: true,
      rates: rates.map(sanitizeRate),
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

    const giveCurrency = normalizeCurrency(
      body.giveCurrency ?? body.fromCurrency
    );
    const receiveCurrency = normalizeCurrency(
      body.receiveCurrency ?? body.toCurrency
    );
    const rate = Number(body.rate);
    const feePercent = Number(body.feePercent ?? 0);
    const isActive = body.isActive ?? true;

    if (!giveCurrency || !receiveCurrency) {
      return NextResponse.json(
        {
          success: false,
          message: "Не выбраны валюты",
        },
        { status: 400 }
      );
    }

    if (giveCurrency === receiveCurrency) {
      return NextResponse.json(
        {
          success: false,
          message: "Валюты направления должны отличаться",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Некорректный курс",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(feePercent) || feePercent < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Некорректная комиссия",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.exchangeRate.findFirst({
      where: {
        giveCurrency,
        receiveCurrency,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Такой курс уже существует",
        },
        { status: 409 }
      );
    }

    const createdRate = await prisma.exchangeRate.create({
      data: {
        giveCurrency,
        receiveCurrency,
        rate,
        feePercent,
        isActive: Boolean(isActive),
      },
    });

    return NextResponse.json({
      success: true,
      rate: sanitizeRate(createdRate),
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

    const rateId = Number(body.id);

    if (!rateId) {
      return NextResponse.json(
        {
          success: false,
          message: "Не передан id курса",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.exchangeRate.findUnique({
      where: { id: rateId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Курс не найден" },
        { status: 404 }
      );
    }

    const canManageRates =
      user.role === "owner" || hasPermission(user, "manage_rates");

    const canManageFees =
      user.role === "owner" || hasPermission(user, "manage_fees");

    if (!canManageRates && !canManageFees) {
      return NextResponse.json(
        { success: false, message: "Нет прав на изменение курса" },
        { status: 403 }
      );
    }

    let nextGiveCurrency = existing.giveCurrency;
    let nextReceiveCurrency = existing.receiveCurrency;
    let nextRate = existing.rate;
    let nextFeePercent = existing.feePercent;
    let nextIsActive = existing.isActive;

    if (canManageRates) {
      const incomingGiveCurrency = normalizeCurrency(
        body.giveCurrency ?? body.fromCurrency ?? existing.giveCurrency
      );
      const incomingReceiveCurrency = normalizeCurrency(
        body.receiveCurrency ?? body.toCurrency ?? existing.receiveCurrency
      );
      const incomingRate = Number(body.rate);
      const incomingIsActive =
        body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive;

      if (!incomingGiveCurrency || !incomingReceiveCurrency) {
        return NextResponse.json(
          {
            success: false,
            message: "Не выбраны валюты",
          },
          { status: 400 }
        );
      }

      if (incomingGiveCurrency === incomingReceiveCurrency) {
        return NextResponse.json(
          {
            success: false,
            message: "Валюты направления должны отличаться",
          },
          { status: 400 }
        );
      }

      if (!Number.isFinite(incomingRate) || incomingRate <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Некорректный курс",
          },
          { status: 400 }
        );
      }

      const duplicate = await prisma.exchangeRate.findFirst({
        where: {
          giveCurrency: incomingGiveCurrency,
          receiveCurrency: incomingReceiveCurrency,
          NOT: {
            id: rateId,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message: "Такой курс уже существует",
          },
          { status: 409 }
        );
      }

      nextGiveCurrency = incomingGiveCurrency;
      nextReceiveCurrency = incomingReceiveCurrency;
      nextRate = incomingRate;
      nextIsActive = incomingIsActive;
    }

    if (canManageFees && body.feePercent !== undefined) {
      const incomingFeePercent = Number(body.feePercent);

      if (!Number.isFinite(incomingFeePercent) || incomingFeePercent < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Некорректная комиссия",
          },
          { status: 400 }
        );
      }

      nextFeePercent = incomingFeePercent;
    }

    const updatedRate = await prisma.exchangeRate.update({
      where: { id: rateId },
      data: {
        giveCurrency: nextGiveCurrency,
        receiveCurrency: nextReceiveCurrency,
        rate: nextRate,
        feePercent: nextFeePercent,
        isActive: nextIsActive,
      },
    });

    return NextResponse.json({
      success: true,
      rate: sanitizeRate(updatedRate),
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

    const existing = await prisma.exchangeRate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Курс не найден" },
        { status: 404 }
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