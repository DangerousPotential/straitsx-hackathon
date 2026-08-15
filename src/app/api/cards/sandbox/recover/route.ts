import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { callCardMcpTool } from "@/lib/card-mcp";

export const dynamic = "force-dynamic";

const cardIdPattern = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
const transactionPattern = /^0x[0-9a-f]{64}$/i;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      card_opaque_id?: string;
      settlement_tx?: string;
      wallet_address?: string;
    };

    const cardOpaqueId = body.card_opaque_id?.trim() ?? "";
    const settlementTx = body.settlement_tx?.trim() ?? "";
    const walletAddress = body.wallet_address?.trim() ?? "";

    if (!cardIdPattern.test(cardOpaqueId)) {
      return NextResponse.json(
        { error: "Enter a valid sandbox card ID." },
        { status: 400 },
      );
    }
    if (!transactionPattern.test(settlementTx)) {
      return NextResponse.json(
        { error: "Enter a valid Fuji settlement transaction." },
        { status: 400 },
      );
    }
    if (!isAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Enter the wallet that issued this sandbox card." },
        { status: 400 },
      );
    }

    const card = await callCardMcpTool("view_card_sandbox", {
      card_opaque_id: cardOpaqueId,
      settlement_tx: settlementTx,
      wallet_address: walletAddress,
    });

    return NextResponse.json(card, {
      headers: {
        "cache-control": "private, no-store, max-age=0",
        pragma: "no-cache",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to recover the sandbox card.",
      },
      { status: 502 },
    );
  }
}
