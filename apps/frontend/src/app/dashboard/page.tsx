"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { currencies } from "../../lib/currencies";

type User = {
  id?: number;
  email: string;
  phone: string;
  role?: string;
  permissions?: string[];
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

type RateItem = {
  id?: number;
  giveCurrency: string;
  receiveCurrency: string;
  rate: number;
  feePercent: number;
  isActive: boolean;
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
  PENDING: "В ожидании",
  IN_PROGRESS: "В работе",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
};

const fallbackDirections: RateItem[] = [
  {
    giveCurrency: "USDT",
    receiveCurrency: "TRY",
    rate: 36.4,
    feePercent: 1.5,
    isActive: true,
  },
  {
    giveCurrency: "BTC",
    receiveCurrency: "USDT",
    rate: 84250,
    feePercent: 1.2,
    isActive: true,
  },
  {
    giveCurrency: "ETH",
    receiveCurrency: "USDT",
    rate: 4200,
    feePercent: 1.2,
    isActive: true,
  },
];

const getDirectionConfig = (
  directions: RateItem[],
  giveCurrency: string,
  receiveCurrency: string
) => {
  return (
    directions.find(
      (item) =>
        item.giveCurrency === giveCurrency &&
        item.receiveCurrency === receiveCurrency
    ) ?? directions[0]
  );
};

function getCurrencyMeta(code: string) {
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

function getStatusClass(status: string) {
  switch (status) {
    case "PENDING":
      return "border-yellow-500/20 bg-yellow-500/10 text-yellow-300";
    case "IN_PROGRESS":
      return "border-blue-500/20 bg-blue-500/10 text-blue-300";
    case "COMPLETED":
      return "border-green-500/20 bg-green-500/10 text-green-300";
    case "CANCELLED":
      return "border-red-500/20 bg-red-500/10 text-red-300";
    default:
      return "border-white/10 bg-white/5 text-white/70";
  }
}

function DirectionOption({
  item,
  onClick,
  isSelected,
}: {
  item: RateItem;
  onClick: () => void;
  isSelected: boolean;
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
        <CurrencyBadge code={item.giveCurrency} />
        <span className="text-white/40">→</span>
        <CurrencyBadge code={item.receiveCurrency} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-white/60">
          1 {item.giveCurrency} = {item.rate} {item.receiveCurrency}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          Комиссия: {item.feePercent}%
        </span>
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [user, setUser] = useState<User>({
    id: 1,
    email: "example@gmail.com",
    phone: "+905000000000",
    role: "client",
    permissions: [],
  });

  const [directions, setDirections] = useState<RateItem[]>(fallbackDirections);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [lastEdited, setLastEdited] = useState<"give" | "receive">("give");

  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const [directionSearch, setDirectionSearch] = useState("");
  const [isDirectionOpen, setIsDirectionOpen] = useState(false);

  const [orderForm, setOrderForm] = useState<OrderForm>({
    giveCurrency: "USDT",
    receiveCurrency: "TRY",
    giveAmount: "100",
    receiveAmount: "",
    rate: 36.4,
    feePercent: 1.5,
    status: "PENDING",
  });

  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) ?? null;

  const selectedDirection = useMemo(
    () =>
      getDirectionConfig(
        directions,
        orderForm.giveCurrency,
        orderForm.receiveCurrency
      ),
    [directions, orderForm.giveCurrency, orderForm.receiveCurrency]
  );

  const permissions = user.permissions ?? [];
  const isOwner = user.role === "owner";
  const isEmployee = user.role === "employee";
  const showRole = isOwner || isEmployee;

  const hasPermission = (permission: string) =>
    isOwner || permissions.includes(permission);

  const canManageOrders = isOwner || user.role === "client" || hasPermission("manage_orders");
  const canDeleteOrders = hasPermission("delete_orders");
  const canChangeStatus = hasPermission("change_status");
  const canManageRates = hasPermission("manage_rates");
  const canManageFees = hasPermission("manage_fees");
  const canManageStaff = hasPermission("manage_staff");
  const canOpenRates = isOwner || canManageRates || canManageFees;

  const getAuthHeaders = (currentUser: User) => ({
    "Content-Type": "application/json",
    "x-user": JSON.stringify(currentUser),
  });

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
    currentDirections: RateItem[],
    giveCurrency = "USDT",
    receiveCurrency = "TRY",
    giveAmount = "100"
  ): OrderForm => {
    const direction = getDirectionConfig(
      currentDirections,
      giveCurrency,
      receiveCurrency
    );

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
      status: "PENDING",
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

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const loadRates = async (currentUser: User) => {
    try {
      const res = await fetch("/api/rates", {
        method: "GET",
        headers: getAuthHeaders(currentUser),
      });

      const data = await res.json();

      if (data.success && data.rates.length > 0) {
        const normalizedRates = data.rates
          .filter((item: { isActive?: boolean }) => item.isActive !== false)
          .map(
            (item: {
              id?: number;
              giveCurrency?: string;
              receiveCurrency?: string;
              fromCurrency?: string;
              toCurrency?: string;
              rate: number;
              feePercent?: number;
              isActive?: boolean;
            }) => ({
              id: item.id,
              giveCurrency: item.giveCurrency ?? item.fromCurrency ?? "USDT",
              receiveCurrency:
                item.receiveCurrency ?? item.toCurrency ?? "TRY",
              rate: Number(item.rate),
              feePercent: Number(item.feePercent ?? 0),
              isActive: item.isActive ?? true,
            })
          );

        if (normalizedRates.length > 0) {
          setDirections(normalizedRates);

          setOrderForm((prev) => {
            const direction = getDirectionConfig(
              normalizedRates,
              prev.giveCurrency,
              prev.receiveCurrency
            );

            return {
              ...prev,
              giveCurrency: direction.giveCurrency,
              receiveCurrency: direction.receiveCurrency,
              rate: direction.rate,
              feePercent: direction.feePercent,
              receiveAmount: recalcFromGive(
                prev.giveAmount,
                direction.rate,
                direction.feePercent
              ),
            };
          });
        }
      }
    } catch (error) {
      console.error("LOAD RATES ERROR:", error);
    }
  };

  const loadOrders = async (currentUser: User) => {
    try {
      const res = await fetch("/api/orders", {
        method: "GET",
        headers: getAuthHeaders(currentUser),
      });

      const data = await res.json();

      if (!data.success) return;

      const loadedOrders: Order[] = data.orders;
      setOrders(loadedOrders);

      if (loadedOrders.length === 0) {
        setSelectedOrderId(null);
        if (!isCreating) {
          setOrderForm(buildNewForm(directions));
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

    if (!savedUser) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);

      const currentUser = {
        id: parsedUser.id ?? 1,
        email: parsedUser.email ?? "example@gmail.com",
        phone: parsedUser.phone ?? "+905000000000",
        role: parsedUser.role ?? "client",
        permissions: parsedUser.permissions ?? [],
      };

      setUser(currentUser);
      setIsAuthChecked(true);
      loadRates(currentUser);
      loadOrders(currentUser);
    } catch (error) {
      console.error("Ошибка чтения пользователя:", error);
      localStorage.removeItem("user");
      router.push("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!isAuthChecked) return;
    if (typeof window === "undefined") return;
    if (!directions.length) return;

    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    const to = params.get("to");
    const amountParam = params.get("amount");

    if (!from || !to) return;

    const matchedDirection = getDirectionConfig(directions, from, to);
    const giveAmount =
      amountParam && Number(amountParam) > 0 ? amountParam : "100";

    setIsCreating(true);
    setSelectedOrderId(null);
    setLastEdited("give");
    setOrderForm({
      giveCurrency: matchedDirection.giveCurrency,
      receiveCurrency: matchedDirection.receiveCurrency,
      giveAmount,
      receiveAmount: recalcFromGive(
        giveAmount,
        matchedDirection.rate,
        matchedDirection.feePercent
      ),
      rate: matchedDirection.rate,
      feePercent: matchedDirection.feePercent,
      status: "PENDING",
    });
  }, [directions, isAuthChecked]);

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

  const handleNewOrder = () => {
    if (!canManageOrders) {
      alert("У вас нет прав на создание заявок");
      return;
    }

    setIsCreating(true);
    setSelectedOrderId(null);
    setLastEdited("give");
    setOrderForm(buildNewForm(directions));
  };

  const handleSelectOrder = (order: Order) => {
    if (!canManageOrders) {
      alert("У вас нет прав на просмотр и редактирование заявок");
      return;
    }

    setIsCreating(false);
    setSelectedOrderId(order.id);
    setLastEdited("give");
    fillFormFromOrder(order);
  };

  const handleDirectionSelect = (selected: RateItem) => {
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

    setIsDirectionOpen(false);
    setDirectionSearch("");
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
    if (!canDeleteOrders) {
      alert("У вас нет прав на удаление заявок");
      return;
    }

    try {
      const confirmed = window.confirm("Удалить заявку?");
      if (!confirmed) return;

      setDeleteLoadingId(orderId);

      const res = await fetch(`/api/orders?orderId=${orderId}`, {
        method: "DELETE",
        headers: getAuthHeaders(user),
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
          setOrderForm(buildNewForm(directions));
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
    if (!canManageOrders) {
      alert("У вас нет прав на работу с заявками");
      return;
    }

    if (!isCreating && selectedOrder && !canChangeStatus) {
      if (orderForm.status !== selectedOrder.status) {
        alert("У вас нет прав на изменение статуса заявки");
        return;
      }
    }

    try {
      setSaveLoading(true);

      const payload = {
        giveCurrency: orderForm.giveCurrency,
        receiveCurrency: orderForm.receiveCurrency,
        giveAmount: Number(orderForm.giveAmount),
        receiveAmount: Number(orderForm.receiveAmount),
        rate: Number(orderForm.rate),
        feePercent: Number(orderForm.feePercent),
        status: String(orderForm.status).toUpperCase(),
      };

      if (!payload.giveAmount || !payload.receiveAmount) {
        alert("Введите корректную сумму");
        return;
      }

      let res: Response;

      if (isCreating || !selectedOrder) {
        res = await fetch("/api/orders", {
          method: "POST",
          headers: getAuthHeaders(user),
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/orders", {
          method: "PUT",
          headers: getAuthHeaders(user),
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

  const filteredDirections = useMemo(() => {
    const query = directionSearch.trim().toLowerCase();

    if (!query) return directions;

    return directions.filter((item) => {
      const pair = `${item.giveCurrency} ${item.receiveCurrency}`.toLowerCase();
      return pair.includes(query);
    });
  }, [directions, directionSearch]);

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

  if (!isAuthChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020b22] text-white">
        <p className="text-lg text-white/70">Проверка доступа...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020b22] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-5xl font-bold">Личный кабинет</h1>

          <button
            onClick={handleLogout}
            className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
          >
            Выйти из аккаунта
          </button>
        </div>

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

            {showRole && (
              <p>
                Роль:{" "}
                <span className="font-medium">
                  {isOwner ? "Владелец" : "Работник"}
                </span>
              </p>
            )}
          </div>

          <p className="mt-6 text-xl text-green-400">
            Вы успешно авторизованы ✅
          </p>
        </div>

        <div className="mb-8 rounded-3xl border border-white/10 bg-[#0b1628] p-8">
          <h2 className="mb-6 text-3xl font-semibold">Действия</h2>

          <div className="flex flex-wrap gap-4">
            {canManageOrders && (
              <button
                onClick={handleNewOrder}
                className="rounded-2xl bg-blue-600 px-8 py-4 text-lg font-medium transition hover:bg-blue-700"
              >
                Новая заявка
              </button>
            )}

            {canOpenRates && (
              <a
                href="/rates"
                className="inline-block rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-lg font-medium transition hover:bg-white/10"
              >
                Валютная панель
              </a>
            )}

            {(isOwner || canManageStaff) && (
              <a
                href="/admin/staff"
                className="inline-block rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-lg font-medium transition hover:bg-white/10"
              >
                Сотрудники
              </a>
            )}

            {(isOwner || canManageRates || canManageFees) && (
              <a
                href="/admin/rates"
                className="inline-block rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-lg font-medium transition hover:bg-white/10"
              >
                Курсы и комиссии
              </a>
            )}
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#0b1628] p-8">
            <h2 className="mb-6 text-3xl font-semibold">Ваши заявки</h2>

            {!canManageOrders ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                У вас нет прав на просмотр и редактирование заявок
              </div>
            ) : orders.length === 0 ? (
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
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <CurrencyBadge code={order.giveCurrency} />
                          <span className="text-white/40">→</span>
                          <CurrencyBadge code={order.receiveCurrency} />
                        </div>

                        <p className="text-white/80">Даю: {order.giveAmount}</p>
                        <p className="text-white/80">
                          Получаю: {order.receiveAmount}
                        </p>
                        <p className="mt-2 text-sm text-white/50">
                          {new Date(order.createdAt).toLocaleString("ru-RU")}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
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

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
                            order.status
                          )}`}
                        >
                          {statusLabels[order.status] ?? order.status}
                        </span>

                        {canDeleteOrders && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOrder(order.id);
                            }}
                            disabled={deleteLoadingId === order.id}
                            className="shrink-0 rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                          >
                            {deleteLoadingId === order.id
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

          <div className="rounded-3xl border border-white/10 bg-[#0b1628] p-8">
            <h2 className="mb-6 text-3xl font-semibold">
              {isCreating ? "Создание заявки" : "Редактирование заявки"}
            </h2>

            {!canManageOrders ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                У вас нет доступа к управлению заявками
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-white/10 bg-[#101c31] p-6">
                <div ref={dropdownRef} className="relative">
                  <label className="mb-2 block text-sm text-white/60">
                    Направление обмена
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsDirectionOpen((prev) => !prev)}
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left outline-none transition hover:bg-white/15"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <CurrencyBadge code={selectedDirection.giveCurrency} />
                        <span className="text-white/40">→</span>
                        <CurrencyBadge code={selectedDirection.receiveCurrency} />
                      </div>

                      <span className="text-sm text-white/50">
                        1 {selectedDirection.giveCurrency} = {selectedDirection.rate}{" "}
                        {selectedDirection.receiveCurrency}
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
                        {filteredDirections.length === 0 ? (
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                            Ничего не найдено
                          </div>
                        ) : (
                          filteredDirections.map((item) => (
                            <DirectionOption
                              key={`${item.giveCurrency}-${item.receiveCurrency}`}
                              item={item}
                              isSelected={
                                item.giveCurrency === orderForm.giveCurrency &&
                                item.receiveCurrency === orderForm.receiveCurrency
                              }
                              onClick={() => handleDirectionSelect(item)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <CurrencyBadge code={orderForm.giveCurrency} />
                  <span className="text-white/40">→</span>
                  <CurrencyBadge code={orderForm.receiveCurrency} />
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
                    <span>Курс сервиса</span>
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

                {!isCreating && selectedOrder && canChangeStatus && (
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
                      <option value="PENDING" className="bg-[#101c31]">
                        В ожидании
                      </option>
                      <option value="IN_PROGRESS" className="bg-[#101c31]">
                        В работе
                      </option>
                      <option value="COMPLETED" className="bg-[#101c31]">
                        Завершена
                      </option>
                      <option value="CANCELLED" className="bg-[#101c31]">
                        Отменена
                      </option>
                    </select>
                  </div>
                )}

                {!isCreating && selectedOrder && !canChangeStatus && (
                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
                    У вас нет прав на изменение статуса заявки
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
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-medium">
                          {selectedOrder.giveCurrency} →{" "}
                          {selectedOrder.receiveCurrency}
                        </p>
                        <p className="mt-1 text-sm text-white/50">
                          Выбрана заявка для редактирования
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

                    <div className="flex flex-wrap items-center gap-2">
                      <CurrencyBadge code={selectedOrder.giveCurrency} />
                      <span className="text-white/40">→</span>
                      <CurrencyBadge code={selectedOrder.receiveCurrency} />
                    </div>

                    <div className="mt-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
                          selectedOrder.status
                        )}`}
                      >
                        {statusLabels[selectedOrder.status] ??
                          selectedOrder.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}