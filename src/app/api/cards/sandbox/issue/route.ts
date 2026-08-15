import { NextResponse } from "next/server";
import { CARD_API_SANDBOX_URL } from "@/lib/card-mcp";
import { validateIssuanceAmount } from "@/lib/budget";

export const dynamic="force-dynamic";

export async function POST(request:Request) {
  try {
    const body=await request.json() as {amount_sgd?:number;cardholder_name?:string;payment_signature?:string};
    const amount=Number(body.amount_sgd); const name=body.cardholder_name?.trim()??""; const signature=body.payment_signature??"";
    const amountCheck=validateIssuanceAmount(amount);
    if(!amountCheck.valid) return NextResponse.json({error:`This user can issue between S$5 and S$${amountCheck.policy.effectiveTransactionLimitSgd.toFixed(2)} per transaction.`},{status:400});
    if(!/^[A-Za-z ]{2,26}$/.test(name)||signature.length<100) return NextResponse.json({error:"Invalid card issuance request."},{status:400});
    const cardResponse=await fetch(CARD_API_SANDBOX_URL,{method:"POST",headers:{"content-type":"application/json","payment-signature":signature},body:JSON.stringify({amount_sgd:amount,cardholder_name:name}),cache:"no-store"});
    const responseText=await cardResponse.text();
    let result:Record<string,unknown>;
    try { result=JSON.parse(responseText) as Record<string,unknown>; }
    catch { result={error:responseText||"StraitsX rejected the payment authorization."}; }
    if(!cardResponse.ok) return NextResponse.json({error:typeof result.error==="string"?result.error:"StraitsX rejected the payment authorization."},{status:cardResponse.status});
    return NextResponse.json(result,{headers:{"cache-control":"no-store, private","pragma":"no-cache"}});
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:"Unable to issue sandbox card."},{status:502}); }
}
