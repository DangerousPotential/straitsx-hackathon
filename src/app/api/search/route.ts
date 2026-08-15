import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/catalog";
import { fetchBuyWhereListings } from "@/lib/buywhere-listings";
import { effectiveSearchBudget } from "@/lib/prompt-budget";
import {
  buildLiveProcurementResults,
  generateProcurementSimulation,
  reviewLiveProcurementListings,
} from "@/lib/openai-procurement";

function safeErrorMessage(error: unknown) {
  let message = error instanceof Error ? error.message : "Unknown error";
  for (const secret of [
    process.env.BUYWHERE_API_KEY,
    process.env.OPENAI_API_KEY,
  ])
    if (secret) message = message.replaceAll(secret, "[redacted]");
  return message;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    message?: string;
    maxBudget?: number;
  };
  if (!body.message?.trim())
    return NextResponse.json(
      { error: "Tell us what you would like to find." },
      { status: 400 },
    );
  const message = body.message.trim().slice(0, 1200);
  const searchBudget = effectiveSearchBudget(message, body.maxBudget);
  if (process.env.BUYWHERE_API_KEY) {
    try {
      const listings = await fetchBuyWhereListings(
        message,
        searchBudget,
        "shopee",
      );
      if (process.env.OPENAI_API_KEY) {
        try {
          const reviewed = await reviewLiveProcurementListings(
            message,
            searchBudget,
            listings,
          );
          if (reviewed.offers.length > 0)
            return NextResponse.json(reviewed, {
              headers: { "cache-control": "no-store" },
            });
          console.warn(
            "OpenAI selected no BuyWhere listings; ranking the live listings locally.",
          );
        } catch (error) {
          console.error(
            "OpenAI live review failed; ranking the BuyWhere listings locally.",
            safeErrorMessage(error),
          );
        }
      }
      return NextResponse.json(
        buildLiveProcurementResults(message, searchBudget, listings),
        { headers: { "cache-control": "no-store" } },
      );
    } catch (error) {
      console.error(
        "Live BuyWhere procurement failed.",
        safeErrorMessage(error),
      );
      return NextResponse.json(
        {
          error:
            "Live product search is temporarily unavailable. Please try again.",
        },
        {
          status: 502,
          headers: { "cache-control": "no-store" },
        },
      );
    }
  }
  if (process.env.OPENAI_API_KEY) {
    try {
      const simulation = await generateProcurementSimulation(
        message,
        searchBudget,
      );
      if (simulation.offers.length > 0)
        return NextResponse.json(simulation, {
          headers: { "cache-control": "no-store" },
        });
      console.warn(
        "OpenAI procurement simulation returned no ranked offers; using the local demo catalogue.",
      );
    } catch (error) {
      console.error(
        "OpenAI procurement simulation failed; using catalogue fallback.",
        safeErrorMessage(error),
      );
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 650));
  return NextResponse.json(searchCatalog(message, searchBudget), {
    headers: { "cache-control": "no-store" },
  });
}
