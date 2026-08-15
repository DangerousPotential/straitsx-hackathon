import "server-only";

import { getBudgetPolicy } from "@/lib/budget";
import { passesTrustScreen, rankOffers, trustPolicy } from "@/lib/catalog";
import type {
  ProductOfferBase,
  SearchResponse,
  ShoppingIntent,
} from "@/types/commerce";

type SimulationPayload = {
  intent: ShoppingIntent;
  offers: Array<Omit<ProductOfferBase, "id" | "artColor">>;
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["intent", "offers"],
  properties: {
    intent: {
      type: "object",
      additionalProperties: false,
      required: ["query", "maxBudget", "priorities", "requirements"],
      properties: {
        query: { type: "string" },
        maxBudget: { type: "number", minimum: 0 },
        priorities: { type: "array", items: { type: "string" }, maxItems: 3 },
        requirements: { type: "array", items: { type: "string" }, maxItems: 5 },
      },
    },
    offers: {
      type: "array",
      minItems: 0,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "merchant",
          "price",
          "rating",
          "reviewCount",
          "delivery",
          "icon",
          "badge",
          "reason",
          "source",
          "seller",
        ],
        properties: {
          title: { type: "string" },
          merchant: { type: "string", enum: ["Lazada", "Shopee", "Amazon SG"] },
          price: { type: "number", minimum: 0 },
          rating: { type: "number", minimum: 0, maximum: 5 },
          reviewCount: { type: "integer", minimum: 0 },
          delivery: { type: "string" },
          icon: { type: "string", enum: ["earbuds", "mouse", "speaker"] },
          badge: {
            type: "string",
            enum: ["Best match", "Best value", "Fastest"],
          },
          reason: { type: "string" },
          source: {
            type: "object",
            additionalProperties: false,
            required: ["name", "authority", "checkedMinutesAgo"],
            properties: {
              name: { type: "string" },
              authority: {
                type: "string",
                enum: [
                  "Official marketplace feed",
                  "Verified merchant listing",
                ],
              },
              checkedMinutesAgo: { type: "integer", minimum: 1, maximum: 1440 },
            },
          },
          seller: {
            type: "object",
            additionalProperties: false,
            required: [
              "name",
              "successfulTransactions",
              "paymentAddressChanges",
              "monitoringDays",
            ],
            properties: {
              name: { type: "string" },
              successfulTransactions: { type: "integer", minimum: 100 },
              paymentAddressChanges: {
                type: "integer",
                minimum: 0,
                maximum: 8,
              },
              monitoringDays: { type: "integer", minimum: 90, maximum: 730 },
            },
          },
        },
      },
    },
  },
} as const;

function extractOutputText(payload: unknown) {
  const output =
    (
      payload as {
        output?: Array<{
          type?: string;
          content?: Array<{ type?: string; text?: string }>;
        }>;
      }
    ).output ?? [];
  for (const item of output)
    for (const content of item.content ?? [])
      if (content.type === "output_text" && content.text) return content.text;
  throw new Error("OpenAI returned no structured procurement result.");
}

function isSimulationPayload(value: unknown): value is SimulationPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as SimulationPayload;
  return (
    !!candidate.intent &&
    typeof candidate.intent.query === "string" &&
    Number.isFinite(candidate.intent.maxBudget) &&
    Array.isArray(candidate.intent.priorities) &&
    Array.isArray(candidate.intent.requirements) &&
    Array.isArray(candidate.offers)
  );
}

function offerId(title: string, index: number) {
  return `${
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 36) || "offer"
  }-${index + 1}`;
}

export async function generateProcurementSimulation(
  message: string,
  selectedBudget?: number,
): Promise<SearchResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const budgetPolicy = getBudgetPolicy();
  const policyMaximumProductPrice = Math.max(
    0,
    budgetPolicy.effectiveTransactionLimitSgd - budgetPolicy.estimatedFeesSgd,
  );
  const maximumProductPrice = Number.isFinite(selectedBudget)
    ? Math.max(5, Math.min(Number(selectedBudget), policyMaximumProductPrice))
    : policyMaximumProductPrice;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
      input: [
        {
          role: "system",
          content: `Create a clearly simulated Singapore procurement result for a UI demo. Interpret the request, then return up to three plausible mock offers from Lazada, Shopee, or Amazon SG. Never claim you browsed or verified live data. All offer prices must be at most S$${maximumProductPrice.toFixed(2)} so the estimated final charge stays within the user's S$${budgetPolicy.effectiveTransactionLimitSgd.toFixed(2)} per-transaction limit. If the requested product cannot plausibly fit, return an empty offers array. Trust metrics are synthetic demo values, but must pass: data age <= ${trustPolicy.maxDataAgeMinutes} minutes, at least ${trustPolicy.minimumSuccessfulTransactions} transactions, and at most ${trustPolicy.maximumAddressChangesPer90Days} payment-address changes per 90 days.`,
        },
        { role: "user", content: message },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "procurement_simulation",
          strict: true,
          schema,
        },
      },
      max_output_tokens: 2500,
    }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`OpenAI request failed (${response.status}): ${detail}`);
  }
  const parsed = JSON.parse(
    extractOutputText(await response.json()),
  ) as unknown;
  if (!isSimulationPayload(parsed))
    throw new Error("OpenAI returned an invalid procurement result.");
  const palette: Record<ProductOfferBase["merchant"], string> = {
    Lazada: "#dceab7",
    Shopee: "#cddfd9",
    "Amazon SG": "#eddcc5",
  };
  const screenedOffers = parsed.offers
    .map((offer, index) => ({
      ...offer,
      id: offerId(offer.title, index),
      artColor: palette[offer.merchant],
    }))
    .filter(
      (offer) =>
        offer.price <= maximumProductPrice + 0.01 && passesTrustScreen(offer),
    );
  const intent = { ...parsed.intent, maxBudget: maximumProductPrice };
  const offers = rankOffers(screenedOffers, intent);
  return {
    intent,
    offers,
    trustPolicy,
    budgetPolicy,
    generation: {
      mode: "openai_simulation",
      disclaimer:
        "AI-generated simulation for demonstration only; prices, listings, and trust metrics are not live marketplace data.",
    },
    screenedOut: parsed.offers.length - offers.length,
  };
}
