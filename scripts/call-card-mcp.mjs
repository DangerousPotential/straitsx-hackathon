import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const endpoint = process.env.CARD_MCP_URL ?? "https://card.straitsx.ai/sandbox/sse";
const tool = process.argv[2];
const args = JSON.parse(process.argv[3] ?? "{}");

if (!tool) throw new Error("Usage: node scripts/call-card-mcp.mjs <tool> '<json arguments>'");

const client = new Client({ name: "agentlane", version: "0.1.0" });
const transport = new SSEClientTransport(new URL(endpoint));

try {
  await client.connect(transport);
  const result = await client.callTool({ name: tool, arguments: args });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await client.close();
}
