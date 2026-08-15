import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/catalog";
import { generateProcurementSimulation } from "@/lib/openai-procurement";

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
  if (process.env.OPENAI_API_KEY) {
    try {
      return NextResponse.json(
        await generateProcurementSimulation(message, body.maxBudget),
        { headers: { "cache-control": "no-store" } },
      );
    } catch (error) {
      console.error(
        "OpenAI procurement simulation failed; using catalogue fallback.",
        error,
      );
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 650));
  return NextResponse.json(searchCatalog(message, body.maxBudget), {
    headers: { "cache-control": "no-store" },
  });
}
