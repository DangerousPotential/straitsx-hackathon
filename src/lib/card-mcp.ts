import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export const CARD_MCP_SANDBOX_URL = process.env.CARD_MCP_SANDBOX_URL ?? "https://card.straitsx.ai/sandbox/sse";
export const CARD_API_SANDBOX_URL = "https://card.straitsx.ai/sandbox/cardapi/issue_card";

type TextContent = { type: "text"; text: string };

export async function callCardMcpTool(name:string,args:Record<string,unknown>) {
  const client=new Client({name:"agentlane",version:"0.1.0"});
  const transport=new SSEClientTransport(new URL(CARD_MCP_SANDBOX_URL));
  try {
    await client.connect(transport);
    const result=await client.callTool({name,arguments:args});
    if(result.isError) throw new Error("The StraitsX card MCP tool returned an error.");
    const text=(result.content as TextContent[]).find(item=>item.type==="text")?.text;
    if(!text) throw new Error("The StraitsX card MCP tool returned no payload.");
    return JSON.parse(text) as Record<string,unknown>;
  } finally { await client.close(); }
}
