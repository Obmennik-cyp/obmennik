"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RegisterUser = {
  id: number;
  email: string;
  phone: string;
  role: "owner" | "employee" | "client";
  permissions: string[];
};

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email.trim() || !phone.trim() || !password.trim()) {
      setMessage("Заполните все обязательные поля");
      return;
    }

    if (password.length < 6) {
      setMessage("Пароль должен содержать минимум 6 символов");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Пароли не совпадают");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("");

      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          phone: phone.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Ошибка регистрации");
      }

      const user: RegisterUser = {
        id: Number(data.user.id),
        email: data.user.email,
        phone: data.user.phone,
        role: data.user.role,
        permissions: Array.isArray(data.user.permissions)
          ? data.user.permissions
          : [],
      };

      localStorage.setItem("user", JSON.stringify(user));
      router.push("/dashboard");
    } catch (error) {
      console.error("REGISTER PAGE ERROR:", error);
      setMessage(
        error instanceof Error ? error.message : "Ошибка регистрации"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020b22] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/10 bg-[#0b1628]/90 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:grid-cols-2">
          <div className="hidden flex-col justify-between border-r border-white/10 bg-gradient-to-br from-green-600/20 to-blue-500/10 p-10 lg:flex">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-green-400/20 bg-green-400/10 px-4 py-2 text-sm text-green-300">
                Регистрация
              </div>

              <h1 className="text-4xl font-bold leading-tight">
                Создайте аккаунт
                <span className="mt-2 block text-green-300">
                  и начните работу
                </span>
              </h1>

              <p className="mt-6 max-w-md text-base leading-7 text-white/70">
                После регистрации вы сможете создавать заявки, отслеживать их
                статусы и работать с обменами через личный кабинет.
              </p>
            </div>

            <div className="space-y-3 text-sm text-white/65">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Быстрое создание заявок
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                История операций в кабинете
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Безопасный доступ к сервису
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">Регистрация</h2>
                <p className="mt-2 text-sm text-white/60">
                  Создайте клиентский аккаунт
                </p>
              </div>

              <Link
                href="/"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
              >
                На главную
              </Link>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Введите email"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-green-500/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Введите телефон"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-green-500/40"
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
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-green-500/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Повторите пароль
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите пароль"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-green-500/40"
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
                className="w-full rounded-2xl bg-green-600 px-6 py-3 text-base font-medium transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Регистрация..." : "Зарегистрироваться"}
              </button>
            </form>

            <div className="mt-6 text-sm text-white/60">
              Уже есть аккаунт?{" "}
              <Link
                href="/login"
                className="font-medium text-green-300 transition hover:text-green-200"
              >
                Войти
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}