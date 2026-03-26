"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "../../../lib/use-auth-guard";
import { currencies } from "../../../lib/currencies";

type RateItem = {
  id: number;
  giveCurrency: string;
  receiveCurrency: string;
  rate: number;
  feePercent: number;
  isActive: boolean;
};

type RateForm = {
  giveCurrency: string;
  receiveCurrency: string;
  rate: string;
  feePercent: string;
  isActive: boolean;
};

type CurrencyItem = {
  code: string;
  symbol: string;
  type: "fiat" | "crypto";
};

const emptyForm: RateForm = {
  giveCurrency: "",
  receiveCurrency: "",
  rate: "",
  feePercent: "0",
  isActive: true,
};

function getCurrencyMeta(code: string): CurrencyItem | undefined {
  return currencies.find((item) => item.code === code);
}

function CurrencyBadge({ code }: { code: string }) {
  const meta = getCurrencyMeta(code);

  if (!meta) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80">
        <span className="font-medium">{code}</span>
      </span>
    );
  }

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

export default function AdminRatesPage() {
  const router = useRouter();

  const { user, isChecking, isOwner, hasPermission } = useAuthGuard({
    allowedRoles: ["owner", "employee"],
    requiredPermissions: ["manage_rates", "manage_fees"],
    redirectIfNoUser: "/login",
    redirectIfForbidden: "/dashboard",
  });

  const [rates, setRates] = useState<RateItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [selectedRateId, setSelectedRateId] = useState<number | null>(null);
  const [form, setForm] = useState<RateForm>(emptyForm);

  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingMarketRate, setIsFetchingMarketRate] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);

  const canManageRates = isOwner || hasPermission("manage_rates");
  const canManageFees = isOwner || hasPermission("manage_fees");
  const isEditing = selectedRateId !== null;

  const fiatCurrencies = useMemo(
    () => currencies.filter((item) => item.type === "fiat"),
    []
  );

  const cryptoCurrencies = useMemo(
    () => currencies.filter((item) => item.type === "crypto"),
    []
  );

  const loadRates = async () => {
    if (!user) return;

    try {
      const res = await fetch("/api/rates", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify(user),
        },
      });

      const data = await res.json();

      if (!data.success) {
        setMessage(data.message || "Ошибка загрузки курсов");
        return;
      }

      setRates(data.rates);
    } catch (error) {
      console.error("LOAD RATES PAGE ERROR:", error);
      setMessage("Ошибка загрузки курсов");
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    if (user && !isLoaded) {
      loadRates();
    }
  }, [user, isLoaded]);

  const activeRatesCount = useMemo(
    () => rates.filter((item) => item.isActive).length,
    [rates]
  );

  const handleSelectRate = (rateItem: RateItem) => {
    setSelectedRateId(rateItem.id);
    setForm({
      giveCurrency: rateItem.giveCurrency,
      receiveCurrency: rateItem.receiveCurrency,
      rate: String(rateItem.rate),
      feePercent: String(rateItem.feePercent),
      isActive: rateItem.isActive,
    });
    setMessage("");
  };

  const handleCreateNew = () => {
    setSelectedRateId(null);
    setForm(emptyForm);
    setMessage("");
  };

  const handleFetchMarketRate = async () => {
    if (!form.giveCurrency || !form.receiveCurrency) {
      setMessage("Сначала выберите валютную пару");
      return;
    }

    if (form.giveCurrency === form.receiveCurrency) {
      setMessage("Валюты должны быть разными");
      return;
    }

    try {
      setIsFetchingMarketRate(true);
      setMessage("");

      const res = await fetch(
        `/api/market-rate?from=${encodeURIComponent(
          form.giveCurrency
        )}&to=${encodeURIComponent(form.receiveCurrency)}`
      );

      const data = await res.json();

      if (!data.success || !data.rate) {
        setMessage("Не удалось подтянуть рыночный курс");
        return;
      }

      setForm((prev) => ({
        ...prev,
        rate: String(data.rate),
      }));

      setMessage("Рыночный курс подставлен ✅");
    } catch (error) {
      console.error("FETCH MARKET RATE ERROR:", error);
      setMessage("Ошибка получения рыночного курса");
    } finally {
      setIsFetchingMarketRate(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!form.giveCurrency || !form.receiveCurrency || !form.rate) {
      setMessage("Заполните обязательные поля");
      return;
    }

    if (form.giveCurrency === form.receiveCurrency) {
      setMessage("Валюты должны быть разными");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");

      const payload = {
        userId: user.id,
        id: selectedRateId,
        giveCurrency: form.giveCurrency.trim().toUpperCase(),
        receiveCurrency: form.receiveCurrency.trim().toUpperCase(),
        rate: Number(form.rate),
        feePercent: Number(form.feePercent || 0),
        isActive: form.isActive,
      };

      const res = await fetch("/api/rates", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify(user),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        setMessage(data.message || "Ошибка сохранения");
        return;
      }

      await loadRates();
      setMessage(isEditing ? "Курс обновлён ✅" : "Курс создан ✅");

      if (!isEditing && data.rate?.id) {
        setSelectedRateId(data.rate.id);
      }
    } catch (error) {
      console.error("SAVE RATE PAGE ERROR:", error);
      setMessage("Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (rateId: number) => {
    if (!user) return;

    const confirmed = window.confirm("Удалить курс?");
    if (!confirmed) return;

    try {
      setDeleteLoadingId(rateId);

      const res = await fetch(`/api/rates?id=${rateId}&userId=${user.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify(user),
        },
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Ошибка удаления");
        return;
      }

      await loadRates();

      if (selectedRateId === rateId) {
        setSelectedRateId(null);
        setForm(emptyForm);
      }
    } catch (error) {
      console.error("DELETE RATE PAGE ERROR:", error);
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

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#020b22] p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Курсы и комиссии
            </h1>
            <p className="mt-2 text-white/60">
              Управление направлениями обмена, курсами и комиссиями
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium backdrop-blur-xl transition hover:bg-white/10"
          >
            Назад в кабинет
          </button>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-[#0b1628]/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <p className="text-sm text-white/60">Всего направлений</p>
            <p className="mt-2 text-3xl font-bold">{rates.length}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0b1628]/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <p className="text-sm text-white/60">Активных</p>
            <p className="mt-2 text-3xl font-bold">{activeRatesCount}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0b1628]/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <p className="text-sm text-white/60">Ваш доступ</p>
            <p className="mt-2 text-base font-medium text-blue-300">
              {isOwner
                ? "Полный доступ владельца"
                : canManageRates && canManageFees
                  ? "Курсы и комиссии"
                  : canManageRates
                    ? "Только курсы"
                    : "Только комиссии"}
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-[28px] border border-white/10 bg-[#0b1628]/90 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Список курсов</h2>
                <p className="mt-1 text-sm text-white/60">
                  Выберите курс для редактирования
                </p>
              </div>

              <button
                onClick={handleCreateNew}
                className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-700"
              >
                Новый курс
              </button>
            </div>

            {rates.length === 0 ? (
              <p className="text-white/60">Курсы пока не добавлены</p>
            ) : (
              <div className="space-y-4">
                {rates.map((rateItem) => (
                  <div
                    key={rateItem.id}
                    onClick={() => handleSelectRate(rateItem)}
                    className={`cursor-pointer rounded-3xl border p-5 transition ${
                      selectedRateId === rateItem.id
                        ? "border-blue-500/40 bg-[#13203a]"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <CurrencyBadge code={rateItem.giveCurrency} />
                          <span className="text-white/40">→</span>
                          <CurrencyBadge code={rateItem.receiveCurrency} />
                        </div>

                        <p className="text-sm text-white/60">
                          Курс: 1 {rateItem.giveCurrency} = {rateItem.rate}{" "}
                          {rateItem.receiveCurrency}
                        </p>
                        <p className="text-sm text-white/60">
                          Комиссия: {rateItem.feePercent}%
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            rateItem.isActive
                              ? "border border-green-500/20 bg-green-500/10 text-green-300"
                              : "border border-gray-500/20 bg-gray-500/10 text-gray-300"
                          }`}
                        >
                          {rateItem.isActive ? "Активен" : "Выключен"}
                        </span>

                        {(isOwner || canManageRates) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(rateItem.id);
                            }}
                            disabled={deleteLoadingId === rateItem.id}
                            className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-medium transition hover:bg-red-600 disabled:opacity-60"
                          >
                            {deleteLoadingId === rateItem.id
                              ? "Удаление..."
                              : "Удалить"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#0b1628]/90 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <h2 className="mb-6 text-2xl font-semibold">
              {isEditing ? "Редактирование курса" : "Создание курса"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/60">
                  Отдаём
                </label>
                <select
                  value={form.giveCurrency}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      giveCurrency: e.target.value,
                    }))
                  }
                  disabled={!canManageRates}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none disabled:opacity-50"
                >
                  <option value="" className="bg-[#101c31]">
                    Выберите валюту
                  </option>

                  <optgroup label="Фиатные">
                    {fiatCurrencies.map((currency) => (
                      <option
                        key={currency.code}
                        value={currency.code}
                        className="bg-[#101c31]"
                      >
                        {currency.code} ({currency.symbol})
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="Криптовалюты">
                    {cryptoCurrencies.map((currency) => (
                      <option
                        key={currency.code}
                        value={currency.code}
                        className="bg-[#101c31]"
                      >
                        {currency.code} ({currency.symbol})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/60">
                  Получаем
                </label>
                <select
                  value={form.receiveCurrency}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      receiveCurrency: e.target.value,
                    }))
                  }
                  disabled={!canManageRates}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none disabled:opacity-50"
                >
                  <option value="" className="bg-[#101c31]">
                    Выберите валюту
                  </option>

                  <optgroup label="Фиатные">
                    {fiatCurrencies.map((currency) => (
                      <option
                        key={currency.code}
                        value={currency.code}
                        className="bg-[#101c31]"
                      >
                        {currency.code} ({currency.symbol})
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="Криптовалюты">
                    {cryptoCurrencies.map((currency) => (
                      <option
                        key={currency.code}
                        value={currency.code}
                        className="bg-[#101c31]"
                      >
                        {currency.code} ({currency.symbol})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {(form.giveCurrency || form.receiveCurrency) && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                  {form.giveCurrency ? (
                    <CurrencyBadge code={form.giveCurrency} />
                  ) : (
                    <span className="text-sm text-white/50">Не выбрано</span>
                  )}

                  <span className="text-white/40">→</span>

                  {form.receiveCurrency ? (
                    <CurrencyBadge code={form.receiveCurrency} />
                  ) : (
                    <span className="text-sm text-white/50">Не выбрано</span>
                  )}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-white/60">Курс</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={form.rate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      rate: e.target.value,
                    }))
                  }
                  disabled={!canManageRates}
                  placeholder="Введите курс"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none disabled:opacity-50"
                />

                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    onClick={handleFetchMarketRate}
                    disabled={
                      isFetchingMarketRate ||
                      !canManageRates ||
                      !form.giveCurrency ||
                      !form.receiveCurrency
                    }
                    className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-500/20 disabled:opacity-50"
                  >
                    {isFetchingMarketRate
                      ? "Подтягиваем..."
                      : "Подтянуть рыночный курс"}
                  </button>
                </div>

                {!canManageRates && (
                  <p className="mt-2 text-xs text-yellow-300">
                    У вас нет прав на изменение самого курса
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/60">
                  Комиссия, %
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.feePercent}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      feePercent: e.target.value,
                    }))
                  }
                  disabled={!canManageFees}
                  placeholder="Введите комиссию"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none disabled:opacity-50"
                />
                {!canManageFees && (
                  <p className="mt-2 text-xs text-yellow-300">
                    У вас нет прав на изменение комиссии
                  </p>
                )}
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                  disabled={!canManageRates}
                />
                <span className="text-sm text-white/80">
                  Направление активно
                </span>
              </label>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                <div className="mb-3 flex items-center justify-between">
                  <span>Пара</span>
                  <span className="text-right">
                    {form.giveCurrency || "—"} → {form.receiveCurrency || "—"}
                  </span>
                </div>

                <div className="mb-3 flex items-center justify-between">
                  <span>Курс</span>
                  <span>{form.rate || "—"}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Комиссия</span>
                  <span>{form.feePercent || "0"}%</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving || (!canManageRates && !canManageFees)}
                  className="rounded-2xl bg-green-600 px-6 py-3 font-medium transition hover:bg-green-700 disabled:opacity-50"
                >
                  {isSaving
                    ? "Сохранение..."
                    : isEditing
                      ? "Сохранить изменения"
                      : "Создать курс"}
                </button>

                <button
                  onClick={handleCreateNew}
                  className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-medium transition hover:bg-white/10"
                >
                  Очистить форму
                </button>
              </div>

              {message && (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}