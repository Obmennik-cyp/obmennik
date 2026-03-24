import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const all = searchParams.get("all");

    let orders;

    if (all === "true") {
      orders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
      });
    } else {
      if (!userId) {
        return NextResponse.json(
          { success: false, message: "Не передан userId" },
          { status: 400 }
        );
      }

      orders = await prisma.order.findMany({
        where: { userId: Number(userId) },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("GET ORDER ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Ошибка загрузки заявок" },
      { status: 500 }
    );
  }
}
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const orderNumber = await generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: body.userId,
        giveCurrency: body.giveCurrency,
        receiveCurrency: body.receiveCurrency,
        giveAmount: Number(body.giveAmount),
        receiveAmount: Number(body.receiveAmount),
        rate: Number(body.rate),
        feePercent: Number(body.feePercent),
        status: body.status ?? "pending",
      },
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("POST ORDER ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Ошибка создания заявки" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (!body.orderId) {
      return NextResponse.json(
        { success: false, message: "Не передан orderId" },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: Number(body.orderId) },
      data: {
        giveCurrency: body.giveCurrency,
        receiveCurrency: body.receiveCurrency,
        giveAmount: Number(body.giveAmount),
        receiveAmount: Number(body.receiveAmount),
        rate: Number(body.rate),
        feePercent: Number(body.feePercent),
        status: body.status,
      },
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("PUT ORDER ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Ошибка обновления заявки" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = Number(searchParams.get("orderId"));

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Не передан orderId" },
        { status: 400 }
      );
    }

    await prisma.order.delete({
      where: { id: orderId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE ORDER ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Ошибка удаления заявки" },
      { status: 500 }
    );
  }
}