import { createPublicClient, erc20Abi, formatUnits, http, type Address } from "viem";
import { avalanche } from "viem/chains";

export const AVALANCHE_CHAIN_ID = "0xa86a";
export const AVALANCHE_RPC_URL = "https://api.avax.network/ext/bc/C/rpc";
export const XSGD_ADDRESS = "0xb2F85b7AB3c2b6f62DF06dE6aE7D09c010a5096E" as const;

const publicClient = createPublicClient({
  chain: avalanche,
  transport: http(AVALANCHE_RPC_URL),
});

export async function readXsgdBalance(address: Address) {
  const [rawBalance, decimals] = await Promise.all([
    publicClient.readContract({ address: XSGD_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [address] }),
    publicClient.readContract({ address: XSGD_ADDRESS, abi: erc20Abi, functionName: "decimals" }),
  ]);

  return formatUnits(rawBalance, decimals);
}
