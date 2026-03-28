"use client";

import { useEffect, useMemo, useState } from "react";

type AdminUser = {
  id: number;
  email: string;
  phone: string;
  role: string;
  permissions: string[] | string;
};

type OrderUser = {
  id: number;
  email: string;
  phone: string;
  role: string;
};

type OrderEmployee = {
  id: number;
  email: string;
  phone: string;
  role: string;
};

type OrderStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

type Order = {
  id: number;
  orderNumber: string;
  userId: number;
  giveCurrency: string;
  receiveCurrency: string;
  giveAmount: number;
  receiveAmount: number;
  rate: number;
  feePercent: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  comment?: string | null;
  user?: OrderUser;
  employee?: OrderEmployee | null;
};

const statusLabels: Record<OrderStatus, string> = {
  PENDING: "В ожидании",
  IN_PROGRESS: "В работе",
  COMPLETED: "Завершено",
  CANCELLED: "Отменено",
};

const statusClasses: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
  IN_PROGRESS: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  COMPLETED: "bg-green-500/15 text-green-300 border-green-500/20",
  CANCELLED: "bg-red-500/15 text-red-300 border-red-500/20",
};

function normalizePermissions(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function AdminOrdersPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);

  const permissions = useMemo(
    () => normalizePermissions(user?.permissions),
    [user]
  );

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === "owner") return true;
    return permissions.includes(permission);
  };

  const canViewOrders =
    user?.role === "owner" || hasPermission("manage_orders");
  const canChangeStatus =
    user?.role === "owner" || hasPermission("change_status");

  const isOwner = user?.role === "owner";
  const isEmployee = user?.role === "employee";

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const parsedUser: AdminUser = JSON.parse(savedUser);
      const parsedPermissions = normalizePermissions(parsedUser.permissions);

      const isAllowed =
        parsedUser.role === "owner" ||
        parsedPermissions.includes("manage_orders");

      if (!isAllowed) {
        alert("Нет доступа к заявкам");
        window.location.href = "/admin";
        return;
      }

      setUser({
        ...parsedUser,
        permissions: parsedPermissions,
      });
    } catch (error) {
      console.error("ADMIN ORDERS USER PARSE ERROR:", error);
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadOrders(user);
    }
  }, [user]);

  const loadOrders = async (currentUser?: AdminUser) => {
    const authUser = currentUser ?? user;

    if (!authUser) return;

    try {
      setLoading(true);

      const res = await fetch("/api/orders", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify(authUser),
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Ошибка загрузки заявок");
      }

      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (error) {
      console.error("LOAD ALL ORDERS ERROR:", error);
      alert(
        error instanceof Error ? error.message : "Ошибка загрузки заявок"
      );
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatusLocally = (orderId: number, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status } : order
      )
    );
  };

  const saveOrderStatus = async (
    order: Order,
    nextStatus?: OrderStatus,
    takeInWork = false
  ) => {
    if (!user) return;

    if (!canChangeStatus) {
      alert("У вас нет прав на изменение статуса");
      return;
    }

    const statusToSave = nextStatus ?? order.status;

    try {
      setSavingOrderId(order.id);

      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify(user),
        },
        body: JSON.stringify({
          orderId: order.id,
          giveCurrency: order.giveCurrency,
          receiveCurrency: order.receiveCurrency,
          giveAmount: order.giveAmount,
          rate: order.rate,
          feePercent: order.feePercent,
          status: statusToSave,
          comment: order.comment ?? "",
          takeInWork,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Ошибка сохранения статуса");
      }

      setOrders((prev) =>
        prev.map((item) => (item.id === order.id ? data.order : item))
      );

      alert(takeInWork ? "Заявка взята в работу ✅" : "Статус обновлён ✅");
    } catch (error) {
      console.error("SAVE ORDER STATUS ERROR:", error);
      alert(
        error instanceof Error ? error.message : "Ошибка сохранения статуса"
      );
      loadOrders();
    } finally {
      setSavingOrderId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        query.length === 0 ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.user?.email?.toLowerCase().includes(query) ||
        order.user?.phone?.toLowerCase().includes(query) ||
        order.giveCurrency.toLowerCase().includes(query) ||
        order.receiveCurrency.toLowerCase().includes(query) ||
        order.employee?.email?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ? true : order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  if (!canViewOrders && !loading) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#020b22] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-5xl font-bold">Заявки</h1>
            <p className="mt-2 text-white/60">
              Управление всеми заявками обменника
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/admin"
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-lg font-medium transition hover:bg-white/10"
            >
              Назад в админку
            </a>

            <a
              href="/admin/rates"
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-lg font-medium transition hover:bg-white/10"
            >
              Курсы и комиссии
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0b1628] p-8">
          <div className="mb-6 grid gap-4 md:grid-cols-[1fr_220px]">
            <input
              type="text"
              placeholder="Поиск по номеру, email, телефону, сотруднику или валютам..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | OrderStatus)
              }
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
            >
              <option value="all" className="bg-[#101c31]">
                Все статусы
              </option>
              <option value="PENDING" className="bg-[#101c31]">
                В ожидании
              </option>
              <option value="IN_PROGRESS" className="bg-[#101c31]">
                В работе
              </option>
              <option value="COMPLETED" className="bg-[#101c31]">
                Завершено
              </option>
              <option value="CANCELLED" className="bg-[#101c31]">
                Отменено
              </option>
            </select>
          </div>

          <div className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
            Всего заявок: {filteredOrders.length}
          </div>

          {loading ? (
            <p className="mt-6 text-white/60">Загрузка заявок...</p>
          ) : filteredOrders.length === 0 ? (
            <p className="mt-6 text-white/60">Заявок пока нет</p>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredOrders.map((order) => {
                const isTaken = Boolean(order.employee);
                const takenByCurrentEmployee =
                  isEmployee && order.employee?.id === user?.id;

                const canTakeInWork =
                  isEmployee &&
                  canChangeStatus &&
                  !isTaken &&
                  order.status === "PENDING";

                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-white/10 bg-[#101c31] p-5"
                  >
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                            № {order.orderNumber}
                          </div>

                          <div
                            className={`rounded-lg border px-3 py-1 text-xs ${
                              statusClasses[order.status] ??
                              "border-white/10 bg-white/5 text-white/60"
                            }`}
                          >
                            {statusLabels[order.status] ?? order.status}
                          </div>

                          {order.employee && (
                            <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
                              Взял: {order.employee.email}
                            </div>
                          )}
                        </div>

                        <p className="text-lg font-medium">
                          {order.giveCurrency} → {order.receiveCurrency}
                        </p>

                        <p className="mt-1 text-sm text-white/50">
                          Пользователь: {order.user?.email ?? `ID ${order.userId}`}
                        </p>

                        <p className="mt-1 text-sm text-white/50">
                          Телефон: {order.user?.phone ?? "—"}
                        </p>

                        <p className="mt-1 text-sm text-white/50">
                          Сотрудник: {order.employee?.email ?? "не назначен"}
                        </p>

                        <p className="mt-1 text-sm text-white/50">
                          Создана:{" "}
                          {new Date(order.createdAt).toLocaleString("ru-RU")}
                        </p>

                        {order.employee && (
                          <p className="mt-1 text-sm text-green-300">
                            Заявку обрабатывает сотрудник: {order.employee.email}
                          </p>
                        )}

                        {takenByCurrentEmployee && (
                          <p className="mt-1 text-sm text-blue-300">
                            Эта заявка закреплена за вами
                          </p>
                        )}
                      </div>

                      <div className="min-w-[220px] space-y-2">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-white/50">Даю</span>
                            <span>
                              {formatAmount(order.giveAmount)} {order.giveCurrency}
                            </span>
                          </div>

                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-white/50">Получаю</span>
                            <span>
                              {formatAmount(order.receiveAmount)}{" "}
                              {order.receiveCurrency}
                            </span>
                          </div>

                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-white/50">Курс</span>
                            <span>
                              1 {order.giveCurrency} = {formatAmount(order.rate)}{" "}
                              {order.receiveCurrency}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-white/50">Комиссия</span>
                            <span>{formatAmount(order.feePercent)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {order.comment && (
                      <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                        {order.comment}
                      </div>
                    )}

                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="mb-2 block text-sm text-white/50">
                          Статус заявки
                        </label>

                        <select
                          value={order.status}
                          disabled={!canChangeStatus}
                          onChange={(e) =>
                            updateOrderStatusLocally(
                              order.id,
                              e.target.value as OrderStatus
                            )
                          }
                          className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none disabled:opacity-50"
                        >
                          <option value="PENDING" className="bg-[#101c31]">
                            В ожидании
                          </option>
                          <option value="IN_PROGRESS" className="bg-[#101c31]">
                            В работе
                          </option>
                          <option value="COMPLETED" className="bg-[#101c31]">
                            Завершено
                          </option>
                          <option value="CANCELLED" className="bg-[#101c31]">
                            Отменено
                          </option>
                        </select>
                      </div>

                      {canTakeInWork && (
                        <button
                          onClick={() =>
                            saveOrderStatus(order, "IN_PROGRESS", true)
                          }
                          disabled={savingOrderId === order.id}
                          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          {savingOrderId === order.id
                            ? "Обработка..."
                            : "Взять в работу"}
                        </button>
                      )}

                      {canChangeStatus && (isOwner || takenByCurrentEmployee) && (
                        <>
                          <button
                            onClick={() => saveOrderStatus(order, "COMPLETED")}
                            disabled={savingOrderId === order.id}
                            className="rounded-xl bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                          >
                            Завершить
                          </button>

                          <button
                            onClick={() => saveOrderStatus(order, "CANCELLED")}
                            disabled={savingOrderId === order.id}
                            className="rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                          >
                            Отменить
                          </button>

                          <button
                            onClick={() => saveOrderStatus(order)}
                            disabled={savingOrderId === order.id}
                            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                          >
                            {savingOrderId === order.id
                              ? "Сохранение..."
                              : "Сохранить вручную"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}