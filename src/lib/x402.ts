import { getAddress, isAddress, type Address } from "viem";

export type X402Requirement = {
  scheme:"exact";
  network:string;
  amount:string;
  asset:Address;
  payTo:Address;
  maxTimeoutSeconds:number;
  chainId:number;
  extra:{ assetTransferMethod:string; name:string; version:string };
};

export type SandboxCardResult = {
  card_opaque_id:string;
  card_html?:string;
  settlement_tx:string;
  [key:string]:unknown;
};

const FUJI_CHAIN_ID="0xa869";

async function switchToFuji(provider:EthereumProvider) {
  const current=await provider.request<string>({method:"eth_chainId"});
  if(current.toLowerCase()===FUJI_CHAIN_ID) return;
  try { await provider.request({method:"wallet_switchEthereumChain",params:[{chainId:FUJI_CHAIN_ID}]}); }
  catch(error) {
    const value=error as {code?:number};
    if(value.code!==4902) throw error;
    await provider.request({method:"wallet_addEthereumChain",params:[{chainId:FUJI_CHAIN_ID,chainName:"Avalanche Fuji C-Chain",nativeCurrency:{name:"Avalanche",symbol:"AVAX",decimals:18},rpcUrls:["https://api.avax-test.network/ext/bc/C/rpc"],blockExplorerUrls:["https://testnet.snowtrace.io"]}]});
  }
}

function randomNonce() {
  const bytes=new Uint8Array(32); crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes,byte=>byte.toString(16).padStart(2,"0")).join("")}`;
}

function toBase64(value:unknown) {
  return window.btoa(JSON.stringify(value));
}

export async function issueSandboxCard(amountSgd:number,cardholderName:string) {
  const provider=window.ethereum;
  if(!provider) throw new Error("MetaMask is required to sign the XSGD authorization.");
  const accounts=await provider.request<string[]>({method:"eth_requestAccounts"});
  if(!accounts[0]||!isAddress(accounts[0])) throw new Error("MetaMask did not return a valid wallet address.");
  const account=getAddress(accounts[0]);

  const quoteResponse=await fetch("/api/cards/sandbox/quote",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({amount_sgd:amountSgd,cardholder_name:cardholderName,wallet_address:account})});
  const quote=await quoteResponse.json() as {error?:string;requirement?:X402Requirement};
  if(!quoteResponse.ok||!quote.requirement) throw new Error(quote.error??"Could not obtain an XSGD card quote.");
  const requirement=quote.requirement;
  if(requirement.chainId!==43113||requirement.network!=="eip155:43113"||requirement.extra.assetTransferMethod!=="eip3009") throw new Error("The card server returned an unsupported payment requirement.");

  await switchToFuji(provider);
  const now=Math.floor(Date.now()/1000);
  const authorization={from:account,to:getAddress(requirement.payTo),value:requirement.amount,validAfter:"0",validBefore:String(now+requirement.maxTimeoutSeconds),nonce:randomNonce()};
  const typedData={
    domain:{name:requirement.extra.name,version:requirement.extra.version,chainId:requirement.chainId,verifyingContract:getAddress(requirement.asset)},
    primaryType:"TransferWithAuthorization",
    types:{EIP712Domain:[{name:"name",type:"string"},{name:"version",type:"string"},{name:"chainId",type:"uint256"},{name:"verifyingContract",type:"address"}],TransferWithAuthorization:[{name:"from",type:"address"},{name:"to",type:"address"},{name:"value",type:"uint256"},{name:"validAfter",type:"uint256"},{name:"validBefore",type:"uint256"},{name:"nonce",type:"bytes32"}]},
    message:authorization,
  };
  const signature=await provider.request<string>({method:"eth_signTypedData_v4",params:[account,JSON.stringify(typedData)]});
  const paymentSignature=toBase64({x402Version:1,accepted:requirement,payload:{signature,authorization}});

  const issueResponse=await fetch("/api/cards/sandbox/issue",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({amount_sgd:amountSgd,cardholder_name:cardholderName,payment_signature:paymentSignature})});
  const result=await issueResponse.json() as SandboxCardResult&{error?:string};
  if(!issueResponse.ok) throw new Error(result.error??"The sandbox card could not be issued.");
  return {result,account,requirement};
}
