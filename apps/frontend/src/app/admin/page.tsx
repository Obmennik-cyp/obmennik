"use client";

import { useEffect, useMemo, useState } from "react";

type AdminUser = {
  id: number;
  email: string;
  phone: string;
  role: string;
  permissions: string[];
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
};

type StaffUser = {
  id: number;
  email: string;
  phone: string;
  role: string;
  permissions: string[];
};

const statusLabels: Record<string, string> = {
  pending: "В ожидании",
  done: "Завершена",
  canceled: "Отменена",
};

const statusClasses: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
  done: "bg-green-500/15 text-green-300 border-green-500/20",
  canceled: "bg-red-500/15 text-red-300 border-red-500/20",
};

const permissionOptions = [
  { key: "manage_orders", label: "Просмотр всех заявок" },
  { key: "change_status", label: "Смена статусов" },
  { key: "delete_orders", label: "Удаление заявок" },
  { key: "send_messages", label: "Системные сообщения" },
  { key: "post_to_telegram", label: "Публикация в Telegram" },
  { key: "manage_rates", label: "Управление курсами" },
  { key: "manage_fees", label: "Управление комиссиями" },
  { key: "manage_staff", label: "Управление сотрудниками" },
];

export default function AdminPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);
  const [savingStaffId, setSavingStaffId] = useState<number | null>(null);
  const [deletingStaffId, setDeletingStaffId] = useState<number | null>(null);
  const [creatingStaff, setCreatingStaff] = useState(false);

  const [newEmployee, setNewEmployee] = useState({
    email: "",
    phone: "",
    password: "",
    permissions: [] as string[],
  });

  const isOwner = user?.role === "owner";

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (isOwner) return true;
    return user.permissions?.includes(permission);
  };

  const canViewOrders = hasPermission("manage_orders");
  const canChangeStatus = hasPermission("change_status");
  const canManageStaff = hasPermission("manage_staff");

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
        parsedUser.permissions?.includes("manage_orders") ||
        parsedUser.permissions?.includes("manage_staff");

      if (!isAllowed) {
        alert("Доступ запрещён");
        window.location.href = "/dashboard";
        return;
      }

      setUser(parsedUser);

      if (
        parsedUser.role === "owner" ||
        parsedUser.permissions?.includes("manage_orders")
      ) {
        loadOrders();
      } else {
        setLoading(false);
      }

      if (
        parsedUser.role === "owner" ||
        parsedUser.permissions?.includes("manage_staff")
      ) {
        loadStaff();
      }
    } catch (error) {
      console.error("ADMIN USER PARSE ERROR:", error);
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
      console.error("ADMIN LOAD ORDERS ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();

      if (data.success) {
        setStaff(data.users);
      }
    } catch (error) {
      console.error("ADMIN LOAD STAFF ERROR:", error);
    }
  };

  const handleStatusChange = (orderId: number, newStatus: string) => {
    if (!canChangeStatus) return;

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  const handleSaveStatus = async (order: Order) => {
    if (!canChangeStatus) {
      alert("У вас нет прав на изменение статуса");
      return;
    }

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
          status: order.status,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Ошибка обновления статуса");
        return;
      }

      setOrders((prev) =>
        prev.map((item) => (item.id === order.id ? data.order : item))
      );

      alert("Статус обновлён ✅");
    } catch (error) {
      console.error("ADMIN SAVE STATUS ERROR:", error);
      alert("Ошибка обновления статуса");
    } finally {
      setSavingOrderId(null);
    }
  };

  const handleExistingPermissionToggle = (
    userId: number,
    permission: string
  ) => {
    if (!canManageStaff) return;

    setStaff((prev) =>
      prev.map((item) => {
        if (item.id !== userId) return item;

        const hasCurrentPermission = item.permissions.includes(permission);

        return {
          ...item,
          permissions: hasCurrentPermission
            ? item.permissions.filter((p) => p !== permission)
            : [...item.permissions, permission],
        };
      })
    );
  };

  const handleSaveStaffPermissions = async (staffUser: StaffUser) => {
    if (!canManageStaff) {
      alert("У вас нет прав на управление сотрудниками");
      return;
    }

    try {
      setSavingStaffId(staffUser.id);

      const res = await fetch("/api/staff", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: staffUser.id,
          permissions: staffUser.permissions,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Ошибка сохранения прав");
        return;
      }

      setStaff((prev) =>
        prev.map((item) => (item.id === staffUser.id ? data.user : item))
      );

      alert("Права сотрудника обновлены ✅");
    } catch (error) {
      console.error("SAVE STAFF PERMISSIONS ERROR:", error);
      alert("Ошибка сохранения прав");
    } finally {
      setSavingStaffId(null);
    }
  };

  const handleDeleteStaff = async (userId: number) => {
    if (!canManageStaff) {
      alert("У вас нет прав на управление сотрудниками");
      return;
    }

    try {
      const confirmed = window.confirm("Удалить сотрудника?");
      if (!confirmed) return;

      setDeletingStaffId(userId);

      const res = await fetch(`/api/staff?userId=${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Ошибка удаления сотрудника");
        return;
      }

      setStaff((prev) => prev.filter((item) => item.id !== userId));
      alert("Сотрудник удалён ✅");
    } catch (error) {
      console.error("DELETE STAFF ERROR:", error);
      alert("Ошибка удаления сотрудника");
    } finally {
      setDeletingStaffId(null);
    }
  };

  const handleNewPermissionToggle = (permission: string) => {
    if (!canManageStaff) return;

    setNewEmployee((prev) => {
      const hasCurrentPermission = prev.permissions.includes(permission);

      return {
        ...prev,
        permissions: hasCurrentPermission
          ? prev.permissions.filter((p) => p !== permission)
          : [...prev.permissions, permission],
      };
    });
  };

  const handleCreateEmployee = async () => {
    if (!canManageStaff) {
      alert("У вас нет прав на управление сотрудниками");
      return;
    }

    try {
      if (!newEmployee.email || !newEmployee.phone || !newEmployee.password) {
        alert("Заполни email, телефон и пароль");
        return;
      }

      setCreatingStaff(true);

      const res = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newEmployee),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Ошибка создания сотрудника");
        return;
      }

      setStaff((prev) => [...prev, data.user]);

      setNewEmployee({
        email: "",
        phone: "",
        password: "",
        permissions: [],
      });

      alert("Сотрудник создан ✅");
    } catch (error) {
      console.error("CREATE STAFF ERROR:", error);
      alert("Ошибка создания сотрудника");
    } finally {
      setCreatingStaff(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) =>
      order.orderNumber.toLowerCase().includes(search.toLowerCase())
    );
  }, [orders, search]);

  return (
    <main className="min-h-screen bg-[#020b22] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-5xl font-bold">Админка</h1>
            <p className="mt-2 text-white/60">
              Управление заявками, сотрудниками и правами доступа
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/rates"
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-lg font-medium transition hover:bg-white/10"
            >
              Курсы и комиссии
            </a>

            <a
              href="/dashboard"
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-lg font-medium transition hover:bg-white/10"
            >
              Назад в кабинет
            </a>
          </div>
        </div>

        {user && (
          <div className="mb-8 rounded-3xl border border-white/10 bg-[#0b1628] p-8">
            <h2 className="mb-4 text-2xl font-semibold">
              Текущий администратор
            </h2>

            <div className="space-y-2 text-white/85">
              <p>
                Email: <span className="font-medium">{user.email}</span>
              </p>
              <p>
                Телефон: <span className="font-medium">{user.phone}</span>
              </p>
              <p>
                Роль:{" "}
                <span className="font-medium">
                  {isOwner ? "Владелец" : "Работник"}
                </span>
              </p>
            </div>
          </div>
        )}

        {canViewOrders && (
          <div className="mb-8 rounded-3xl border border-white/10 bg-[#0b1628] p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-3xl font-semibold">Все заявки</h2>

              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
                Всего: {filteredOrders.length}
              </div>
            </div>

            <input
              type="text"
              placeholder="Поиск по номеру заявки..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-6 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
            />

            {loading ? (
              <p className="text-white/60">Загрузка заявок...</p>
            ) : filteredOrders.length === 0 ? (
              <p className="text-white/60">Заявок пока нет</p>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-white/10 bg-[#101c31] p-5"
                  >
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-medium">
                          {order.giveCurrency} → {order.receiveCurrency}
                        </p>
                        <p className="mt-1 text-sm text-white/50">
                          Пользователь ID: {order.userId}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">
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
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="mb-1 text-sm text-white/50">Даю</p>
                        <p className="font-medium">
                          {order.giveAmount} {order.giveCurrency}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="mb-1 text-sm text-white/50">Получаю</p>
                        <p className="font-medium">
                          {order.receiveAmount} {order.receiveCurrency}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="mb-1 text-sm text-white/50">Курс</p>
                        <p className="font-medium">
                          1 {order.giveCurrency} = {order.rate}{" "}
                          {order.receiveCurrency}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="mb-1 text-sm text-white/50">Комиссия</p>
                        <p className="font-medium">{order.feePercent}%</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-end gap-4">
                      <div>
                        <label className="mb-2 block text-sm text-white/50">
                          Статус заявки
                        </label>

                        <select
                          value={order.status}
                          disabled={!canChangeStatus}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value)
                          }
                          className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none disabled:opacity-50"
                        >
                          <option value="pending" className="bg-[#101c31]">
                            В ожидании
                          </option>
                          <option value="done" className="bg-[#101c31]">
                            Завершена
                          </option>
                          <option value="canceled" className="bg-[#101c31]">
                            Отменена
                          </option>
                        </select>
                      </div>

                      {canChangeStatus && (
                        <button
                          onClick={() => handleSaveStatus(order)}
                          disabled={savingOrderId === order.id}
                          className="rounded-xl bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          {savingOrderId === order.id
                            ? "Сохранение..."
                            : "Сохранить статус"}
                        </button>
                      )}
                    </div>

                    <p className="mt-4 text-sm text-white/50">
                      Создана:{" "}
                      {new Date(order.createdAt).toLocaleString("ru-RU")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {canManageStaff && (
          <>
            <div className="mb-8 rounded-3xl border border-white/10 bg-[#0b1628] p-8">
              <h2 className="mb-6 text-3xl font-semibold">
                Добавить сотрудника
              </h2>

              <div className="grid gap-4 md:grid-cols-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={newEmployee.email}
                  onChange={(e) =>
                    setNewEmployee((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
                />

                <input
                  type="text"
                  placeholder="Телефон"
                  value={newEmployee.phone}
                  onChange={(e) =>
                    setNewEmployee((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
                />

                <input
                  type="password"
                  placeholder="Пароль"
                  value={newEmployee.password}
                  onChange={(e) =>
                    setNewEmployee((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
                />
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {permissionOptions.map((permission) => (
                  <label
                    key={permission.key}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <input
                      type="checkbox"
                      checked={newEmployee.permissions.includes(permission.key)}
                      onChange={() => handleNewPermissionToggle(permission.key)}
                    />
                    <span>{permission.label}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={handleCreateEmployee}
                disabled={creatingStaff}
                className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingStaff ? "Создание..." : "Создать сотрудника"}
              </button>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0b1628] p-8">
              <h2 className="mb-6 text-3xl font-semibold">Список сотрудников</h2>

              {staff.length === 0 ? (
                <p className="text-white/60">Сотрудников пока нет</p>
              ) : (
                <div className="space-y-6">
                  {staff.map((staffUser) => (
                    <div
                      key={staffUser.id}
                      className="rounded-2xl border border-white/10 bg-[#101c31] p-6"
                    >
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-medium">{staffUser.email}</p>
                          <p className="mt-1 text-white/60">{staffUser.phone}</p>
                          <p className="mt-1 text-sm text-white/50">
                            Роль:{" "}
                            {staffUser.role === "owner" ? "Владелец" : "Работник"}
                          </p>
                        </div>

                        {staffUser.role !== "owner" && (
                          <button
                            onClick={() => handleDeleteStaff(staffUser.id)}
                            disabled={deletingStaffId === staffUser.id}
                            className="rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                          >
                            {deletingStaffId === staffUser.id
                              ? "Удаление..."
                              : "Удалить"}
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {permissionOptions.map((permission) => (
                          <label
                            key={permission.key}
                            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                              staffUser.role === "owner"
                                ? "border-white/10 bg-white/5 opacity-60"
                                : "border-white/10 bg-white/5"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={staffUser.permissions.includes(
                                permission.key
                              )}
                              disabled={staffUser.role === "owner"}
                              onChange={() =>
                                handleExistingPermissionToggle(
                                  staffUser.id,
                                  permission.key
                                )
                              }
                            />
                            <span>{permission.label}</span>
                          </label>
                        ))}
                      </div>

                      {staffUser.role !== "owner" && (
                        <button
                          onClick={() => handleSaveStaffPermissions(staffUser)}
                          disabled={savingStaffId === staffUser.id}
                          className="mt-6 rounded-2xl bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          {savingStaffId === staffUser.id
                            ? "Сохранение..."
                            : "Сохранить права"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}