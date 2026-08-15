import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const endpoint = process.argv[2] ?? "https://card.straitsx.ai/sandbox/sse";
const client = new Client({ name: "agentlane-inspector", version: "0.1.0" });
const transport = new SSEClientTransport(new URL(endpoint));

try {
  await client.connect(transport);
  const result = await client.listTools();
  console.log(JSON.stringify(result, null, 2));
} finally {
  await client.close();
}
