import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/catalog";
import { fetchAmazonSgListings } from "@/lib/brightdata-listings";
import {
  generateProcurementSimulation,
  reviewLiveProcurementListings,
} from "@/lib/openai-procurement";

function safeErrorMessage(error: unknown) {
  let message = error instanceof Error ? error.message : "Unknown error";
  for (const secret of [
    process.env.BRIGHTDATA_API_TOKEN,
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
  if (process.env.OPENAI_API_KEY && process.env.BRIGHTDATA_API_TOKEN) {
    try {
      const listings = await fetchAmazonSgListings(message);
      return NextResponse.json(
        await reviewLiveProcurementListings(message, body.maxBudget, listings),
        { headers: { "cache-control": "no-store" } },
      );
    } catch (error) {
      console.error(
        "Live Bright Data procurement failed; using OpenAI simulation fallback.",
        safeErrorMessage(error),
      );
    }
  }
  if (process.env.OPENAI_API_KEY) {
    try {
      return NextResponse.json(
        await generateProcurementSimulation(message, body.maxBudget),
        { headers: { "cache-control": "no-store" } },
      );
    } catch (error) {
      console.error(
        "OpenAI procurement simulation failed; using catalogue fallback.",
        safeErrorMessage(error),
      );
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 650));
  return NextResponse.json(searchCatalog(message, body.maxBudget), {
    headers: { "cache-control": "no-store" },
  });
}
