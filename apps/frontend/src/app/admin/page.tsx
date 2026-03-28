"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AdminUser = {
  id: number;
  email: string;
  phone: string;
  role: string;
  permissions?: string[] | string;
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

export default function AdminPage() {
  const router = useRouter();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as AdminUser;
      setUser(parsedUser);
    } catch (error) {
      console.error("ADMIN USER PARSE ERROR:", error);
      localStorage.removeItem("user");
      router.push("/login");
      return;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const permissions = useMemo(
    () => normalizePermissions(user?.permissions),
    [user]
  );

  const isOwner = user?.role === "owner";

  const canViewStaff =
    isOwner ||
    permissions.includes("employees.view") ||
    permissions.includes("manage_employees");

  const canViewRates =
    isOwner ||
    permissions.includes("rates.view") ||
    permissions.includes("manage_rates");

  const canViewOrders =
    isOwner ||
    permissions.includes("manage_orders") ||
    permissions.includes("orders.view");

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#020b22] flex items-center justify-center text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-lg">
          Загрузка админ-панели...
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (!isOwner && !canViewStaff && !canViewRates && !canViewOrders) {
    return (
      <main className="min-h-screen bg-[#020b22] flex items-center justify-center text-white px-6">
        <div className="max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-2xl font-bold">Нет доступа</h1>
          <p className="mt-3 text-white/70">
            У вас нет прав для входа в административную панель.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 font-medium transition hover:bg-blue-500"
          >
            Вернуться в кабинет
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020b22] text-white px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
              Панель управления
            </div>

            <h1 className="text-4xl font-bold md:text-5xl">Админ панель</h1>

            <p className="mt-3 max-w-2xl text-white/60">
              Управление сотрудниками, курсами, комиссиями и заявками обменника
              в одном месте.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium transition hover:bg-white/10"
            >
              Личный кабинет
            </button>

            <button
              onClick={() => router.push("/")}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium transition hover:bg-white/10"
            >
              На главную
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {canViewStaff && (
            <button
              onClick={() => router.push("/admin/staff")}
              className="group rounded-3xl border border-white/10 bg-[#0b122f] p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30 hover:shadow-2xl"
            >
              <div className="mb-4 h-12 w-12 rounded-2xl bg-blue-500/15" />
              <h2 className="text-2xl font-semibold">Сотрудники</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Создание, редактирование и управление доступами сотрудников.
              </p>
              <div className="mt-6 text-sm font-medium text-blue-300">
                Перейти в раздел →
              </div>
            </button>
          )}

          {canViewRates && (
            <button
              onClick={() => router.push("/admin/rates")}
              className="group rounded-3xl border border-white/10 bg-[#0b122f] p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-green-500/30 hover:shadow-2xl"
            >
              <div className="mb-4 h-12 w-12 rounded-2xl bg-green-500/15" />
              <h2 className="text-2xl font-semibold">Курсы и комиссии</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Настройка направлений обмена, курсов и комиссий для заявок.
              </p>
              <div className="mt-6 text-sm font-medium text-green-300">
                Перейти в раздел →
              </div>
            </button>
          )}

          {canViewOrders && (
            <button
              onClick={() => router.push("/admin/orders")}
              className="group rounded-3xl border border-white/10 bg-[#0b122f] p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/30 hover:shadow-2xl"
            >
              <div className="mb-4 h-12 w-12 rounded-2xl bg-purple-500/15" />
              <h2 className="text-2xl font-semibold">Заявки</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Просмотр, фильтрация и изменение статусов заявок клиентов.
              </p>
              <div className="mt-6 text-sm font-medium text-purple-300">
                Перейти в раздел →
              </div>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}