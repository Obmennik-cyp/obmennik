"use client";

import { FormEvent, useState } from "react";

export default function CreatePage() {
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState("RUB");
  const [to, setTo] = useState("USDT");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newOrder = {
      id: Date.now(),
      amount,
      from,
      to,
      date: new Date().toLocaleString(),
    };

    const orders = JSON.parse(localStorage.getItem("orders") || "[]");
    orders.push(newOrder);
    localStorage.setItem("orders", JSON.stringify(orders));

    setSuccess(true);
    setAmount("");
  };

  return (
    <main className="min-h-screen bg-[#0b0f1a] p-8 text-white">
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-3xl font-bold">Создать заявку</h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-[#121821] p-6"
        >
          <input
            placeholder="Сумма"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl bg-[#1a2332] p-3 outline-none"
            required
          />

          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-xl bg-[#1a2332] p-3 outline-none"
          >
            <option>RUB</option>
            <option>USD</option>
            <option>USDT</option>
          </select>

          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-xl bg-[#1a2332] p-3 outline-none"
          >
            <option>USDT</option>
            <option>BTC</option>
            <option>ETH</option>
          </select>

          <button className="w-full rounded-xl bg-blue-600 py-3 transition-all hover:bg-blue-500">
            Создать
          </button>

          {success && <div className="text-green-400">Заявка создана ✅</div>}
        </form>
      </div>
    </main>
  );
}