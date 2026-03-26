import { NextResponse } from "next/server";
import { getCurrencyMeta } from "../../../lib/currencies";

const cryptoIdMap: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  TRX: "tron",
  TON: "the-open-network",
  USDC: "usd-coin",
  LTC: "litecoin",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  ATOM: "cosmos",
  XLM: "stellar",
  BCH: "bitcoin-cash",
  UNI: "uniswap",
};

function isCrypto(code: string) {
  return getCurrencyMeta(code)?.type === "crypto";
}

function roundRate(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;

  if (value >= 1000) return Number(value.toFixed(2));
  if (value >= 1) return Number(value.toFixed(6));
  return Number(value.toFixed(10));
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  const text = await res.text();

  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
  };
}

/**
 * Возвращает курс строго в формате:
 * 1 FROM = X TO
 */
async function fetchFiatRateErApi(from: string, to: string) {
  const result = await fetchJson(`https://open.er-api.com/v6/latest/${from}`);

  if (!result.ok) {
    throw new Error(
      `ERAPI_HTTP_${result.status}: ${JSON.stringify(result.data)}`
    );
  }

  const rate = Number(result.data?.rates?.[to]);

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`ERAPI_INVALID_RATE: ${JSON.stringify(result.data)}`);
  }

  return {
    rate: roundRate(rate),
    provider: "open.er-api",
  };
}

/**
 * Возвращает курс строго в формате:
 * 1 FROM = X TO
 */
async function fetchFiatRateFrankfurter(from: string, to: string) {
  const result = await fetchJson(
    `https://api.frankfurter.app/latest?from=${from}&to=${to}`
  );

  if (!result.ok) {
    throw new Error(
      `FRANKFURTER_HTTP_${result.status}: ${JSON.stringify(result.data)}`
    );
  }

  const rate = Number(result.data?.rates?.[to]);

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(
      `FRANKFURTER_INVALID_RATE: ${JSON.stringify(result.data)}`
    );
  }

  return {
    rate: roundRate(rate),
    provider: "frankfurter",
  };
}

/**
 * Кросс через USD:
 * 1 FROM = A USD
 * 1 USD = B TO
 * => 1 FROM = A * B TO
 */
async function fetchFiatRateViaUsd(from: string, to: string) {
  if (from === "USD") {
    return await fetchFiatRateErApi("USD", to);
  }

  if (to === "USD") {
    return await fetchFiatRateErApi(from, "USD");
  }

  const fromToUsd = await fetchFiatRateErApi(from, "USD"); // 1 FROM = X USD
  const usdToTarget = await fetchFiatRateErApi("USD", to); // 1 USD = Y TO

  const crossRate = fromToUsd.rate * usdToTarget.rate;

  if (!Number.isFinite(crossRate) || crossRate <= 0) {
    throw new Error("USD_CROSS_INVALID");
  }

  return {
    rate: roundRate(crossRate),
    provider: "usd-cross",
  };
}

/**
 * Для fiat всегда возвращаем:
 * 1 FROM = X TO
 */
async function fetchFiatRate(from: string, to: string) {
  try {
    return await fetchFiatRateFrankfurter(from, to);
  } catch (frankfurterError) {
    console.warn("Frankfurter failed:", frankfurterError);

    try {
      return await fetchFiatRateErApi(from, to);
    } catch (erApiError) {
      console.warn("Direct ER API failed:", erApiError);

      try {
        return await fetchFiatRateViaUsd(from, to);
      } catch (crossError) {
        console.error("USD cross failed:", crossError);
        throw new Error(
          `FIAT_ALL_SOURCES_FAILED | frankfurter=${String(
            frankfurterError
          )} | erapi=${String(erApiError)} | cross=${String(crossError)}`
        );
      }
    }
  }
}

/**
 * Возвращает:
 * 1 CRYPTO = X FIAT
 */
async function fetchCryptoPriceInFiat(
  cryptoCode: string,
  fiatCode: string
) {
  const coinId = cryptoIdMap[cryptoCode];

  if (!coinId) {
    throw new Error(`CRYPTO_NOT_SUPPORTED: ${cryptoCode}`);
  }

  const result = await fetchJson(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${fiatCode.toLowerCase()}`
  );

  if (!result.ok) {
    throw new Error(
      `COINGECKO_HTTP_${result.status}: ${JSON.stringify(result.data)}`
    );
  }

  const price = Number(result.data?.[coinId]?.[fiatCode.toLowerCase()]);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`COINGECKO_INVALID_PRICE: ${JSON.stringify(result.data)}`);
  }

  return price;
}

async function getMarketRate(from: string, to: string) {
  const fromIsCrypto = isCrypto(from);
  const toIsCrypto = isCrypto(to);

  // FIAT -> FIAT
  if (!fromIsCrypto && !toIsCrypto) {
    return await fetchFiatRate(from, to);
  }

  // CRYPTO -> FIAT
  // 1 CRYPTO = X FIAT
  if (fromIsCrypto && !toIsCrypto) {
    const rate = await fetchCryptoPriceInFiat(from, to);
    return {
      rate: roundRate(rate),
      provider: "coingecko",
    };
  }

  // FIAT -> CRYPTO
  // Если 1 TO = X FROM, то 1 FROM = 1/X TO
  if (!fromIsCrypto && toIsCrypto) {
    const oneCryptoInFiat = await fetchCryptoPriceInFiat(to, from);
    const rate = 1 / oneCryptoInFiat;

    return {
      rate: roundRate(rate),
      provider: "coingecko-inverse",
    };
  }

  // CRYPTO -> CRYPTO
  // 1 FROM = fromUsd USD
  // 1 TO = toUsd USD
  // => 1 FROM = fromUsd / toUsd TO
  const fromUsd =
    from === "USDT" ? 1 : await fetchCryptoPriceInFiat(from, "USD");

  const toUsd =
    to === "USDT" ? 1 : await fetchCryptoPriceInFiat(to, "USD");

  const crossRate = fromUsd / toUsd;

  return {
    rate: roundRate(crossRate),
    provider: "coingecko-cross",
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const from = String(searchParams.get("from") || "")
      .trim()
      .toUpperCase();

    const to = String(searchParams.get("to") || "")
      .trim()
      .toUpperCase();

    if (!from || !to) {
      return NextResponse.json(
        { success: false, message: "Не передана валютная пара" },
        { status: 400 }
      );
    }

    if (from === to) {
      return NextResponse.json({
        success: true,
        from,
        to,
        rate: 1,
        provider: "identity",
        explanation: `1 ${from} = 1 ${to}`,
      });
    }

    if (!getCurrencyMeta(from) || !getCurrencyMeta(to)) {
      return NextResponse.json(
        {
          success: false,
          message: "Одна из валют не поддерживается",
        },
        { status: 400 }
      );
    }

    const result = await getMarketRate(from, to);

    return NextResponse.json({
      success: true,
      from,
      to,
      rate: result.rate,
      provider: result.provider,
      explanation: `1 ${from} = ${result.rate} ${to}`,
    });
  } catch (error) {
    console.error("GET MARKET RATE ERROR FULL:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Не удалось получить рыночный курс",
      },
      { status: 500 }
    );
  }
}