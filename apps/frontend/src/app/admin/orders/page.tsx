"use client";

import { useEffect, useMemo, useState } from "react";

type AdminUser = {
  id: number;
  email: string;
  phone: string;
  role: string;
  permissions: string[];
};

type OrderUser = {
  id: number;
  email: string;
  phone: string;
  role: string;
};

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
  status: string;
  createdAt: string;
  user?: OrderUser;
};

const statusLabels: Record<string, string> = {
  pending: "В ожидании",
  processing: "В работе",
  done: "Завершено",
  canceled: "Отменено",
};

const statusClasses: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
  processing: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  done: "bg-green-500/15 text-green-300 border-green-500/20",
  canceled: "bg-red-500/15 text-red-300 border-red-500/20",
};

export default function AdminOrdersPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === "owner") return true;
    return user.permissions?.includes(permission);
  };

  const canViewOrders = hasPermission("manage_orders");
  const canChangeStatus = hasPermission("change_status");

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const parsedUser: AdminUser = JSON.parse(savedUser);

      const isAllowed =
        parsedUser.role === "owner" ||
        parsedUser.permissions?.includes("manage_orders");

      if (!isAllowed) {
        alert("Нет доступа к заявкам");
        window.location.href = "/admin";
        return;
      }

      setUser(parsedUser);
      loadOrders();
    } catch (error) {
      console.error("ADMIN ORDERS USER PARSE ERROR:", error);
      window.location.href = "/login";
    }
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/order?all=true");
      const data = await res.json();

      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error("LOAD ALL ORDERS ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatusLocally = (orderId: number, status: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status } : order
      )
    );
  };

  const saveOrderStatus = async (order: Order, nextStatus?: string) => {
    if (!canChangeStatus) {
      alert("У вас нет прав на изменение статуса");
      return;
    }

    const statusToSave = nextStatus ?? order.status;

    try {
      setSavingOrderId(order.id);

      const res = await fetch("/api/order", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.id,
          giveCurrency: order.giveCurrency,
          receiveCurrency: order.receiveCurrency,
          giveAmount: order.giveAmount,
          receiveAmount: order.receiveAmount,
          rate: order.rate,
          feePercent: order.feePercent,
          status: statusToSave,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Ошибка сохранения статуса");
        return;
      }

      setOrders((prev) =>
        prev.map((item) => (item.id === order.id ? data.order : item))
      );

      alert("Статус обновлён ✅");
    } catch (error) {
      console.error("SAVE ORDER STATUS ERROR:", error);
      alert("Ошибка сохранения статуса");
    } finally {
      setSavingOrderId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const query = search.toLowerCase();

      const matchesSearch =
        order.orderNumber.toLowerCase().includes(query) ||
        order.user?.email?.toLowerCase().includes(query) ||
        order.giveCurrency.toLowerCase().includes(query) ||
        order.receiveCurrency.toLowerCase().includes(query);

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
              placeholder="Поиск по номеру, email или валютам..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
            >
              <option value="all" className="bg-[#101c31]">
                Все статусы
              </option>
              <option value="pending" className="bg-[#101c31]">
                В ожидании
              </option>
              <option value="processing" className="bg-[#101c31]">
                В работе
              </option>
              <option value="done" className="bg-[#101c31]">
                Завершено
              </option>
              <option value="canceled" className="bg-[#101c31]">
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
              {filteredOrders.map((order) => (
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
                        Создана:{" "}
                        {new Date(order.createdAt).toLocaleString("ru-RU")}
                      </p>
                    </div>

                    <div className="min-w-[220px] space-y-2">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-white/50">Даю</span>
                          <span>
                            {order.giveAmount} {order.giveCurrency}
                          </span>
                        </div>

                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-white/50">Получаю</span>
                          <span>
                            {order.receiveAmount} {order.receiveCurrency}
                          </span>
                        </div>

                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-white/50">Курс</span>
                          <span>
                            1 {order.giveCurrency} = {order.rate}{" "}
                            {order.receiveCurrency}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-white/50">Комиссия</span>
                          <span>{order.feePercent}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="mb-2 block text-sm text-white/50">
                        Статус заявки
                      </label>

                      <select
                        value={order.status}
                        disabled={!canChangeStatus}
                        onChange={(e) =>
                          updateOrderStatusLocally(order.id, e.target.value)
                        }
                        className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none disabled:opacity-50"
                      >
                        <option value="pending" className="bg-[#101c31]">
                          В ожидании
                        </option>
                        <option value="processing" className="bg-[#101c31]">
                          В работе
                        </option>
                        <option value="done" className="bg-[#101c31]">
                          Завершено
                        </option>
                        <option value="canceled" className="bg-[#101c31]">
                          Отменено
                        </option>
                      </select>
                    </div>

                    {canChangeStatus && (
                      <>
                        <button
                          onClick={() => saveOrderStatus(order, "processing")}
                          disabled={savingOrderId === order.id}
                          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          Взять в работу
                        </button>

                        <button
                          onClick={() => saveOrderStatus(order, "done")}
                          disabled={savingOrderId === order.id}
                          className="rounded-xl bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          Завершить
                        </button>

                        <button
                          onClick={() => saveOrderStatus(order, "canceled")}
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
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}