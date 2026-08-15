import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { CARD_API_SANDBOX_URL, callCardMcpTool } from "@/lib/card-mcp";
import { validateIssuanceAmount } from "@/lib/budget";

export const dynamic="force-dynamic";

export async function POST(request:Request) {
  try {
    const body=await request.json() as {amount_sgd?:number;cardholder_name?:string;wallet_address?:string};
    const amount=Number(body.amount_sgd); const name=body.cardholder_name?.trim()??""; const wallet=body.wallet_address??"";
    const amountCheck=validateIssuanceAmount(amount);
    if(!amountCheck.valid) return NextResponse.json({error:`This user can issue between S$5 and S$${amountCheck.policy.effectiveTransactionLimitSgd.toFixed(2)} per transaction.`},{status:400});
    if(!/^[A-Za-z ]{2,26}$/.test(name)) return NextResponse.json({error:"Cardholder name must contain 2–26 letters and spaces."},{status:400});
    if(!isAddress(wallet)) return NextResponse.json({error:"A valid Avalanche wallet is required."},{status:400});

    const instruction=await callCardMcpTool("get_card_sandbox",{amount_sgd:amount,cardholder_name:name,wallet_address:wallet});
    if(instruction.url!==CARD_API_SANDBOX_URL) throw new Error("The MCP server returned an unexpected card API URL.");
    const cardResponse=await fetch(CARD_API_SANDBOX_URL,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({amount_sgd:amount,cardholder_name:name}),cache:"no-store"});
    const encoded=cardResponse.headers.get("payment-required");
    if(cardResponse.status!==402||!encoded) throw new Error("The card API did not return an x402 payment challenge.");
    const challenge=JSON.parse(Buffer.from(encoded,"base64").toString("utf8")) as {accepts?:unknown[]};
    const requirement=challenge.accepts?.[0];
    if(!requirement) throw new Error("The x402 challenge contained no payment requirement.");
    return NextResponse.json({requirement},{headers:{"cache-control":"no-store"}});
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:"Unable to prepare card issuance."},{status:502}); }
}
