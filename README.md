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
USER_TRANSACTION_LIMIT_SGD=30
```

`OPENAI_API_KEY` is read only by the server-side search route. Never expose it through a `NEXT_PUBLIC_` variable or commit `.env.local`.

`USER_TRANSACTION_LIMIT_SGD` controls the maximum card value this user may issue per transaction. The effective limit cannot exceed the StraitsX sandbox provider limit of S$30. The policy is enforced when recommendations are generated, when an x402 quote is requested, and again immediately before card issuance.

Without an OpenAI key, the app remains usable with its local simulated catalogue fallback.

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
