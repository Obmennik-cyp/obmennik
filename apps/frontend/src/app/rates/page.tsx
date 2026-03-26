"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { currencies } from "../../lib/currencies";

type Rate = {
  id: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  feePercent?: number;
  isActive?: boolean;
};

function getCurrencyMeta(code: string) {
  return (
    currencies.find((item) => item.code === code) ?? {
      code,
      name: code,
      symbol: "¤",
      type: "fiat" as const,
    }
  );
}

function CurrencyBadge({ code }: { code: string }) {
  const meta = getCurrencyMeta(code);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
        meta.type === "crypto"
          ? "border-orange-500/20 bg-orange-500/10 text-orange-300"
          : "border-blue-500/20 bg-blue-500/10 text-blue-300"
      }`}
    >
      <span className="font-semibold">{meta.symbol}</span>
      <span className="font-medium">{meta.code}</span>
      <span className="text-xs uppercase opacity-70">{meta.type}</span>
    </span>
  );
}

function DirectionCard({
  item,
  isSelected,
  onClick,
}: {
  item: Rate;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        isSelected
          ? "border-blue-500/40 bg-[#13203a]"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <CurrencyBadge code={item.fromCurrency} />
        <span className="text-white/40">→</span>
        <CurrencyBadge code={item.toCurrency} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-white/70">
          1 {item.fromCurrency} = {item.rate} {item.toCurrency}
        </span>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          Комиссия: {item.feePercent ?? 0}%
        </span>
      </div>
    </button>
  );
}

export default function RatesPage() {
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPair, setSelectedPair] = useState<string>("");
  const [amount, setAmount] = useState("100");

  const [isDirectionOpen, setIsDirectionOpen] = useState(false);
  const [directionSearch, setDirectionSearch] = useState("");

  const fetchRates = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const res = await fetch("/api/rates", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify(user),
        },
      });

      const data = await res.json();

      if (data.success) {
        const activeRates = (data.rates || []).filter(
          (item: { isActive?: boolean }) => item.isActive !== false
        );

        setRates(activeRates);

        if (activeRates.length > 0) {
          const first = activeRates[0];
          setSelectedPair(`${first.fromCurrency}-${first.toCurrency}`);
        }
      } else {
        console.error("Ошибка загрузки курсов:", data.message);
      }
    } catch (error) {
      console.error("Ошибка загрузки курсов", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsDirectionOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectedRate = useMemo(() => {
    return (
      rates.find(
        (item) => `${item.fromCurrency}-${item.toCurrency}` === selectedPair
      ) ?? null
    );
  }, [rates, selectedPair]);

  const filteredRates = useMemo(() => {
    const query = directionSearch.trim().toLowerCase();

    if (!query) return rates;

    return rates.filter((item) => {
      const pair =
        `${item.fromCurrency} ${item.toCurrency}`.toLowerCase();
      return pair.includes(query);
    });
  }, [rates, directionSearch]);

  const feePercent = selectedRate?.feePercent ?? 0;

  const calculatedResult = useMemo(() => {
    if (!selectedRate) return "0.00";

    const value = Number(amount) || 0;
    const result = value * selectedRate.rate * (1 - feePercent / 100);

    return result > 0 ? result.toFixed(2) : "0.00";
  }, [amount, selectedRate, feePercent]);

  const dashboardLink = useMemo(() => {
    if (!selectedRate) return "/dashboard";

    const params = new URLSearchParams({
      from: selectedRate.fromCurrency,
      to: selectedRate.toCurrency,
      amount,
    });

    return `/dashboard?${params.toString()}`;
  }, [selectedRate, amount]);

  const stats = useMemo(() => {
    return {
      total: rates.length,
      crypto: rates.filter(
        (item) => getCurrencyMeta(item.fromCurrency).type === "crypto"
      ).length,
      fiat: rates.filter(
        (item) => getCurrencyMeta(item.toCurrency).type === "fiat"
      ).length,
    };
  }, [rates]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020b22] text-white">
        <p className="text-lg text-white/70">Загрузка курсов...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020b22] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-5xl font-bold tracking-tight">
              Курсы обмена
            </h1>
            <p className="mt-2 max-w-2xl text-white/60">
              Выберите направление, посмотрите актуальный курс и сразу
              перейдите к созданию заявки.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium transition hover:bg-white/10"
            >
              Войти
            </Link>

            <Link
              href="/dashboard"
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium transition hover:bg-blue-700"
            >
              Личный кабинет
            </Link>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-[#0b1628]/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <p className="text-sm text-white/60">Активных направлений</p>
            <p className="mt-2 text-3xl font-bold">{stats.total}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0b1628]/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <p className="text-sm text-white/60">Крипто направлений</p>
            <p className="mt-2 text-3xl font-bold">{stats.crypto}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0b1628]/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <p className="text-sm text-white/60">Фиатные выплаты</p>
            <p className="mt-2 text-3xl font-bold">{stats.fiat}</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="rounded-[28px] border border-white/10 bg-[#0b1628]/90 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Доступные направления</h2>
              <p className="mt-1 text-sm text-white/60">
                Выберите подходящую валютную пару
              </p>
            </div>

            {rates.length === 0 ? (
              <p className="text-white/60">Активных направлений пока нет</p>
            ) : (
              <div className="space-y-4">
                {rates.map((rateItem) => (
                  <DirectionCard
                    key={rateItem.id}
                    item={rateItem}
                    isSelected={
                      selectedPair ===
                      `${rateItem.fromCurrency}-${rateItem.toCurrency}`
                    }
                    onClick={() =>
                      setSelectedPair(
                        `${rateItem.fromCurrency}-${rateItem.toCurrency}`
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#0b1628]/90 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <h2 className="mb-6 text-2xl font-semibold">Калькулятор обмена</h2>

            {!selectedRate ? (
              <p className="text-white/60">Выберите направление обмена</p>
            ) : (
              <div className="space-y-4">
                <div ref={dropdownRef} className="relative">
                  <label className="mb-2 block text-sm text-white/60">
                    Направление обмена
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsDirectionOpen((prev) => !prev)}
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left transition hover:bg-white/15"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <CurrencyBadge code={selectedRate.fromCurrency} />
                        <span className="text-white/40">→</span>
                        <CurrencyBadge code={selectedRate.toCurrency} />
                      </div>

                      <span className="text-sm text-white/50">
                        1 {selectedRate.fromCurrency} = {selectedRate.rate}{" "}
                        {selectedRate.toCurrency}
                      </span>
                    </div>
                  </button>

                  {isDirectionOpen && (
                    <div className="absolute z-30 mt-3 w-full rounded-3xl border border-white/10 bg-[#0b1628] p-3 shadow-2xl">
                      <input
                        value={directionSearch}
                        onChange={(e) => setDirectionSearch(e.target.value)}
                        placeholder="Поиск направления"
                        className="mb-3 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/35 outline-none"
                      />

                      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                        {filteredRates.length === 0 ? (
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                            Ничего не найдено
                          </div>
                        ) : (
                          filteredRates.map((item) => (
                            <DirectionCard
                              key={item.id}
                              item={item}
                              isSelected={
                                selectedPair ===
                                `${item.fromCurrency}-${item.toCurrency}`
                              }
                              onClick={() => {
                                setSelectedPair(
                                  `${item.fromCurrency}-${item.toCurrency}`
                                );
                                setIsDirectionOpen(false);
                                setDirectionSearch("");
                              }}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <CurrencyBadge code={selectedRate.fromCurrency} />
                  <span className="text-white/40">→</span>
                  <CurrencyBadge code={selectedRate.toCurrency} />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/60">
                    Вы отдаёте
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                  />
                  <p className="mt-2 text-sm text-white/50">
                    {selectedRate.fromCurrency}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/60">
                    Вы получаете
                  </label>
                  <input
                    type="text"
                    value={calculatedResult}
                    readOnly
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                  />
                  <p className="mt-2 text-sm text-white/50">
                    {selectedRate.toCurrency}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                  <div className="mb-2 flex items-center justify-between">
                    <span>Курс сервиса</span>
                    <span>
                      1 {selectedRate.fromCurrency} = {selectedRate.rate}{" "}
                      {selectedRate.toCurrency}
                    </span>
                  </div>

                  <div className="mb-2 flex items-center justify-between">
                    <span>Комиссия</span>
                    <span>{feePercent}%</span>
                  </div>

                  <div className="flex items-center justify-between font-medium text-white">
                    <span>Итог</span>
                    <span>
                      {amount || "0"} {selectedRate.fromCurrency} →{" "}
                      {calculatedResult} {selectedRate.toCurrency}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={dashboardLink}
                    className="rounded-2xl bg-green-600 px-6 py-3 font-medium transition hover:bg-green-700"
                  >
                    Перейти к созданию заявки
                  </Link>

                  <Link
                    href="/register"
                    className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-medium transition hover:bg-white/10"
                  >
                    Зарегистрироваться
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}