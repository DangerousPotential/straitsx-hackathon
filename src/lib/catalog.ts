import type {
  ProductOffer,
  ProductOfferBase,
  RankingFactors,
  ShoppingIntent,
  TrustPolicy,
} from "@/types/commerce";
import { getBudgetPolicy } from "@/lib/budget";

export const trustPolicy: TrustPolicy = {
  maxDataAgeMinutes: 24 * 60,
  minimumSuccessfulTransactions: 100,
  maximumAddressChangesPer90Days: 2,
};

export function addressChangesPer90Days(offer: ProductOfferBase) {
  if (
    offer.seller.paymentAddressChanges === null ||
    offer.seller.monitoringDays === null ||
    offer.seller.monitoringDays <= 0
  )
    return null;
  return offer.seller.paymentAddressChanges / (offer.seller.monitoringDays / 90);
}

export function hasCompleteSellerEvidence(offer: ProductOfferBase) {
  return (
    offer.seller.successfulTransactions !== null &&
    addressChangesPer90Days(offer) !== null
  );
}

export function passesTrustScreen(offer: ProductOfferBase) {
  const changeRate = addressChangesPer90Days(offer);
  return (
    offer.source.checkedMinutesAgo <= trustPolicy.maxDataAgeMinutes &&
    (offer.seller.successfulTransactions === null ||
      offer.seller.successfulTransactions >=
        trustPolicy.minimumSuccessfulTransactions) &&
    (changeRate === null ||
      changeRate <= trustPolicy.maximumAddressChangesPer90Days)
  );
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function deliveryScore(delivery: string | null) {
  if (!delivery) return 40;
  const normalized = delivery.toLowerCase();
  if (normalized.includes("today") || normalized.includes("same-day"))
    return 100;
  if (normalized.includes("tomorrow") || normalized.includes("next-day"))
    return 92;
  const days = normalized.match(/(\d+)\s*days?/i);
  if (!days) return 60;
  return clampScore(92 - (Number(days[1]) - 1) * 12);
}

function rankingWeights(priorities: string[]): RankingFactors {
  const weights: RankingFactors = {
    trust: 30,
    fit: 25,
    quality: 20,
    value: 15,
    delivery: 10,
  };
  const normalized = priorities.map((priority) => priority.toLowerCase());
  if (normalized.some((priority) => /review|quality/.test(priority))) {
    weights.quality += 8;
    weights.fit -= 3;
    weights.value -= 3;
    weights.delivery -= 2;
  }
  if (normalized.some((priority) => /fast|delivery/.test(priority))) {
    weights.delivery += 10;
    weights.fit -= 3;
    weights.quality -= 4;
    weights.value -= 3;
  }
  if (normalized.some((priority) => /value|price|budget/.test(priority))) {
    weights.value += 8;
    weights.fit -= 3;
    weights.quality -= 3;
    weights.delivery -= 2;
  }
  return weights;
}

function scoreOffer(
  offer: ProductOfferBase,
  intent: ShoppingIntent,
  weights: RankingFactors,
) {
  const authority =
    offer.source.authority === "Official marketplace feed"
      ? 100
      : offer.source.authority === "Verified merchant listing"
        ? 88
        : 76;
  const freshness = clampScore(
    100 - (offer.source.checkedMinutesAgo / trustPolicy.maxDataAgeMinutes) * 40,
  );
  const transactionConfidence =
    offer.seller.successfulTransactions === null
      ? 35
      : clampScore(
          55 +
            (Math.log10(
              Math.max(offer.seller.successfulTransactions, 100) / 100,
            ) /
              Math.log10(1000)) *
              45,
        );
  const changeRate = addressChangesPer90Days(offer);
  const addressStability =
    changeRate === null
      ? 35
      : clampScore(
          100 -
            (changeRate / trustPolicy.maximumAddressChangesPer90Days) * 50,
        );
  const trust =
    authority * 0.35 +
    freshness * 0.2 +
    transactionConfidence * 0.25 +
    addressStability * 0.2;
  const quality =
    offer.rating === null
      ? 35
      : (offer.rating / 5) * 75 +
        (offer.reviewCount === null
          ? 0
          : Math.min(Math.log10(offer.reviewCount + 1) / 4, 1) * 25);
  const savingsRate = Math.max(
    0,
    (intent.maxBudget - offer.price) / intent.maxBudget,
  );
  const value = clampScore(65 + savingsRate * 35);
  const factors: RankingFactors = {
    trust: Math.round(trust),
    fit: Math.round(clampScore(offer.requestFitScore ?? 75)),
    quality: Math.round(quality),
    value: Math.round(value),
    delivery: Math.round(deliveryScore(offer.delivery)),
  };
  const overallScore = Math.round(
    Object.entries(factors).reduce(
      (total, [factor, score]) =>
        total + score * (weights[factor as keyof RankingFactors] / 100),
      0,
    ),
  );
  return { factors, overallScore };
}

export function rankOffers(
  offers: ProductOfferBase[],
  intent: ShoppingIntent,
): ProductOffer[] {
  const weights = rankingWeights(intent.priorities);
  const scored = offers
    .map((offer) => ({ offer, ...scoreOffer(offer, intent, weights) }))
    .sort(
      (a, b) =>
        b.overallScore - a.overallScore ||
        b.factors.trust - a.factors.trust ||
        a.offer.price - b.offer.price,
    );
  const factorLabels: Record<keyof RankingFactors, string> = {
    trust: "seller trust",
    fit: "request fit",
    quality: "quality evidence",
    value: "value",
    delivery: "delivery speed",
  };
  return scored.map(({ offer, factors, overallScore }, index) => {
    const strongestFactor = (
      Object.keys(factors) as Array<keyof RankingFactors>
    ).sort((a, b) => factors[b] - factors[a])[0];
    return {
      ...offer,
      ranking: {
        rank: index + 1,
        overallScore,
        factors,
        weights,
        summary:
          index === 0
            ? `Best overall balance, led by ${factorLabels[strongestFactor]}.`
            : `Strongest on ${factorLabels[strongestFactor]} among the remaining options.`,
      },
    };
  });
}

const catalog: Record<string, ProductOfferBase[]> = {
  earbuds: [
    {
      id: "p20i",
      title: "Soundcore P20i",
      merchant: "Lazada",
      price: 26.5,
      rating: 4.8,
      reviewCount: 2381,
      delivery: "Arrives tomorrow",
      artColor: "#dceab7",
      icon: "earbuds",
      badge: "Best match",
      reason: "Highest-rated option under budget with next-day delivery.",
      source: {
        name: "Lazada product feed",
        authority: "Official marketplace feed",
        checkedMinutesAgo: 8,
      },
      seller: {
        name: "Anker Official Store",
        successfulTransactions: 18420,
        paymentAddressChanges: 0,
        monitoringDays: 180,
      },
    },
    {
      id: "wm02",
      title: "Baseus Bowie WM02",
      merchant: "Shopee",
      price: 19.9,
      rating: 4.7,
      reviewCount: 5102,
      delivery: "Arrives in 2 days",
      artColor: "#cddfd9",
      icon: "earbuds",
      badge: "Best value",
      reason: "Saves S$6.60 while keeping excellent buyer feedback.",
      source: {
        name: "Shopee Mall listing",
        authority: "Verified merchant listing",
        checkedMinutesAgo: 14,
      },
      seller: {
        name: "Baseus Singapore",
        successfulTransactions: 32110,
        paymentAddressChanges: 1,
        monitoringDays: 365,
      },
    },
    {
      id: "redmi",
      title: "Redmi Buds 6 Play",
      merchant: "Amazon SG",
      price: 29,
      rating: 4.6,
      reviewCount: 872,
      delivery: "Arrives today",
      artColor: "#eddcc5",
      icon: "earbuds",
      badge: "Fastest",
      reason: "The only same-day option and still within your budget.",
      source: {
        name: "Amazon SG catalogue",
        authority: "Official marketplace feed",
        checkedMinutesAgo: 5,
      },
      seller: {
        name: "Amazon SG Retail",
        successfulTransactions: 74120,
        paymentAddressChanges: 0,
        monitoringDays: 365,
      },
    },
  ],
  mouse: [
    {
      id: "m331",
      title: "Logitech M331 Silent",
      merchant: "Lazada",
      price: 24.9,
      rating: 4.9,
      reviewCount: 3204,
      delivery: "Arrives tomorrow",
      artColor: "#dceab7",
      icon: "mouse",
      badge: "Best match",
      reason: "Top-rated quiet mouse with reliable next-day delivery.",
      source: {
        name: "Lazada product feed",
        authority: "Official marketplace feed",
        checkedMinutesAgo: 11,
      },
      seller: {
        name: "Logitech Official Store",
        successfulTransactions: 28640,
        paymentAddressChanges: 0,
        monitoringDays: 365,
      },
    },
    {
      id: "rapoo",
      title: "Rapoo M10 Plus",
      merchant: "Shopee",
      price: 12.9,
      rating: 4.7,
      reviewCount: 1840,
      delivery: "Arrives in 2 days",
      artColor: "#cddfd9",
      icon: "mouse",
      badge: "Best value",
      reason: "Strong reviews at almost half your maximum budget.",
      source: {
        name: "Shopee Mall listing",
        authority: "Verified merchant listing",
        checkedMinutesAgo: 17,
      },
      seller: {
        name: "Rapoo Singapore",
        successfulTransactions: 9760,
        paymentAddressChanges: 1,
        monitoringDays: 270,
      },
    },
    {
      id: "pebble",
      title: "Logitech Pebble 2",
      merchant: "Amazon SG",
      price: 29.9,
      rating: 4.8,
      reviewCount: 721,
      delivery: "Arrives today",
      artColor: "#eddcc5",
      icon: "mouse",
      badge: "Fastest",
      reason: "Premium portable design with same-day fulfilment.",
      source: {
        name: "Amazon SG catalogue",
        authority: "Official marketplace feed",
        checkedMinutesAgo: 6,
      },
      seller: {
        name: "Amazon SG Retail",
        successfulTransactions: 74120,
        paymentAddressChanges: 0,
        monitoringDays: 365,
      },
    },
  ],
  speaker: [
    {
      id: "soundcore",
      title: "Soundcore Mini 3",
      merchant: "Lazada",
      price: 28.9,
      rating: 4.8,
      reviewCount: 1489,
      delivery: "Arrives tomorrow",
      artColor: "#dceab7",
      icon: "speaker",
      badge: "Best match",
      reason: "Best balance of sound, reviews and delivery speed.",
      source: {
        name: "Lazada product feed",
        authority: "Official marketplace feed",
        checkedMinutesAgo: 9,
      },
      seller: {
        name: "Anker Official Store",
        successfulTransactions: 18420,
        paymentAddressChanges: 0,
        monitoringDays: 180,
      },
    },
    {
      id: "trip",
      title: "Tronsmart Trip",
      merchant: "Shopee",
      price: 21.5,
      rating: 4.7,
      reviewCount: 2214,
      delivery: "Arrives in 2 days",
      artColor: "#cddfd9",
      icon: "speaker",
      badge: "Best value",
      reason: "A capable waterproof speaker with the lowest price.",
      source: {
        name: "Shopee Mall listing",
        authority: "Verified merchant listing",
        checkedMinutesAgo: 21,
      },
      seller: {
        name: "Tronsmart SG",
        successfulTransactions: 12890,
        paymentAddressChanges: 1,
        monitoringDays: 365,
      },
    },
    {
      id: "xiaomi",
      title: "Xiaomi Sound Pocket",
      merchant: "Amazon SG",
      price: 29.9,
      rating: 4.6,
      reviewCount: 438,
      delivery: "Arrives today",
      artColor: "#eddcc5",
      icon: "speaker",
      badge: "Fastest",
      reason: "Same-day delivery in a compact travel-friendly body.",
      source: {
        name: "Amazon SG catalogue",
        authority: "Official marketplace feed",
        checkedMinutesAgo: 7,
      },
      seller: {
        name: "Amazon SG Retail",
        successfulTransactions: 74120,
        paymentAddressChanges: 0,
        monitoringDays: 365,
      },
    },
  ],
};

export function searchCatalog(message: string, selectedBudget?: number) {
  const lower = message.toLowerCase();
  const key = lower.includes("mouse")
    ? "mouse"
    : lower.includes("speaker")
      ? "speaker"
      : "earbuds";
  const budgetMatch = lower.match(
    /(?:under|below|less than|≤|\$|s\$)\s*(\d+(?:\.\d+)?)/i,
  );
  const promptBudget = budgetMatch ? Number(budgetMatch[1]) : 30;
  const priorities = [
    lower.includes("review") ? "Reviews" : "Quality",
    lower.includes("fast") || lower.includes("delivery") ? "Delivery" : "Value",
    "Price",
  ];
  const budgetPolicy = getBudgetPolicy();
  const maximumProductPrice = Math.max(
    0,
    budgetPolicy.effectiveTransactionLimitSgd - budgetPolicy.estimatedFeesSgd,
  );
  const maxBudget = Number.isFinite(selectedBudget)
    ? Math.max(5, Math.min(Number(selectedBudget), maximumProductPrice))
    : Math.min(promptBudget, maximumProductPrice);
  const withinBudget = catalog[key].filter(
    (o) => o.price <= Math.min(maxBudget, maximumProductPrice) + 0.01,
  );
  const screenedOffers = withinBudget.filter(passesTrustScreen);
  const intent: ShoppingIntent = {
    query:
      key === "mouse"
        ? "wireless mouse"
        : key === "speaker"
          ? "portable speaker"
          : "wireless earbuds",
    maxBudget,
    priorities,
    requirements: [key === "speaker" ? "Portable" : "Wireless"],
  };
  const offers = rankOffers(screenedOffers, intent);
  return {
    intent,
    offers,
    trustPolicy,
    budgetPolicy,
    generation: {
      mode: "catalog_fallback" as const,
      disclaimer:
        "Simulated recommendations using the local demo catalogue; not live marketplace data.",
    },
    screenedOut: withinBudget.length - offers.length,
  };
}
