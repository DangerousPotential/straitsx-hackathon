import "server-only";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const AMAZON_SEARCH_TOOL = "web_data_amazon_product_search";
const AMAZON_SG_ORIGIN = "https://www.amazon.sg";

export type LiveListing = {
  id:string;
  title:string;
  url:string;
  price:number;
  currency:"SGD";
  rating:number|null;
  reviewCount:number|null;
  sellerName:string|null;
  brand:string|null;
  availability:string|null;
  description:string|null;
};

export type LiveListingBatch = {
  provider:"Bright Data MCP";
  tool:typeof AMAZON_SEARCH_TOOL;
  observedAt:string;
  listings:LiveListing[];
};

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function integerValue(value: unknown) {
  const parsed = numericValue(value);
  return parsed === null ? null : Math.max(0, Math.round(parsed));
}

function safeAmazonUrl(value: unknown) {
  const raw = nonEmptyString(value);
  if (!raw) return null;
  try {
    const url = new URL(raw, AMAZON_SG_ORIGIN);
    if (url.protocol !== "https:" || !/(^|\.)amazon\.sg$/i.test(url.hostname))
      return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function listingId(record: Record<string, unknown>, url: string, index: number) {
  const asin = nonEmptyString(record.asin);
  if (asin) return `amazon-${asin.toLowerCase()}`;
  const slug = url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .slice(-44)
    .toLowerCase();
  return `amazon-${slug || index + 1}`;
}

export function normalizeAmazonSearchResult(value: unknown): LiveListing[] {
  const records = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { data?:unknown }).data)
      ? (value as { data:unknown[] }).data
      : [];
  const seen = new Set<string>();
  const listings: LiveListing[] = [];
  for (const [index, item] of records.entries()) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const title = nonEmptyString(record.title);
    const url = safeAmazonUrl(record.url);
    const price = numericValue(record.price);
    const currency = nonEmptyString(record.currency)?.toUpperCase();
    if (!title || !url || price === null || price <= 0) continue;
    if (currency && currency !== "SGD" && currency !== "S$") continue;
    if (seen.has(url)) continue;
    seen.add(url);
    const rating = numericValue(record.rating);
    listings.push({
      id: listingId(record, url, index),
      title,
      url,
      price,
      currency: "SGD",
      rating: rating === null ? null : Math.max(0, Math.min(5, rating)),
      reviewCount: integerValue(record.reviews_count),
      sellerName: nonEmptyString(record.seller_name),
      brand: nonEmptyString(record.brand),
      availability: nonEmptyString(record.availability),
      description: nonEmptyString(record.description)?.slice(0, 1200) ?? null,
    });
    if (listings.length === 12) break;
  }
  return listings;
}

function parseToolPayload(text: string) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed) as unknown;
}

export async function fetchAmazonSgListings(
  query: string,
): Promise<LiveListingBatch> {
  const token = process.env.BRIGHTDATA_API_TOKEN;
  if (!token) throw new Error("BRIGHTDATA_API_TOKEN is not configured.");

  const endpoint = new URL("https://mcp.brightdata.com/mcp");
  endpoint.searchParams.set("token", token);
  endpoint.searchParams.set("groups", "ecommerce");
  const client = new Client({ name: "agentlane-procurement", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(endpoint);
  try {
    await client.connect(transport, { timeout: 10_000 });
    const available = await client.listTools(undefined, { timeout: 10_000 });
    if (!available.tools.some((tool) => tool.name === AMAZON_SEARCH_TOOL))
      throw new Error(`Bright Data MCP did not expose ${AMAZON_SEARCH_TOOL}.`);
    const result = await client.callTool(
      {
        name: AMAZON_SEARCH_TOOL,
        arguments: { keyword: query.slice(0, 180), url: AMAZON_SG_ORIGIN },
      },
      undefined,
      { timeout: 45_000, maxTotalTimeout: 45_000 },
    );
    if ("isError" in result && result.isError)
      throw new Error("Bright Data MCP returned an error result.");
    const content = (result as { content?:Array<{ type:string; text?:string }> })
      .content;
    if (!Array.isArray(content))
      throw new Error("Bright Data MCP returned no listing content.");
    const text = content
      .filter(
        (item): item is { type:"text"; text:string } =>
          item.type === "text" && typeof item.text === "string",
      )
      .map((item) => item.text)
      .join("\n");
    if (!text) throw new Error("Bright Data MCP returned empty listing content.");
    const listings = normalizeAmazonSearchResult(parseToolPayload(text));
    if (!listings.length)
      throw new Error("Bright Data MCP returned no usable Amazon SG listings.");
    return {
      provider: "Bright Data MCP",
      tool: AMAZON_SEARCH_TOOL,
      observedAt: new Date().toISOString(),
      listings,
    };
  } finally {
    await client.close().catch(() => undefined);
  }
}
