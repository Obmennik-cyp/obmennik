"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "../../../lib/use-auth-guard";

type User = {
  id: number;
  email: string;
  phone: string;
  role: string;
  permissions: string[];
};

const availablePermissions = [
  { key: "manage_orders", label: "Управление заявками" },
  { key: "change_status", label: "Изменение статусов" },
  { key: "delete_orders", label: "Удаление заявок" },
  { key: "send_messages", label: "Отправка сообщений" },
  { key: "post_to_telegram", label: "Публикация в Telegram" },
  { key: "manage_rates", label: "Управление курсами" },
  { key: "manage_fees", label: "Управление комиссиями" },
  { key: "manage_staff", label: "Управление сотрудниками" },
];

export default function StaffPage() {
  const router = useRouter();
  const { user: currentUser, isChecking } = useAuthGuard({
    allowedRoles: ["owner"],
    redirectIfNoUser: "/login",
    redirectIfForbidden: "/dashboard",
  });

  const [users, setUsers] = useState<User[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const [isCreating, setIsCreating] = useState(false);
  const [savePermissionsId, setSavePermissionsId] = useState<number | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const loadUsers = async (ownerId: number) => {
    try {
      const res = await fetch(`/api/staff?userId=${ownerId}`);
      const data = await res.json();

      if (data.success) {
        setUsers(data.users);
      } else {
        setMessage(data.message || "Ошибка загрузки сотрудников");
      }
    } catch (error) {
      console.error("LOAD STAFF ERROR:", error);
      setMessage("Ошибка загрузки сотрудников");
    } finally {
      setIsLoaded(true);
    }
  };

  useMemo(() => {
    if (currentUser && !isLoaded) {
      loadUsers(currentUser.id);
    }
  }, [currentUser, isLoaded]);

  const owner = useMemo(
    () => users.find((item) => item.role === "owner") ?? null,
    [users]
  );

  const employees = useMemo(
    () => users.filter((item) => item.role === "employee"),
    [users]
  );

  const toggleCreatePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((item) => item !== perm)
        : [...prev, perm]
    );
  };

  const toggleUserPermission = (userId: number, perm: string) => {
    setUsers((prev) =>
      prev.map((item) => {
        if (item.id !== userId) return item;

        const nextPermissions = item.permissions.includes(perm)
          ? item.permissions.filter((p) => p !== perm)
          : [...item.permissions, perm];

        return {
          ...item,
          permissions: nextPermissions,
        };
      })
    );
  };

  const createEmployee = async () => {
    if (!currentUser) return;

    if (!email || !phone || !password) {
      setMessage("Заполните все поля");
      return;
    }

    try {
      setIsCreating(true);
      setMessage("");

      const res = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser.id,
          email,
          phone,
          password,
          permissions: selectedPermissions,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setMessage(data.message || "Ошибка создания сотрудника");
        return;
      }

      setEmail("");
      setPhone("");
      setPassword("");
      setSelectedPermissions([]);
      setMessage("Сотрудник создан ✅");
      await loadUsers(currentUser.id);
    } catch (error) {
      console.error("CREATE EMPLOYEE ERROR:", error);
      setMessage("Ошибка создания сотрудника");
    } finally {
      setIsCreating(false);
    }
  };

  const savePermissions = async (targetUser: User) => {
    if (!currentUser) return;

    try {
      setSavePermissionsId(targetUser.id);

      const res = await fetch("/api/staff", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId: currentUser.id,
          userId: targetUser.id,
          permissions: targetUser.permissions,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Ошибка сохранения прав");
        return;
      }

      await loadUsers(currentUser.id);
      alert("Права обновлены ✅");
    } catch (error) {
      console.error("SAVE PERMISSIONS ERROR:", error);
      alert("Ошибка сохранения прав");
    } finally {
      setSavePermissionsId(null);
    }
  };

  const deleteUser = async (targetUserId: number) => {
    if (!currentUser) return;

    const confirmed = window.confirm("Удалить сотрудника?");
    if (!confirmed) return;

    try {
      setDeleteLoadingId(targetUserId);

      const res = await fetch(
        `/api/staff?userId=${targetUserId}&ownerId=${currentUser.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Ошибка удаления");
        return;
      }

      await loadUsers(currentUser.id);
    } catch (error) {
      console.error("DELETE USER ERROR:", error);
      alert("Ошибка удаления");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  if (isChecking || !isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020b22] text-white">
        <p className="text-lg text-white/70">Проверка доступа...</p>
      </main>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#020b22] p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Сотрудники</h1>
            <p className="mt-2 text-white/60">
              Создание работников и управление их правами доступа
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium backdrop-blur-xl transition hover:bg-white/10"
          >
            Назад в кабинет
          </button>
        </div>

        {owner && (
          <div className="mb-8 rounded-[28px] border border-yellow-500/20 bg-gradient-to-r from-[#0b1628] to-[#101c31] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="mb-3 inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-300">
              Главный аккаунт
            </div>
            <h2 className="mb-2 text-2xl font-semibold">Владелец системы</h2>
            <p className="font-medium">{owner.email}</p>
            <p className="text-sm text-gray-400">{owner.phone}</p>
          </div>
        )}

        <div className="mb-8 rounded-[28px] border border-white/10 bg-[#0b1628]/90 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <h2 className="mb-6 text-2xl font-semibold">Создать сотрудника</h2>

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/10 p-3 outline-none transition focus:border-blue-500/40"
            />

            <input
              type="tel"
              placeholder="Телефон"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/10 p-3 outline-none transition focus:border-blue-500/40"
            />

            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/10 p-3 outline-none transition focus:border-blue-500/40"
            />

            <div>
              <p className="mb-3 text-sm text-white/70">Права сотрудника</p>

              <div className="grid gap-3 md:grid-cols-2">
                {availablePermissions.map((permission) => (
                  <label
                    key={permission.key}
                    className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                      selectedPermissions.includes(permission.key)
                        ? "border-blue-500/40 bg-blue-500/10 shadow-[0_10px_30px_rgba(59,130,246,0.12)]"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.key)}
                      onChange={() => toggleCreatePermission(permission.key)}
                    />
                    <span className="text-sm">{permission.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={createEmployee}
              disabled={isCreating}
              className="rounded-2xl bg-blue-600 px-6 py-3 font-medium transition hover:bg-blue-700 disabled:opacity-60"
            >
              {isCreating ? "Создание..." : "Создать сотрудника"}
            </button>

            {message && (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#0b1628]/90 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Список работников</h2>
              <p className="mt-1 text-sm text-white/60">
                Выделены активные права и статус каждого сотрудника
              </p>
            </div>

            <div className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
              Работников: {employees.length}
            </div>
          </div>

          {employees.length === 0 ? (
            <p className="text-white/60">Работников пока нет</p>
          ) : (
            <div className="space-y-5">
              {employees.map((employee) => {
                const activePermissions = availablePermissions.filter((permission) =>
                  employee.permissions.includes(permission.key)
                );

                return (
                  <div
                    key={employee.id}
                    className="rounded-[30px] border border-white/10 bg-white/6 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.30)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-500/30 hover:bg-white/8 hover:shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
                  >
                    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="mb-3 inline-flex rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-300">
                          Работник
                        </div>

                        <p className="text-xl font-semibold tracking-tight">
                          {employee.email}
                        </p>

                        <p className="mt-1 text-sm text-gray-400">
                          {employee.phone}
                        </p>
                      </div>

                      <button
                        onClick={() => deleteUser(employee.id)}
                        disabled={deleteLoadingId === employee.id}
                        className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-medium transition hover:bg-red-600 disabled:opacity-60"
                      >
                        {deleteLoadingId === employee.id ? "Удаление..." : "Удалить"}
                      </button>
                    </div>

                    <div className="mb-5">
                      <p className="mb-2 text-sm text-white/70">Активные права</p>

                      {activePermissions.length === 0 ? (
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                          У сотрудника пока нет выданных прав
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {activePermissions.map((permission) => (
                            <span
                              key={permission.key}
                              className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-300"
                            >
                              {permission.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-3 text-sm text-white/70">Настройка прав</p>

                      <div className="grid gap-3 md:grid-cols-2">
                        {availablePermissions.map((permission) => (
                          <label
                            key={permission.key}
                            className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                              employee.permissions.includes(permission.key)
                                ? "border-green-500/30 bg-green-500/10 shadow-[0_10px_30px_rgba(34,197,94,0.10)]"
                                : "border-white/10 bg-[#0b1628] hover:bg-white/5"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={employee.permissions.includes(permission.key)}
                              onChange={() =>
                                toggleUserPermission(employee.id, permission.key)
                              }
                            />
                            <span className="text-sm">{permission.label}</span>
                          </label>
                        ))}
                      </div>

                      <div className="mt-4">
                        <button
                          onClick={() => savePermissions(employee)}
                          disabled={savePermissionsId === employee.id}
                          className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-medium transition hover:bg-green-700 disabled:opacity-60"
                        >
                          {savePermissionsId === employee.id
                            ? "Сохранение..."
                            : "Сохранить права"}
                        </button>
                      </div>
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