"use client";

import { useEffect, useMemo, useState } from "react";

type User = {
  id?: number;
  email: string;
  phone: string;
};

type Order = {
  id: number;
  orderNumber: string;
  giveCurrency: string;
  receiveCurrency: string;
  giveAmount: number;
  receiveAmount: number;
  rate: number;
  feePercent: number;
  status: string;
  createdAt: string;
};

type OrderForm = {
  giveCurrency: string;
  receiveCurrency: string;
  giveAmount: string;
  receiveAmount: string;
  rate: number;
  feePercent: number;
  status: string;
};

const statusLabels: Record<string, string> = {
  pending: "В ожидании",
  done: "Завершена",
  canceled: "Отменена",
};

const directions = [
  { giveCurrency: "USDT", receiveCurrency: "TRY", rate: 36.4, feePercent: 1.5 },
  { giveCurrency: "BTC", receiveCurrency: "USDT", rate: 84250, feePercent: 1.2 },
  { giveCurrency: "ETH", receiveCurrency: "USDT", rate: 4200, feePercent: 1.2 },
];

const getDirectionConfig = (giveCurrency: string, receiveCurrency: string) => {
  return (
    directions.find(
      (item) =>
        item.giveCurrency === giveCurrency &&
        item.receiveCurrency === receiveCurrency
    ) ?? directions[0]
  );
};

