export type CurrencyType = "fiat" | "crypto";

export type CurrencyItem = {
  code: string;
  name: string;
  symbol: string;
  type: CurrencyType;
};

export const currencies: CurrencyItem[] = [
  // FIAT
  { code: "USD", name: "Доллар США", symbol: "$", type: "fiat" },
  { code: "EUR", name: "Евро", symbol: "€", type: "fiat" },
  { code: "TRY", name: "Турецкая лира", symbol: "₺", type: "fiat" },
  { code: "RUB", name: "Российский рубль", symbol: "₽", type: "fiat" },
  { code: "GBP", name: "Британский фунт", symbol: "£", type: "fiat" },
  { code: "AED", name: "Дирхам ОАЭ", symbol: "د.إ", type: "fiat" },
  { code: "KZT", name: "Казахстанский тенге", symbol: "₸", type: "fiat" },
  { code: "UAH", name: "Украинская гривна", symbol: "₴", type: "fiat" },
  { code: "CNY", name: "Китайский юань", symbol: "¥", type: "fiat" },
  { code: "JPY", name: "Японская иена", symbol: "¥", type: "fiat" },
  { code: "CHF", name: "Швейцарский франк", symbol: "₣", type: "fiat" },
  { code: "CAD", name: "Канадский доллар", symbol: "C$", type: "fiat" },
  { code: "AUD", name: "Австралийский доллар", symbol: "A$", type: "fiat" },
  { code: "SEK", name: "Шведская крона", symbol: "kr", type: "fiat" },
  { code: "NOK", name: "Норвежская крона", symbol: "kr", type: "fiat" },
  { code: "DKK", name: "Датская крона", symbol: "kr", type: "fiat" },
  { code: "PLN", name: "Польский злотый", symbol: "zł", type: "fiat" },
  { code: "CZK", name: "Чешская крона", symbol: "Kč", type: "fiat" },
  { code: "ILS", name: "Израильский шекель", symbol: "₪", type: "fiat" },
  { code: "SAR", name: "Саудовский риял", symbol: "﷼", type: "fiat" },

  // CRYPTO
  { code: "USDT", name: "Tether", symbol: "₮", type: "crypto" },
  { code: "BTC", name: "Bitcoin", symbol: "₿", type: "crypto" },
  { code: "ETH", name: "Ethereum", symbol: "Ξ", type: "crypto" },
  { code: "BNB", name: "BNB", symbol: "BNB", type: "crypto" },
  { code: "SOL", name: "Solana", symbol: "SOL", type: "crypto" },
  { code: "XRP", name: "XRP", symbol: "XRP", type: "crypto" },
  { code: "ADA", name: "Cardano", symbol: "ADA", type: "crypto" },
  { code: "DOGE", name: "Dogecoin", symbol: "DOGE", type: "crypto" },
  { code: "TRX", name: "TRON", symbol: "TRX", type: "crypto" },
  { code: "TON", name: "Toncoin", symbol: "TON", type: "crypto" },
  { code: "USDC", name: "USD Coin", symbol: "USDC", type: "crypto" },
  { code: "LTC", name: "Litecoin", symbol: "Ł", type: "crypto" },
  { code: "DOT", name: "Polkadot", symbol: "DOT", type: "crypto" },
  { code: "AVAX", name: "Avalanche", symbol: "AVAX", type: "crypto" },
  { code: "MATIC", name: "Polygon", symbol: "MATIC", type: "crypto" },
  { code: "LINK", name: "Chainlink", symbol: "LINK", type: "crypto" },
  { code: "ATOM", name: "Cosmos", symbol: "ATOM", type: "crypto" },
  { code: "XLM", name: "Stellar", symbol: "XLM", type: "crypto" },
  { code: "BCH", name: "Bitcoin Cash", symbol: "BCH", type: "crypto" },
  { code: "UNI", name: "Uniswap", symbol: "UNI", type: "crypto" },
];

export const fiatCurrencies = currencies.filter(
  (item) => item.type === "fiat"
);

export const cryptoCurrencies = currencies.filter(
  (item) => item.type === "crypto"
);

export function getCurrencyMeta(code: string) {
  return currencies.find((item) => item.code === code);
}