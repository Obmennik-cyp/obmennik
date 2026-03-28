"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LoginUser = {
  id: number;
  email: string;
  phone: string;
  role: "owner" | "employee" | "client";
  permissions: string[];
};

export default function LoginPage() {
  const router = useRouter();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!login.trim() || !password.trim()) {
      setMessage("Введите email или телефон и пароль");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("");

      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: login.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Ошибка входа");
      }

      const user: LoginUser = {
        id: Number(data.user.id),
        email: data.user.email,
        phone: data.user.phone,
        role: data.user.role,
        permissions: Array.isArray(data.user.permissions)
          ? data.user.permissions
          : [],
      };

      localStorage.setItem("user", JSON.stringify(user));

      if (user.role === "owner" || user.role === "employee") {
        router.push("/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("LOGIN PAGE ERROR:", error);
      setMessage(error instanceof Error ? error.message : "Ошибка входа");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020b22] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/10 bg-[#0b1628]/90 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:grid-cols-2">
          <div className="hidden flex-col justify-between border-r border-white/10 bg-gradient-to-br from-blue-600/20 to-cyan-500/10 p-10 lg:flex">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-sm text-blue-300">
                Вход в систему
              </div>

              <h1 className="text-4xl font-bold leading-tight">
                Добро пожаловать
                <span className="mt-2 block text-blue-300">обратно в обменник</span>
              </h1>

              <p className="mt-6 max-w-md text-base leading-7 text-white/70">
                Войдите в личный кабинет, чтобы создавать заявки, следить за
                статусами обменов и управлять системой.
              </p>
            </div>

            <div className="space-y-3 text-sm text-white/65">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Быстрый доступ к заявкам
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Управление курсами и сотрудниками
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Безопасная работа через кабинет
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">Вход</h2>
                <p className="mt-2 text-sm text-white/60">
                  Используйте email или телефон и пароль
                </p>
              </div>

              <Link
                href="/"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
              >
                На главную
              </Link>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Email или телефон
                </label>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Введите email или телефон"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-500/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Пароль
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-500/40"
                />
              </div>

              {message && (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-blue-600 px-6 py-3 text-base font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Вход..." : "Войти"}
              </button>
            </form>

            <div className="mt-6 text-sm text-white/60">
              Нет аккаунта?{" "}
              <Link
                href="/register"
                className="font-medium text-blue-300 transition hover:text-blue-200"
              >
                Зарегистрироваться
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}