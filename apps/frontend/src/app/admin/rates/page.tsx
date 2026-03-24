"use client";

import { useEffect, useState } from "react";

type Rate = {
  id: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
};

export default function AdminRatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fromCurrency: "",
    toCurrency: "",
    rate: "",
  });

  const fetchRates = async () => {
    try {
      const res = await fetch("/api/rates");
      const data = await res.json();

      if (data.success) {
        setRates(data.rates);
      }
    } catch (e) {
      console.error("Ошибка загрузки курсов", e);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleCreateRate = async () => {
    if (!form.fromCurrency || !form.toCurrency || !form.rate) {
      alert("Заполни все поля");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/rates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromCurrency: form.fromCurrency,
          toCurrency: form.toCurrency,
          rate: Number(form.rate),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setForm({ fromCurrency: "", toCurrency: "", rate: "" });
        fetchRates();
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка создания курса");
    }

    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить курс?")) return;

    try {
      await fetch(`/api/rates?id=${id}`, {
        method: "DELETE",
      });

      fetchRates();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main className="p-8 text-white">
      <h1 className="text-2xl font-bold mb-6">Курсы валют</h1>

      {/* СОЗДАНИЕ */}
      <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/10">
        <h2 className="mb-4 font-semibold">Добавить курс</h2>

        <div className="flex gap-3 mb-3">
          <input
            placeholder="USDT"
            value={form.fromCurrency}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                fromCurrency: e.target.value,
              }))
            }
            className="bg-white/10 p-2 rounded"
          />

          <input
            placeholder="TRY"
            value={form.toCurrency}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                toCurrency: e.target.value,
              }))
            }
            className="bg-white/10 p-2 rounded"
          />

          <input
            placeholder="36.4"
            value={form.rate}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                rate: e.target.value,
              }))
            }
            className="bg-white/10 p-2 rounded"
          />

          <button
            onClick={handleCreateRate}
            disabled={loading}
            className="bg-green-600 px-4 py-2 rounded"
          >
            {loading ? "Создание..." : "Добавить"}
          </button>
        </div>
      </div>

      {/* СПИСОК */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <h2 className="mb-4 font-semibold">Список курсов</h2>

        {rates.length === 0 ? (
          <p className="text-white/60">Курсов пока нет</p>
        ) : (
          <div className="flex flex-col gap-3">
            {rates.map((r) => (
              <div
                key={r.id}
                className="flex justify-between items-center p-3 bg-white/10 rounded"
              >
                <div>
                  {r.fromCurrency} → {r.toCurrency} = {r.rate}
                </div>

                <button
                  onClick={() => handleDelete(r.id)}
                  className="bg-red-600 px-3 py-1 rounded"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}