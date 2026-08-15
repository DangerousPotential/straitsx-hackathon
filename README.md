# AgentLane

A procurement-agent demo built with Next.js, OpenAI structured outputs, and sandbox XSGD card issuance on Avalanche Fuji.

## Configuration

Copy `.env.example` to `.env.local`, then add a newly generated OpenAI project key:

```bash
cp .env.example .env.local
```

```dotenv
OPENAI_API_KEY=your_new_key
OPENAI_MODEL=gpt-5.6-luna
BRIGHTDATA_API_TOKEN=your_bright_data_token
USER_TRANSACTION_LIMIT_SGD=30
```

`OPENAI_API_KEY` is read only by the server-side search route. Never expose it through a `NEXT_PUBLIC_` variable or commit `.env.local`.

`BRIGHTDATA_API_TOKEN` enables the live procurement path. The server calls Bright Data's remote MCP `web_data_amazon_product_search` tool for Amazon SG, normalizes the returned public listing metadata, and then gives only those candidates to GPT-5.6 Luna for request-fit review. Final ranking combines Luna's request-fit score with deterministic trust, quality, value, and delivery factors. Seller transaction counts and payment-address history are displayed as unavailable when the source does not provide them; the model is never asked to invent those fields.

`USER_TRANSACTION_LIMIT_SGD` controls the maximum card value this user may issue per transaction. The effective limit cannot exceed the StraitsX sandbox provider limit of S$30. The policy is enforced when recommendations are generated, when an x402 quote is requested, and again immediately before card issuance.

With both keys, the route uses live Amazon SG listings. With only an OpenAI key, it uses the clearly labeled AI simulation. Without either key, the app remains usable with its local simulated catalogue fallback.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run lint
npm run build
```
