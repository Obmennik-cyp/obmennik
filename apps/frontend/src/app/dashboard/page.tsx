"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  email: string;
  phone: string;
};

type Order = {
  id: number;
  amount: string;
  from: string;
  to: string;
  date: string;
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      router.push("/register");
      return;
    }

    setUser(JSON.parse(storedUser));

    const storedOrders = localStorage.getItem("orders");
    if (storedOrders) {
      setOrders(JSON.parse(storedOrders));
    }
  }, [router]);

  const handleDeleteOrder = (id: number) => {
    const updatedOrders = orders.filter((order) => order.id !== id);
    setOrders(updatedOrders);
    localStorage.setItem("orders", JSON.stringify(updatedOrders));
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0f1a] text-white">
        Загрузка...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0f1a] p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold">Личный кабинет</h1>

        <div className="mb-6 rounded-3xl border border-white/10 bg-[#121821] p-6">
          <h2 className="mb-4 text-xl font-semibold">Ваши данные</h2>

          <p className="mb-2">
            <span className="text-gray-400">Email:</span> {user.email}
          </p>

          <p className="mb-2">
            <span className="text-gray-400">Телефон:</span> {user.phone}
          </p>

          <p className="mt-4 text-green-400">
            Вы успешно зарегистрированы 🎉
          </p>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-[#121821] p-6">
          <h2 className="mb-4 text-xl font-semibold">Действия</h2>

          <button
            onClick={() => router.push("/create")}
            className="rounded-xl bg-blue-600 px-5 py-3 transition-all hover:bg-blue-500"
          >
            Создать заявку
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#121821] p-6">
          <h2 className="mb-4 text-xl font-semibold">Ваши заявки</h2>

          {orders.length === 0 ? (
            <p className="text-gray-400">Пока нет заявок</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-start justify-between gap-4 rounded-xl bg-[#1a2332] p-4"
                >
                  <div>
                    <p>Сумма: {order.amount}</p>
                    <p>
                      Обмен: {order.from} → {order.to}
                    </p>
                    <p className="text-sm text-gray-400">{order.date}</p>
                  </div>

                  <button
                    onClick={() => handleDeleteOrder(order.id)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm transition-all hover:bg-red-500"
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}