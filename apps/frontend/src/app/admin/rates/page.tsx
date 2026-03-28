"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/lib/use-auth-guard";

type Rate = {
  id: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  feePercent?: number;
  isActive?: boolean;
};

type MarketRateResponse = {
  success: boolean;
  from: string;
  to: string;
  rate: number;
};

export default function AdminRatesPage() {
  const router = useRouter();

  const { user, isChecking, isOwner, hasPermission } = useAuthGuard({
    allowedRoles: ["owner", "employee"],
    requiredPermissions: ["manage_rates", "manage_fees", "rates.view"],
    requireAllPermissions: false,
    redirectIfNoUser: "/login",
    redirectIfForbidden: "/dashboard",
  });

  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRateId, setSelectedRateId] = useState<number | null>(null);

  const [fromCurrency, setFromCurrency] = useState("USDT");
  const [toCurrency, setToCurrency] = useState("TRY");
  const [rate, setRate] = useState("");
  const [feePercent, setFeePercent] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [marketLoading, setMarketLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const canManageRates = isOwner || hasPermission("manage_rates");
  const canManageFees = isOwner || hasPermission("manage_fees");
  const canViewRates =
    isOwner || hasPermission("manage_rates") || hasPermission("rates.view");

  const sortedRates = useMemo(() => {
    return [...rates].sort((a, b) => a.id - b.id);
  }, [rates]);

  const selectedRate = useMemo(() => {
    return rates.find((item) => item.id === selectedRateId) ?? null;
  }, [rates, selectedRateId]);

  async function loadRates() {
    if (!user) return;

    try {
      setLoading(true);

      const response = await fetch("/api/rates", {
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify(user),
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Ошибка загрузки курсов");
      }

      const normalizedRates: Rate[] = Array.isArray(data.rates)
        ? data.rates.map((item: any) => ({
            id: item.id,
            fromCurrency: item.fromCurrency ?? item.giveCurrency,
            toCurrency: item.toCurrency ?? item.receiveCurrency,
            rate: item.rate,
            feePercent: item.feePercent ?? 0,
            isActive: item.isActive ?? true,
          }))
        : [];

      setRates(normalizedRates);
    } catch (error) {
      console.error("LOAD RATES ERROR:", error);
      alert(error instanceof Error ? error.message : "Ошибка загрузки курсов");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSelectedRateId(null);
    setFromCurrency("USDT");
    setToCurrency("TRY");
    setRate("");
    setFeePercent("");
    setIsActive(true);
  }

  function applyRateToForm(rateItem: Rate) {
    setSelectedRateId(rateItem.id);
    setFromCurrency(rateItem.fromCurrency);
    setToCurrency(rateItem.toCurrency);
    setRate(String(rateItem.rate));
    setFeePercent(String(rateItem.feePercent ?? 0));
    setIsActive(rateItem.isActive ?? true);
  }

  async function handleFetchMarketRate() {
    try {
      setMarketLoading(true);

      const response = await fetch(
        `/api/market-rate?from=${encodeURIComponent(
          fromCurrency
        )}&to=${encodeURIComponent(toCurrency)}`
      );

      const data: MarketRateResponse = await response.json();

      if (!response.ok || !data.success || !data.rate) {
        throw new Error("Не удалось получить рыночный курс");
      }

      setRate(String(data.rate));
    } catch (error) {
      console.error("FETCH MARKET RATE ERROR:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Ошибка загрузки рыночного курса"
      );
    } finally {
      setMarketLoading(false);
    }
  }

  async function handleSaveRate() {
    if (!user) return;

    if (!canManageRates && !canManageFees) {
      alert("Нет прав на сохранение");
      return;
    }

    if (!fromCurrency || !toCurrency) {
      alert("Выберите валюты");
      return;
    }

    if (fromCurrency === toCurrency) {
      alert("Валюты должны отличаться");
      return;
    }

    const parsedRate = Number(rate);
    const parsedFee = Number(feePercent || 0);

    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      alert("Введите корректный курс");
      return;
    }

    if (!Number.isFinite(parsedFee) || parsedFee < 0) {
      alert("Введите корректную комиссию");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        id: selectedRateId,
        fromCurrency,
        toCurrency,
        giveCurrency: fromCurrency,
        receiveCurrency: toCurrency,
        rate: parsedRate,
        feePercent: parsedFee,
        isActive,
        userId: user.id,
      };

      const response = await fetch("/api/rates", {
        method: selectedRateId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify(user),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            (selectedRateId
              ? "Ошибка обновления курса"
              : "Ошибка создания курса")
        );
      }

      await loadRates();

      if (selectedRateId) {
        const updatedId = Number(data.rate?.id ?? selectedRateId);
        setSelectedRateId(updatedId);

        const updatedRate = rates.find((item) => item.id === updatedId);
        if (updatedRate) {
          applyRateToForm(updatedRate);
        }
      } else {
        resetForm();
      }

      alert(selectedRateId ? "Курс обновлён ✅" : "Курс создан ✅");
    } catch (error) {
      console.error("SAVE RATE ERROR:", error);
      alert(error instanceof Error ? error.message : "Ошибка сохранения курса");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRate(id: number) {
    if (!user) return;

    if (!canManageRates) {
      alert("Нет прав на удаление курса");
      return;
    }

    const confirmed = window.confirm("Удалить этот курс?");
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/rates?id=${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify(user),
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Ошибка удаления курса");
      }

      if (selectedRateId === id) {
        resetForm();
      }

      await loadRates();
      alert("Курс удалён ✅");
    } catch (error) {
      console.error("DELETE RATE ERROR:", error);
      alert(error instanceof Error ? error.message : "Ошибка удаления курса");
    }
  }

  useEffect(() => {
    if (!isChecking && user && canViewRates) {
      loadRates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChecking, user, canViewRates]);

  if (isChecking || loading) {
    return (
      <main className="min-h-screen bg-[#020b22] flex items-center justify-center text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-lg">
          Загрузка курсов...
        </div>
      </main>
    );
  }

  if (!canViewRates) {
    return (
      <main className="min-h-screen bg-[#020b22] flex items-center justify-center text-white px-6">
        <div className="max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-2xl font-bold">Нет доступа</h1>
          <p className="mt-3 text-white/70">
            У вас нет прав для просмотра курсов.
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
    <main className="min-h-screen bg-[#020b22] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm text-green-300">
              Управление курсами
            </div>
            <h1 className="text-4xl font-bold md:text-5xl">Курсы и комиссии</h1>
            <p className="mt-3 max-w-2xl text-white/60">
              Настройка направлений обмена, курса и комиссии для расчёта заявок.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/admin")}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium transition hover:bg-white/10"
            >
              Назад в админку
            </button>

            <button
              onClick={() => loadRates()}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium transition hover:bg-white/10"
            >
              Обновить
            </button>

            {(canManageRates || canManageFees) && (
              <button
                onClick={resetForm}
                className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-medium transition hover:bg-green-500"
              >
                Новый курс
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-[#0b122f] p-6">
            <h2 className="mb-5 text-2xl font-semibold">
              {selectedRate ? "Редактирование курса" : "Создание курса"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/60">
                  Валюта отдачи
                </label>
                <input
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value.toUpperCase())}
                  disabled={!canManageRates}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/30 disabled:opacity-60"
                  placeholder="Например: USDT"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/60">
                  Валюта получения
                </label>
                <input
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value.toUpperCase())}
                  disabled={!canManageRates}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/30 disabled:opacity-60"
                  placeholder="Например: TRY"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/60">Курс</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="0"
                    step="0.00000001"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    disabled={!canManageRates}
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/30 disabled:opacity-60"
                    placeholder="Например: 36.45"
                  />

                  {canManageRates && (
                    <button
                      onClick={handleFetchMarketRate}
                      disabled={marketLoading}
                      className="whitespace-nowrap rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition hover:bg-white/10 disabled:opacity-60"
                    >
                      {marketLoading ? "Загрузка..." : "Market"}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/60">
                  Комиссия %
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={feePercent}
                  onChange={(e) => setFeePercent(e.target.value)}
                  disabled={!canManageFees}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/30 disabled:opacity-60"
                  placeholder="Например: 1.5"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={!canManageRates}
                  className="h-4 w-4"
                />
                <span className="text-sm text-white/80">Активный курс</span>
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                {(canManageRates || canManageFees) && (
                  <button
                    onClick={handleSaveRate}
                    disabled={saving}
                    className="rounded-2xl bg-green-600 px-6 py-3 text-sm font-medium transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Сохранение..."
                      : selectedRate
                      ? "Сохранить изменения"
                      : "Создать курс"}
                  </button>
                )}

                <button
                  onClick={resetForm}
                  className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium transition hover:bg-white/10"
                >
                  Сбросить
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#0b122f] p-6">
            <h2 className="mb-5 text-2xl font-semibold">Список курсов</h2>

            {sortedRates.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white/60">
                Курсы пока не добавлены
              </div>
            ) : (
              <div className="space-y-4">
                {sortedRates.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-5 transition ${
                      selectedRateId === item.id
                        ? "border-green-500/30 bg-green-500/10"
                        : "border-white/10 bg-[#101c31]"
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5 xl:gap-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <div className="text-xs text-white/40">
                            Направление
                          </div>
                          <div className="mt-1 text-sm font-medium">
                            {item.fromCurrency} → {item.toCurrency}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <div className="text-xs text-white/40">Курс</div>
                          <div className="mt-1 text-sm font-medium">
                            {item.rate}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <div className="text-xs text-white/40">Комиссия</div>
                          <div className="mt-1 text-sm font-medium">
                            {item.feePercent ?? 0}%
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <div className="text-xs text-white/40">Статус</div>
                          <div className="mt-1 text-sm font-medium">
                            {item.isActive ? "Активен" : "Выключен"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <div className="text-xs text-white/40">ID</div>
                          <div className="mt-1 text-sm font-medium">
                            {item.id}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {(canManageRates || canManageFees) && (
                          <button
                            onClick={() => applyRateToForm(item)}
                            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium transition hover:bg-white/10"
                          >
                            Редактировать
                          </button>
                        )}

                        {canManageRates && (
                          <button
                            onClick={() => handleDeleteRate(item.id)}
                            className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-medium transition hover:bg-red-500"
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}