export default function DashboardPage() {
  const [user, setUser] = useState<User>({
    id: 1,
    email: "example@gmail.com",
    phone: "+905000000000",
  });

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [lastEdited, setLastEdited] = useState<"give" | "receive">("give");

  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const [orderForm, setOrderForm] = useState<OrderForm>({
    giveCurrency: "USDT",
    receiveCurrency: "TRY",
    giveAmount: "100",
    receiveAmount: "",
    rate: 36.4,
    feePercent: 1.5,
    status: "pending",
  });

  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) ?? null;

  const recalcFromGive = (
    giveAmount: string,
    rate: number,
    feePercent: number
  ) => {
    const give = Number(giveAmount) || 0;
    const receive = give * rate * (1 - feePercent / 100);
    return receive > 0 ? receive.toFixed(2) : "";
  };

  const recalcFromReceive = (
    receiveAmount: string,
    rate: number,
    feePercent: number
  ) => {
    const receive = Number(receiveAmount) || 0;
    const divisor = rate * (1 - feePercent / 100);
    if (!divisor) return "";
    const give = receive / divisor;
    return give > 0 ? give.toFixed(2) : "";
  };

  const buildNewForm = (
    giveCurrency = "USDT",
    receiveCurrency = "TRY",
    giveAmount = "100"
  ): OrderForm => {
    const direction = getDirectionConfig(giveCurrency, receiveCurrency);

    return {
      giveCurrency: direction.giveCurrency,
      receiveCurrency: direction.receiveCurrency,
      giveAmount,
      receiveAmount: recalcFromGive(
        giveAmount,
        direction.rate,
        direction.feePercent
      ),
      rate: direction.rate,
      feePercent: direction.feePercent,
      status: "pending",
    };
  };

  const fillFormFromOrder = (order: Order) => {
    setOrderForm({
      giveCurrency: order.giveCurrency,
      receiveCurrency: order.receiveCurrency,
      giveAmount: String(order.giveAmount),
      receiveAmount: String(order.receiveAmount),
      rate: order.rate,
      feePercent: order.feePercent,
      status: order.status,
    });
  };

  const copyOrderNumber = async (orderNumber: string) => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      alert("Номер заявки скопирован");
    } catch (error) {
      console.error("COPY ORDER NUMBER ERROR:", error);
      alert("Не удалось скопировать номер заявки");
    }
  };

  const loadOrders = async (currentUserId: number) => {
    try {
      const res = await fetch(`/api/order?userId=${currentUserId}`);
      const data = await res.json();

      if (!data.success) return;

      const loadedOrders: Order[] = data.orders;
      setOrders(loadedOrders);

      if (loadedOrders.length === 0) {
        setSelectedOrderId(null);
        if (!isCreating) {
          setOrderForm(buildNewForm());
        }
        return;
      }

      if (isCreating) return;

      const stillExists = loadedOrders.find((o) => o.id === selectedOrderId);

      if (stillExists) {
        fillFormFromOrder(stillExists);
        return;
      }

      const firstOrder = loadedOrders[0];
      setSelectedOrderId(firstOrder.id);
      fillFormFromOrder(firstOrder);
    } catch (error) {
      console.error("LOAD ORDERS ERROR:", error);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);

        const currentUser = {
          id: parsedUser.id ?? 1,
          email: parsedUser.email ?? "example@gmail.com",
          phone: parsedUser.phone ?? "+905000000000",
        };

        setUser(currentUser);
        loadOrders(currentUser.id ?? 1);
      } catch (error) {
        console.error("Ошибка чтения пользователя:", error);
      }
    } else {
      setOrderForm(buildNewForm());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewOrder = () => {
    setIsCreating(true);
    setSelectedOrderId(null);
    setLastEdited("give");
    setOrderForm(buildNewForm());
  };

  const handleSelectOrder = (order: Order) => {
    setIsCreating(false);
    setSelectedOrderId(order.id);
    setLastEdited("give");
    fillFormFromOrder(order);
  };

  const handleDirectionChange = (value: string) => {
    const selected = directions.find(
      (item) => `${item.giveCurrency}-${item.receiveCurrency}` === value
    );
    if (!selected) return;

    setOrderForm((prev) => {
      const next: OrderForm = {
        ...prev,
        giveCurrency: selected.giveCurrency,
        receiveCurrency: selected.receiveCurrency,
        rate: selected.rate,
        feePercent: selected.feePercent,
      };

      if (lastEdited === "give") {
        next.receiveAmount = recalcFromGive(
          next.giveAmount,
          selected.rate,
          selected.feePercent
        );
      } else {
        next.giveAmount = recalcFromReceive(
          next.receiveAmount,
          selected.rate,
          selected.feePercent
        );
      }

      return next;
    });
  };

  const handleGiveAmountChange = (value: string) => {
    setLastEdited("give");
    setOrderForm((prev) => ({
      ...prev,
      giveAmount: value,
      receiveAmount: recalcFromGive(value, prev.rate, prev.feePercent),
    }));
  };

  const handleReceiveAmountChange = (value: string) => {
    setLastEdited("receive");
    setOrderForm((prev) => ({
      ...prev,
      receiveAmount: value,
      giveAmount: recalcFromReceive(value, prev.rate, prev.feePercent),
    }));
  };

  const handleDeleteOrder = async (orderId: number) => {
    try {
      const confirmed = window.confirm("Удалить заявку?");
      if (!confirmed) return;

      setDeleteLoadingId(orderId);

      const res = await fetch(`/api/order?orderId=${orderId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Ошибка удаления");
        return;
      }

      const nextOrders = orders.filter((order) => order.id !== orderId);
      setOrders(nextOrders);

      if (selectedOrderId === orderId) {
        if (nextOrders.length > 0) {
          const nextSelected = nextOrders[0];
          setIsCreating(false);
          setSelectedOrderId(nextSelected.id);
          fillFormFromOrder(nextSelected);
        } else {
          setIsCreating(true);
          setSelectedOrderId(null);
          setOrderForm(buildNewForm());
        }
      }

      alert("Заявка удалена");
    } catch (error) {
      console.error("DELETE REQUEST ERROR:", error);
      alert("Ошибка удаления");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleSaveOrder = async () => {
    try {
      setSaveLoading(true);

      const payload = {
        giveCurrency: orderForm.giveCurrency,
        receiveCurrency: orderForm.receiveCurrency,
        giveAmount: Number(orderForm.giveAmount),
        receiveAmount: Number(orderForm.receiveAmount),
        rate: Number(orderForm.rate),
        feePercent: Number(orderForm.feePercent),
        status: orderForm.status,
      };

      if (!payload.giveAmount || !payload.receiveAmount) {
        alert("Введите корректную сумму");
        return;
      }

      let res: Response;

      if (isCreating || !selectedOrder) {
        res = await fetch("/api/order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id ?? 1,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/order", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: selectedOrder.id,
            ...payload,
          }),
        });
      }

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Ошибка сохранения");
        return;
      }

      const savedOrder: Order = data.order;

      if (isCreating || !selectedOrder) {
        const nextOrders = [savedOrder, ...orders];
        setOrders(nextOrders);
        setIsCreating(false);
        setSelectedOrderId(savedOrder.id);
        fillFormFromOrder(savedOrder);
        alert("Заявка создана ✅");
      } else {
        const nextOrders = orders.map((order) =>
          order.id === savedOrder.id ? savedOrder : order
        );
        setOrders(nextOrders);
        setSelectedOrderId(savedOrder.id);
        fillFormFromOrder(savedOrder);
        alert("Заявка обновлена ✅");
      }
    } catch (error) {
      console.error("SAVE ORDER ERROR:", error);
      alert("Ошибка сохранения");
    } finally {
      setSaveLoading(false);
    }
  };

  const summaryText = useMemo(() => {
    const give = Number(orderForm.giveAmount) || 0;
    const receive = Number(orderForm.receiveAmount) || 0;

    return {
      give: new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 2,
      }).format(give),
      receive: new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 2,
      }).format(receive),
    };
  }, [orderForm.giveAmount, orderForm.receiveAmount]);

  return (
    <main className="min-h-screen bg-[#020b22] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-10 text-5xl font-bold">Личный кабинет</h1>

        <div className="mb-8 rounded-3xl border border-white/10 bg-[#0b1628] p-8">
          <h2 className="mb-6 text-3xl font-semibold">Ваши данные</h2>

          <div className="space-y-3 text-xl text-white/90">
            <p>
              Электронная почта:{" "}
              <span className="font-medium">{user.email}</span>
            </p>
            <p>
              Телефон: <span className="font-medium">{user.phone}</span>
            </p>
          </div>

          <p className="mt-6 text-xl text-green-400">
            Вы успешно зарегистрированы 🎉
          </p>
        </div>

        <div className="mb-8 rounded-3xl border border-white/10 bg-[#0b1628] p-8">
          <h2 className="mb-6 text-3xl font-semibold">Действия</h2>

          <button
            onClick={handleNewOrder}
            className="rounded-2xl bg-blue-600 px-8 py-4 text-lg font-medium transition hover:bg-blue-700"
          >
            Новая заявка
          </button>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#0b1628] p-8">
            <h2 className="mb-6 text-3xl font-semibold">Ваши заявки</h2>

            {orders.length === 0 ? (
              <p className="text-lg text-white/60">Пока заявок нет</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => handleSelectOrder(order)}
                    className={`cursor-pointer rounded-2xl border p-5 transition ${
                      selectedOrderId === order.id && !isCreating
                        ? "border-blue-500 bg-[#13203a]"
                        : "border-white/10 bg-[#101c31] hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <p className="text-lg font-medium">
                            {order.giveCurrency} → {order.receiveCurrency}
                          </p>

                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              copyOrderNumber(order.orderNumber);
                            }}
                            className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/50 hover:bg-white/10"
                            title="Скопировать номер заявки"
                          >
                            № {order.orderNumber}
                          </div>
                        </div>

                        <p className="text-white/80">Даю: {order.giveAmount}</p>
                        <p className="text-white/80">
                          Получаю: {order.receiveAmount}
                        </p>
                        <p className="text-white/80">
                          Статус: {statusLabels[order.status] ?? order.status}
                        </p>
                        <p className="mt-2 text-sm text-white/50">
                          {new Date(order.createdAt).toLocaleString("ru-RU")}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOrder(order.id);
                        }}
                        disabled={deleteLoadingId === order.id}
                        className="shrink-0 rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                      >
                        {deleteLoadingId === order.id ? "Удаление..." : "Удалить"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0b1628] p-8">
            <h2 className="mb-6 text-3xl font-semibold">
              {isCreating ? "Создание заявки" : "Редактирование заявки"}
            </h2>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-[#101c31] p-6">
              <div>
                <label className="mb-2 block text-sm text-white/60">
                  Направление обмена
                </label>
                <select
                  value={`${orderForm.giveCurrency}-${orderForm.receiveCurrency}`}
                  onChange={(e) => handleDirectionChange(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                >
                  {directions.map((item) => (
                    <option
                      key={`${item.giveCurrency}-${item.receiveCurrency}`}
                      value={`${item.giveCurrency}-${item.receiveCurrency}`}
                      className="bg-[#101c31]"
                    >
                      {item.giveCurrency} → {item.receiveCurrency}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/60">Даю</label>
                <input
                  type="number"
                  value={orderForm.giveAmount}
                  onChange={(e) => handleGiveAmountChange(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                />
                <p className="mt-2 text-sm text-white/50">
                  {orderForm.giveCurrency}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/60">
                  Получаю
                </label>
                <input
                  type="number"
                  value={orderForm.receiveAmount}
                  onChange={(e) => handleReceiveAmountChange(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                />
                <p className="mt-2 text-sm text-white/50">
                  {orderForm.receiveCurrency}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                <div className="mb-2 flex items-center justify-between">
                  <span>Курс</span>
                  <span>
                    1 {orderForm.giveCurrency} = {orderForm.rate}{" "}
                    {orderForm.receiveCurrency}
                  </span>
                </div>
                <div className="mb-2 flex items-center justify-between">
                  <span>Комиссия</span>
                  <span>{orderForm.feePercent}%</span>
                </div>
                <div className="flex items-center justify-between font-medium text-white">
                  <span>Итог</span>
                  <span>
                    Даю {summaryText.give} {orderForm.giveCurrency} / Получаю{" "}
                    {summaryText.receive} {orderForm.receiveCurrency}
                  </span>
                </div>
              </div>

              {!isCreating && selectedOrder && (
                <div>
                  <label className="mb-2 block text-sm text-white/60">
                    Статус
                  </label>
                  <select
                    value={orderForm.status}
                    onChange={(e) =>
                      setOrderForm((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                  >
                    <option value="pending" className="bg-[#101c31]">
                      В ожидании
                    </option>
                    <option value="done" className="bg-[#101c31]">
                      Завершена
                    </option>
                    <option value="canceled" className="bg-[#101c31]">
                      Отменена
                    </option>
                  </select>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleSaveOrder}
                  disabled={saveLoading}
                  className="rounded-xl bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  {saveLoading
                    ? "Сохранение..."
                    : isCreating
                    ? "Создать заявку"
                    : "Сохранить изменения"}
                </button>
              </div>

              {!isCreating && selectedOrder && (
                <div className="flex items-start justify-between">
                  <div>
                    <p className="mb-2 text-lg font-medium">
                      {selectedOrder.giveCurrency} →{" "}
                      {selectedOrder.receiveCurrency}
                    </p>
                  </div>

                  <div
                    onClick={() => copyOrderNumber(selectedOrder.orderNumber)}
                    className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/50 hover:bg-white/10"
                    title="Скопировать номер заявки"
                  >
                    № {selectedOrder.orderNumber}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}