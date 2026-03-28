import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

type DbUser = {
  id: number;
  email: string;
  phone: string;
  role: string;
  permissions: unknown;
};

const allowedStatuses = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

type AllowedStatus = (typeof allowedStatuses)[number];

function getYearSuffix() {
  return new Date().getFullYear().toString().slice(-2);
}

async function generateOrderNumber() {
  const yearSuffix = getYearSuffix();
  const prefix = `Ord-${yearSuffix}-`;

  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  let nextSequence = 1;

  if (lastOrder?.orderNumber) {
    const lastPart = lastOrder.orderNumber.split("-")[2];
    const lastSequence = Number(lastPart);

    if (!Number.isNaN(lastSequence)) {
      nextSequence = lastSequence + 1;
    }
  }

  const paddedSequence = String(nextSequence).padStart(4, "0");
  return `${prefix}${paddedSequence}`;
}

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

  const bodyUserId = Number(body?.userId ?? body?.ownerId ?? body?.currentUserId);
  if (bodyUserId) {
    return await getUserById(bodyUserId);
  }

  const { searchParams } = new URL(req.url);
  const queryUserId = Number(
    searchParams.get("userId") ??
      searchParams.get("ownerId") ??
      searchParams.get("currentUserId")
  );

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

function normalizeComment(value: unknown) {
  const comment = String(value ?? "").trim();
  return comment.length > 0 ? comment : null;
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
      user.role === "owner" || hasPermission(user, "manage_orders");

    const orders = await prisma.order.findMany({
      where: canViewAll ? {} : { userId: Number(user.id) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        employee: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("GET ORDER ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Ошибка загрузки заявок" },
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

    const canCreate =
      user.role === "owner" ||
      user.role === "client" ||
      hasPermission(user, "manage_orders");

    if (!canCreate) {
      return NextResponse.json(
        { success: false, message: "Нет прав на создание заявки" },
        { status: 403 }
      );
    }

    const giveCurrency = normalizeCurrency(body.giveCurrency);
    const receiveCurrency = normalizeCurrency(body.receiveCurrency);
    const giveAmount = Number(body.giveAmount);

    if (
      !giveCurrency ||
      !receiveCurrency ||
      !Number.isFinite(giveAmount) ||
      giveAmount <= 0
    ) {
      return NextResponse.json(
        { success: false, message: "Некорректные данные заявки" },
        { status: 400 }
      );
    }

    if (giveCurrency === receiveCurrency) {
      return NextResponse.json(
        { success: false, message: "Валюты заявки должны отличаться" },
        { status: 400 }
      );
    }

    const rateRecord = await prisma.exchangeRate.findFirst({
      where: {
        giveCurrency,
        receiveCurrency,
        isActive: true,
      },
    });

    const rate = rateRecord ? Number(rateRecord.rate) : Number(body.rate);
    const feePercent = rateRecord
      ? Number(rateRecord.feePercent ?? 0)
      : Number(body.feePercent ?? 0);

    if (!Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json(
        { success: false, message: "Не найден активный курс для направления" },
        { status: 404 }
      );
    }

    if (!Number.isFinite(feePercent) || feePercent < 0) {
      return NextResponse.json(
        { success: false, message: "Некорректная комиссия" },
        { status: 400 }
      );
    }

    const receiveAmount = giveAmount * rate * (1 - feePercent / 100);
    const orderNumber = await generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: Number(user.id),
        giveCurrency,
        receiveCurrency,
        giveAmount,
        receiveAmount,
        rate,
        feePercent,
        status: "PENDING",
        comment: normalizeComment(body.comment),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        employee: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("POST ORDER ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Ошибка создания заявки" },
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

    const orderId = Number(body.orderId || body.id);

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Не передан id заявки" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Заявка не найдена" },
        { status: 404 }
      );
    }

    const isOwner = user.role === "owner";
    const isOwn = order.userId === Number(user.id);
    const canManageOrders = hasPermission(user, "manage_orders");
    const canChangeStatus = isOwner || hasPermission(user, "change_status");

    const canEdit = isOwner || isOwn || canManageOrders;

    if (!canEdit) {
      return NextResponse.json(
        { success: false, message: "Нет прав на редактирование" },
        { status: 403 }
      );
    }

    let nextStatus: AllowedStatus = order.status as AllowedStatus;

    if (body.status !== undefined) {
      const normalizedStatus = String(body.status).toUpperCase();

      if (!allowedStatuses.includes(normalizedStatus as AllowedStatus)) {
        return NextResponse.json(
          { success: false, message: "Некорректный статус" },
          { status: 400 }
        );
      }

      if (normalizedStatus !== order.status && !canChangeStatus) {
        return NextResponse.json(
          { success: false, message: "Нет прав на изменение статуса" },
          { status: 403 }
        );
      }

      nextStatus = normalizedStatus as AllowedStatus;
    }

    let nextGiveCurrency = order.giveCurrency;
    let nextReceiveCurrency = order.receiveCurrency;
    let nextGiveAmount = order.giveAmount;
    let nextRate = order.rate;
    let nextFeePercent = order.feePercent;
    let nextEmployeeId = order.employeeId;

    if (
      user.role === "employee" &&
      order.employeeId &&
      order.employeeId !== Number(user.id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Эта заявка уже взята другим сотрудником",
        },
        { status: 403 }
      );
    }

    if (body.giveCurrency !== undefined) {
      nextGiveCurrency = normalizeCurrency(body.giveCurrency);
    }

    if (body.receiveCurrency !== undefined) {
      nextReceiveCurrency = normalizeCurrency(body.receiveCurrency);
    }

    if (nextGiveCurrency === nextReceiveCurrency) {
      return NextResponse.json(
        { success: false, message: "Валюты заявки должны отличаться" },
        { status: 400 }
      );
    }

    if (body.giveAmount !== undefined) {
      const parsedGiveAmount = Number(body.giveAmount);

      if (!Number.isFinite(parsedGiveAmount) || parsedGiveAmount <= 0) {
        return NextResponse.json(
          { success: false, message: "Некорректная сумма заявки" },
          { status: 400 }
        );
      }

      nextGiveAmount = parsedGiveAmount;
    }

    if (body.rate !== undefined) {
      const parsedRate = Number(body.rate);

      if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
        return NextResponse.json(
          { success: false, message: "Некорректный курс" },
          { status: 400 }
        );
      }

      nextRate = parsedRate;
    }

    if (body.feePercent !== undefined) {
      const parsedFeePercent = Number(body.feePercent);

      if (!Number.isFinite(parsedFeePercent) || parsedFeePercent < 0) {
        return NextResponse.json(
          { success: false, message: "Некорректная комиссия" },
          { status: 400 }
        );
      }

      nextFeePercent = parsedFeePercent;
    }

    const takeInWork = Boolean(body.takeInWork);

    if (takeInWork) {
      if (user.role !== "employee" && user.role !== "owner") {
        return NextResponse.json(
          {
            success: false,
            message: "Только сотрудник или владелец может взять заявку в работу",
          },
          { status: 403 }
        );
      }

      if (
        order.employeeId &&
        order.employeeId !== Number(user.id) &&
        user.role !== "owner"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Эта заявка уже взята другим сотрудником",
          },
          { status: 403 }
        );
      }

      nextEmployeeId = Number(user.id);
      nextStatus = "IN_PROGRESS";
    }

    if (
      user.role === "employee" &&
      !nextEmployeeId &&
      nextStatus === "IN_PROGRESS"
    ) {
      nextEmployeeId = Number(user.id);
    }

    const nextReceiveAmount =
      nextGiveAmount * nextRate * (1 - nextFeePercent / 100);

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        giveCurrency: nextGiveCurrency,
        receiveCurrency: nextReceiveCurrency,
        giveAmount: nextGiveAmount,
        receiveAmount: nextReceiveAmount,
        rate: nextRate,
        feePercent: nextFeePercent,
        status: nextStatus,
        employeeId: nextEmployeeId,
        comment:
          body.comment !== undefined
            ? normalizeComment(body.comment)
            : order.comment,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        employee: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("PUT ORDER ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Ошибка обновления заявки" },
      { status: 500 }
    );
  }
}

// ===================== DELETE =====================
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const orderId = Number(searchParams.get("orderId") || searchParams.get("id"));
    const user = await resolveUser(req);

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Не передан id заявки" },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Заявка не найдена" },
        { status: 404 }
      );
    }

    const canDelete =
      user.role === "owner" || hasPermission(user, "delete_orders");

    if (!canDelete) {
      return NextResponse.json(
        { success: false, message: "Нет прав на удаление" },
        { status: 403 }
      );
    }

    await prisma.order.delete({
      where: { id: orderId },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE ORDER ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Ошибка удаления заявки" },
      { status: 500 }
    );
  }
}