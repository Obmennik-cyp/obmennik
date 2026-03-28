"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DirectionOption = {
  fromCurrency: string;
  fromNetwork: string;
  toCurrency: string;
  rate: number;
  feePercent: number;
};

type LocalUser = {
  id: number;
  email: string;
  phone: string;
  role: "owner" | "employee" | "client";
  permissions?: string[] | string;
};

export default function Home() {
  const advantages = [
    {
      title: "Быстрая обработка",
      text: "Заявки обрабатываются оперативно, а статус сделки всегда доступен в личном кабинете.",
    },
    {
      title: "Прозрачные условия",
      text: "Курс, комиссия и итоговая сумма отображаются до создания заявки без скрытых условий.",
    },
    {
      title: "Удобный кабинет",
      text: "Оформление заявки, история операций и отслеживание статусов доступны в одном месте.",
    },
    {
      title: "Поддержка популярных направлений",
      text: "Криптовалюты, фиат и несколько сетей для гибкого обмена под разные задачи.",
    },
  ];

  const steps = [
    "Выбираете направление обмена",
    "Указываете сумму и получаете расчёт",
    "Входите в личный кабинет и создаёте заявку",
    "Менеджер подтверждает и сопровождает сделку",
  ];

  const directions = [
    "USDT TRC20 → TRY",
    "BTC → USDT",
    "ETH → USDT",
    "USD → USDT",
    "GBP → USDT",
    "TRY → USDT",
  ];

  const directionOptions: DirectionOption[] = [
    {
      fromCurrency: "USDT",
      fromNetwork: "TRC20",
      toCurrency: "TRY",
      rate: 36.4,
      feePercent: 1.5,
    },
    {
      fromCurrency: "BTC",
      fromNetwork: "BTC",
      toCurrency: "USDT",
      rate: 84250,
      feePercent: 1.2,
    },
    {
      fromCurrency: "ETH",
      fromNetwork: "ERC20",
      toCurrency: "USDT",
      rate: 4200,
      feePercent: 1.2,
    },
    {
      fromCurrency: "USD",
      fromNetwork: "Bank",
      toCurrency: "USDT",
      rate: 1,
      feePercent: 1,
    },
    {
      fromCurrency: "GBP",
      fromNetwork: "Bank",
      toCurrency: "USDT",
      rate: 1.27,
      feePercent: 1.1,
    },
    {
      fromCurrency: "TRY",
      fromNetwork: "Bank",
      toCurrency: "USDT",
      rate: 0.027,
      feePercent: 1.3,
    },
  ];

  const [user, setUser] = useState<LocalUser | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [amount, setAmount] = useState("1000");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        setUser(null);
        return;
      }

      const parsed = JSON.parse(storedUser) as LocalUser;

      setUser({
        id: Number(parsed.id),
        email: parsed.email,
        phone: parsed.phone,
        role: parsed.role,
        permissions: parsed.permissions ?? [],
      });
    } catch (error) {
      console.error("READ USER ERROR:", error);
      setUser(null);
    }
  }, []);

  const selectedDirection = directionOptions[selectedIndex];
  const amountNumber = Number(amount) || 0;

  const receiveAmount = useMemo(() => {
    const gross = amountNumber * selectedDirection.rate;
    const net = gross * (1 - selectedDirection.feePercent / 100);
    return net;
  }, [amountNumber, selectedDirection]);

  const formattedReceiveAmount = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(receiveAmount);

  async function handleCreateOrder() {
    if (!user) {
      setMessage("Для создания заявки нужно войти в аккаунт");
      return;
    }

    if (amountNumber <= 0) {
      setMessage("Введите корректную сумму");
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage("");

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify(user),
        },
        body: JSON.stringify({
          userId: user.id,
          giveCurrency: selectedDirection.fromCurrency,
          receiveCurrency: selectedDirection.toCurrency,
          giveAmount: amountNumber,
          comment: "",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Ошибка создания заявки");
      }

      setMessage(`Заявка создана: ${data.order.orderNumber}`);
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Произошла ошибка");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0f1a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0f1a]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="text-xl font-semibold tracking-wide">Обменник</div>

          <nav className="hidden items-center gap-8 text-sm text-gray-300 md:flex">
            <a href="#" className="transition-colors hover:text-white">
              Главная
            </a>
            <a href="#" className="transition-colors hover:text-white">
              Направления
            </a>
            <a href="#" className="transition-colors hover:text-white">
              FAQ
            </a>
            <a href="#" className="transition-colors hover:text-white">
              Контакты
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 md:flex">
              RU | EN | TR
            </div>

            {user ? (
              <Link
                href="/dashboard"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-[1.03] hover:bg-white/20"
              >
                Кабинет
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-[1.03] hover:bg-white/20"
              >
                Войти
              </Link>
            )}

            {!user && (
              <Link
                href="/register"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-[1.03] hover:bg-blue-500"
              >
                Регистрация
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-10 px-6 py-12 md:grid-cols-2">
        <div>
          <div className="mb-4 inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
            Обмен криптовалют и фиатных средств
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl">
            Быстрый и безопасный обмен
            <span className="block text-blue-400">в удобном формате</span>
          </h1>

          <p className="mb-8 max-w-xl text-lg text-gray-400 md:text-xl">
            Современный сервис для обмена цифровых и фиатных активов с удобным
            расчётом, прозрачными условиями и безопасной подачей заявки через
            личный кабинет.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href={user ? "/dashboard" : "/register"}
              className="rounded-2xl bg-blue-600 px-6 py-3 text-center text-lg font-medium transition-all duration-300 hover:scale-[1.03] hover:bg-blue-500 active:scale-[0.98]"
            >
              {user ? "Перейти в кабинет" : "Создать аккаунт"}
            </Link>

            <Link
              href={user ? "/dashboard" : "/login"}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-center text-lg font-medium transition-all duration-300 hover:scale-[1.03] hover:bg-white/10 active:scale-[0.98]"
            >
              {user ? "Мои заявки" : "Войти в кабинет"}
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#121821] p-6 shadow-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-500/30">
          <h2 className="mb-6 text-2xl font-semibold">Калькулятор обмена</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Направление обмена
              </label>
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(Number(e.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200 outline-none transition-all duration-200 focus:border-blue-500/40"
              >
                {directionOptions.map((item, index) => (
                  <option
                    key={`${item.fromCurrency}-${item.toCurrency}-${item.fromNetwork}`}
                    value={index}
                    className="bg-[#121821]"
                  >
                    {item.fromCurrency} {item.fromNetwork} → {item.toCurrency}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Вы отдаёте
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200">
                  {selectedDirection.fromCurrency}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200">
                  {selectedDirection.fromNetwork}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Вы получаете
              </label>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200">
                {selectedDirection.toCurrency}
              </div>
            </div>

            <div>
              <label
                htmlFor="amount"
                className="mb-2 block text-sm text-gray-400"
              >
                Сумма
              </label>
              <input
                id="amount"
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200 outline-none transition-all duration-200 placeholder:text-gray-500 focus:border-blue-500/40"
                placeholder="Введите сумму"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
              <div className="mb-2 flex items-center justify-between gap-4">
                <span>Курс</span>
                <span>
                  1 {selectedDirection.fromCurrency} = {selectedDirection.rate}{" "}
                  {selectedDirection.toCurrency}
                </span>
              </div>
              <div className="mb-2 flex items-center justify-between gap-4">
                <span>Комиссия</span>
                <span>{selectedDirection.feePercent}%</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-base font-semibold text-white">
                <span>К получению</span>
                <span>
                  {formattedReceiveAmount} {selectedDirection.toCurrency}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateOrder}
              disabled={isSubmitting || amountNumber <= 0}
              className="block w-full rounded-2xl bg-blue-600 px-6 py-3 text-center text-lg font-medium transition-all duration-300 hover:scale-[1.03] hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "Создание заявки..."
                : user
                ? "Создать заявку"
                : "Войдите, чтобы создать заявку"}
            </button>

            {message && <p className="text-sm text-gray-300">{message}</p>}

            <p className="text-xs leading-5 text-gray-500">
              Расчёт является предварительным. Финальные условия подтверждаются
              оператором.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8 md:py-14">
        <div className="mb-8">
          <h2 className="text-3xl font-bold md:text-4xl">
            Преимущества сервиса
          </h2>
          <p className="mt-3 max-w-2xl text-gray-400">
            Всё, что нужно небольшому обменному сервису: удобный интерфейс,
            понятный процесс, безопасная работа через личный кабинет и гибкая
            настройка направлений.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {advantages.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-white/10 bg-[#121821] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-500/30 hover:shadow-2xl"
            >
              <div className="mb-4 h-10 w-10 rounded-2xl bg-blue-500/15" />
              <h3 className="mb-3 text-xl font-semibold">{item.title}</h3>
              <p className="text-sm leading-6 text-gray-400">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8 md:py-14">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#121821] p-6 md:p-8">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Как это работает
            </h2>
            <p className="mb-8 max-w-xl text-gray-400">
              Простой путь от расчёта до обработки заявки без перегруженного
              интерфейса и с понятной логикой на каждом этапе.
            </p>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-gray-200">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#121821] p-6 md:p-8">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Популярные направления
            </h2>
            <p className="mb-8 max-w-xl text-gray-400">
              Наиболее востребованные пары обмена, которые можно быстро
              настроить и масштабировать под конкретного клиента.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {directions.map((direction) => (
                <div
                  key={direction}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-gray-200 transition-all duration-300 hover:border-blue-500/30 hover:bg-white/10"
                >
                  {direction}
                </div>
              ))}
            </div>

            <button className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium transition-all duration-300 hover:scale-[1.03] hover:bg-white/10 active:scale-[0.98]">
              Смотреть все направления
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:py-16">
        <h2 className="mb-8 text-3xl font-bold md:text-4xl">
          Последние операции
        </h2>

        <div className="space-y-3">
          {[
            "USDT → TRY • 1 200 USDT",
            "BTC → USDT • 0.15 BTC",
            "ETH → USDT • 3.2 ETH",
            "USD → USDT • 5 000 USD",
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-gray-300"
            >
              <span>{item}</span>
              <span className="text-green-400">Завершено</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:py-16">
        <h2 className="mb-8 text-3xl font-bold md:text-4xl">
          Последние обновления
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            "Добавлены новые направления обмена",
            "Обновлён курс для TRY",
            "Запущена поддержка GBP",
          ].map((news, i) => (
            <div
              key={i}
              className="rounded-3xl border border-white/10 bg-[#121821] p-6 text-gray-300"
            >
              {news}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:py-16">
        <h2 className="mb-8 text-3xl font-bold md:text-4xl">Частые вопросы</h2>

        <div className="space-y-4">
          {[
            "Нужно ли регистрироваться?",
            "Сколько времени занимает обмен?",
            "Как происходит подтверждение сделки?",
          ].map((q, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-gray-300"
            >
              {q}
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-gray-500">
        © 2026 Обменник. Все права защищены.
      </footer>
    </main>
  );
}