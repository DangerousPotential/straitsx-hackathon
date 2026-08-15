import type { ProductOffer, TrustPolicy } from "@/types/commerce";
import { getBudgetPolicy } from "@/lib/budget";

export const trustPolicy: TrustPolicy = {
  maxDataAgeMinutes: 24 * 60,
  minimumSuccessfulTransactions: 100,
  maximumAddressChangesPer90Days: 2,
};

export function addressChangesPer90Days(offer: ProductOffer) {
  return (
    offer.seller.paymentAddressChanges / (offer.seller.monitoringDays / 90)
  );
}

export function passesTrustScreen(offer: ProductOffer) {
  return (
    offer.source.checkedMinutesAgo <= trustPolicy.maxDataAgeMinutes &&
    offer.seller.successfulTransactions >=
      trustPolicy.minimumSuccessfulTransactions &&
    addressChangesPer90Days(offer) <= trustPolicy.maximumAddressChangesPer90Days
  );
}

const catalog: Record<string, ProductOffer[]> = {
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
  const offers = withinBudget.filter(passesTrustScreen);
  return {
    intent: {
      query:
        key === "mouse"
          ? "wireless mouse"
          : key === "speaker"
            ? "portable speaker"
            : "wireless earbuds",
      maxBudget,
      priorities,
      requirements: [key === "speaker" ? "Portable" : "Wireless"],
    },
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
