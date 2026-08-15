import "server-only";

import { getBudgetPolicy } from "@/lib/budget";

const BUYWHERE_SEARCH_ENDPOINT = "GET /v1/products/search";

export type LiveListing = {
  id:string;
  title:string;
  url:string;
  price:number;
  currency:"SGD";
  merchant:string;
  rating:number|null;
  reviewCount:number|null;
  sellerName:string|null;
  brand:string|null;
  availability:string|null;
  description:string|null;
};

export type LiveListingBatch = {
  provider:"BuyWhere API";
  tool:typeof BUYWHERE_SEARCH_ENDPOINT;
  observedAt:string;
  listings:LiveListing[];
};

function recordValue(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function safeListingUrl(value: unknown) {
  const raw = nonEmptyString(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function productSearchTerms(query: string) {
  const cleaned = query
    .replace(
      /\b(?:under|below|up to|for less than|maximum(?: budget)?(?: of)?|max(?: budget)?(?: of)?)\s*(?:s\s*\$|sgd\s*|\$)?\s*\d+(?:\.\d+)?/gi,
      " ",
    )
    .replace(
      /\bwith\s+(?:strong|good|great|high|many|lots? of)\s+(?:customer\s+)?reviews?\b/gi,
      " ",
    )
    .replace(/\bwith\s+(?:fast|same[- ]day|next[- ]day)\s+delivery\b/gi, " ")
    .replace(/\b(?:including|with)\s+delivery\b/gi, " ")
    .replace(/\bon\s+(?:shopee|lazada|amazon(?:\s+sg)?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || query.trim();
}

function merchantLabel(record: Record<string, unknown>) {
  const merchant = recordValue(record.merchant);
  const raw =
    nonEmptyString(record.domain) ??
    nonEmptyString(record.platform) ??
    nonEmptyString(record.merchant_name) ??
    nonEmptyString(record.merchant) ??
    nonEmptyString(merchant?.platform) ??
    nonEmptyString(merchant?.name) ??
    "BuyWhere merchant";
  if (/lazada/i.test(raw)) return "Lazada";
  if (/shopee/i.test(raw)) return "Shopee";
  if (/amazon/i.test(raw)) return "Amazon SG";
  return raw;
}

export function normalizeBuyWhereSearchResult(value: unknown): LiveListing[] {
  const root = recordValue(value);
  const records = Array.isArray(value)
    ? value
    : Array.isArray(root?.data)
      ? root.data
      : Array.isArray(root?.results)
        ? root.results
        : [];
  const seen = new Set<string>();
  const listings: LiveListing[] = [];
  for (const item of records) {
    const record = recordValue(item);
    if (!record) continue;
    const priceRecord = recordValue(record.price);
    const merchantRecord = recordValue(record.merchant);
    const specs = recordValue(record.structured_specs) ?? recordValue(record.specs);
    const availabilityRecord = recordValue(record.availability);
    const id =
      nonEmptyString(record.id) ?? nonEmptyString(record.product_id) ?? null;
    const title = nonEmptyString(record.title) ?? nonEmptyString(record.name);
    const url = safeListingUrl(
      record.url ?? record.source_url ?? record.listing_url ?? record.affiliate_url,
    );
    const price = numericValue(priceRecord?.amount ?? record.price);
    const currency = nonEmptyString(
      record.currency ?? priceRecord?.currency,
    )?.toUpperCase();
    if (!id || !title || !url || price === null || price <= 0) continue;
    if (currency && currency !== "SGD" && currency !== "S$") continue;
    if (seen.has(url)) continue;
    seen.add(url);
    const rating = numericValue(record.rating ?? merchantRecord?.rating);
    const reviewCount = numericValue(
      record.review_count ?? record.reviews_count ?? record.rating_count,
    );
    const inStock = availabilityRecord?.in_stock;
    listings.push({
      id: `buywhere-${id}`,
      title,
      url,
      price,
      currency: "SGD",
      merchant: merchantLabel(record),
      rating: rating === null ? null : Math.max(0, Math.min(5, rating)),
      reviewCount:
        reviewCount === null ? null : Math.max(0, Math.round(reviewCount)),
      sellerName:
        nonEmptyString(record.seller_name) ??
        nonEmptyString(record.merchant_name) ??
        nonEmptyString(merchantRecord?.name) ??
        nonEmptyString(record.merchant),
      brand:
        nonEmptyString(record.brand) ?? nonEmptyString(specs?.brand),
      availability:
        nonEmptyString(record.availability) ??
        (typeof inStock === "boolean" ? (inStock ? "In stock" : "Out of stock") : null),
      description: (
        nonEmptyString(record.description) ??
        nonEmptyString(record.description_short) ??
        nonEmptyString(record.description_full)
      )?.slice(0, 1200) ?? null,
    });
    if (listings.length === 12) break;
  }
  return listings;
}

export async function fetchBuyWhereListings(
  query: string,
  selectedBudget?: number,
  domain?: "shopee" | "lazada" | "amazon",
): Promise<LiveListingBatch> {
  const apiKey = process.env.BUYWHERE_API_KEY;
  if (!apiKey) throw new Error("BUYWHERE_API_KEY is not configured.");
  const budgetPolicy = getBudgetPolicy();
  const maximumProductPrice = Math.max(
    0,
    Math.min(
      Number.isFinite(selectedBudget) ? Number(selectedBudget) : Infinity,
      budgetPolicy.effectiveTransactionLimitSgd - budgetPolicy.estimatedFeesSgd,
    ),
  );
  const endpoint = new URL("https://api.buywhere.ai/v1/products/search");
  endpoint.searchParams.set("q", productSearchTerms(query).slice(0, 240));
  endpoint.searchParams.set("country_code", "SG");
  endpoint.searchParams.set("currency", "SGD");
  endpoint.searchParams.set("max_price", maximumProductPrice.toFixed(2));
  endpoint.searchParams.set("compact", "true");
  endpoint.searchParams.set("limit", "12");
  if (domain) endpoint.searchParams.set("domain", domain);
  const response = await fetch(endpoint, {
    headers: { authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240);
    throw new Error(`BuyWhere API request failed (${response.status}): ${detail}`);
  }
  const listings = normalizeBuyWhereSearchResult(await response.json());
  if (!listings.length)
    throw new Error("BuyWhere API returned no usable Singapore listings.");
  return {
    provider: "BuyWhere API",
    tool: BUYWHERE_SEARCH_ENDPOINT,
    observedAt: new Date().toISOString(),
    listings,
  };
}
