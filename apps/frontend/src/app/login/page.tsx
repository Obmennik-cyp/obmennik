"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/dashboard");
      } else {
        setMessage(data.message || "Ошибка входа");
      }
    } catch (error) {
      console.error("LOGIN REQUEST ERROR:", error);
      setMessage("Ошибка сервера");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020b22] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#0b1628] border border-white/10 rounded-3xl p-8 shadow-2xl">
        <h1 className="text-white text-4xl font-bold text-center mb-8">Вход</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl bg-white/10 border border-white/10 text-white px-4 py-4 outline-none"
            required
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl bg-white/10 border border-white/10 text-white px-4 py-4 outline-none"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 transition rounded-2xl py-4 text-white font-medium disabled:opacity-50"
          >
            {loading ? "Входим..." : "Войти"}
          </button>
        </form>

        {message && (
          <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}