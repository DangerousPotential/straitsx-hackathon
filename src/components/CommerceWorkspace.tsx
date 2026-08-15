"use client";

import { FormEvent, useEffect, useState } from "react";
import { addressChangesPer90Days, searchCatalog } from "@/lib/catalog";
import type {
  BudgetPolicy,
  ProductOffer,
  RankingFactors,
  SearchResponse,
} from "@/types/commerce";
import { WalletButton } from "@/components/WalletButton";
import { issueSandboxCard, type SandboxCardResult } from "@/lib/x402";

const initial = searchCatalog(
  "wireless earbuds under $30, reviews and fast delivery",
);
const purchaseSteps = [
  "Rechecked data and seller trust",
  "Opened merchant",
  "Matched the exact product",
  "Added 1 item to cart",
  "Checked delivery and fees",
];
const agentSteps = [
  {
    id: "thinking",
    label: "Thinking",
    detail: "Understanding your budget and priorities",
  },
  {
    id: "finding",
    label: "Finding products",
    detail: "Searching trusted marketplace sources",
  },
  {
    id: "procuring",
    label: "Procuring options",
    detail: "Checking seller and payment-address history",
  },
] as const;
type AgentStage = (typeof agentSteps)[number]["id"] | "ready";

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "spark")
    return (
      <svg {...common}>
        <path d="m12 3 1.3 4.2a5 5 0 0 0 3.4 3.4L21 12l-4.3 1.4a5 5 0 0 0-3.4 3.4L12 21l-1.3-4.2a5 5 0 0 0-3.4-3.4L3 12l4.3-1.4a5 5 0 0 0 3.4-3.4L12 3Z" />
      </svg>
    );
  if (name === "wallet")
    return (
      <svg {...common}>
        <path d="M4 6.5h14a2 2 0 0 1 2 2V18H6a2 2 0 0 1-2-2V6.5Z" />
        <path d="M4.5 7 16 3.5v3M16 12h4" />
        <circle cx="16" cy="12" r=".5" fill="currentColor" />
      </svg>
    );
  if (name === "search")
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
    );
  if (name === "arrow")
    return (
      <svg {...common}>
        <path d="M5 12h14m-5-5 5 5-5 5" />
      </svg>
    );
  if (name === "check")
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  if (name === "shield")
    return (
      <svg {...common}>
        <path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  if (name === "clock")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </svg>
    );
  if (name === "store")
    return (
      <svg {...common}>
        <path d="M4 10h16l-2-5H6l-2 5Z" />
        <path d="M6 10v9h12v-9M9 19v-5h6v5" />
      </svg>
    );
  if (name === "external")
    return (
      <svg {...common}>
        <path d="M14 5h5v5M19 5l-8 8" />
        <path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M8 4h8l3 4v8l-3 4H8l-3-4V8l3-4Z" />
      <path d="M9 9v6m6-6v6" />
    </svg>
  );
}

function ProductGlyph({ kind }: { kind: ProductOffer["icon"] }) {
  if (kind === "mouse")
    return (
      <svg viewBox="0 0 120 90" className="h-24 w-32" aria-hidden>
        <path
          d="M60 8c-20 0-34 15-34 38v8c0 20 14 30 34 30s34-10 34-30v-8C94 23 80 8 60 8Z"
          fill="#fafbf7"
          stroke="#17241d"
          strokeWidth="3"
        />
        <path d="M60 9v27m-9 1h18" stroke="#17241d" strokeWidth="3" />
        <rect x="56" y="19" width="8" height="13" rx="4" fill="#dff45c" />
      </svg>
    );
  if (kind === "speaker")
    return (
      <svg viewBox="0 0 120 90" className="h-24 w-32" aria-hidden>
        <rect x="31" y="8" width="58" height="75" rx="18" fill="#25342c" />
        <circle
          cx="60"
          cy="47"
          r="24"
          fill="#18251e"
          stroke="#dff45c"
          strokeWidth="3"
        />
        <circle cx="60" cy="47" r="8" fill="#dff45c" />
        <circle cx="50" cy="20" r="2" fill="#dff45c" />
      </svg>
    );
  return (
    <svg viewBox="0 0 120 90" className="h-24 w-32" aria-hidden>
      <ellipse cx="60" cy="72" rx="36" ry="9" fill="rgba(23,36,29,.12)" />
      <path
        d="M28 22c0-11 7-17 16-17s16 6 16 17v18c0 8-5 13-12 13s-12-5-12-13V25"
        fill="#f8faf5"
        stroke="#17241d"
        strokeWidth="3"
      />
      <path
        d="M92 22c0-11-7-17-16-17s-16 6-16 17v18c0 8 5 13 12 13s12-5 12-13V25"
        fill="#f8faf5"
        stroke="#17241d"
        strokeWidth="3"
      />
      <path
        d="M40 53v22m40-22v22"
        stroke="#17241d"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="44" cy="20" r="5" fill="#dff45c" />
      <circle cx="76" cy="20" r="5" fill="#dff45c" />
    </svg>
  );
}

function ProductListItem({
  offer,
  onBuy,
  index,
}: {
  offer: ProductOffer;
  onBuy: (o: ProductOffer) => void;
  index: number;
}) {
  const changeRate = addressChangesPer90Days(offer);
  const factorLabels: Record<keyof RankingFactors, string> = {
    trust: "Trust",
    quality: "Quality",
    value: "Value",
    delivery: "Delivery",
  };
  return (
    <li
      className="lift-in grid grid-cols-[40px_minmax(0,1fr)] gap-3 border-t border-[#e5e9e5] py-5 first:border-t-0 first:pt-0 last:pb-0"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <span
        className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold tabular-nums ${offer.ranking.rank === 1 ? "bg-[#dff45c] text-[#123e28] ring-4 ring-[#f2f8c8]" : "border border-[#d7ded8] bg-[#f6f8f4] text-[#526159]"}`}
        aria-label={`Rank ${offer.ranking.rank}`}
      >
        #{offer.ranking.rank}
      </span>
      <article>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-extrabold tracking-[-.02em]">
                {offer.title}
              </h3>
              <span className="rounded-full bg-[#eef3df] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.1em] text-[#31563d]">
                {offer.badge}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-[#5f6b64]">
              {offer.merchant} · <span className="text-[#9a681f]">★</span>{" "}
              {offer.rating} ({offer.reviewCount.toLocaleString()})
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-4 sm:block sm:text-right">
            <p className="text-xl font-extrabold tabular-nums">
              S${offer.price.toFixed(2)}
            </p>
            <p className="mt-1 text-xs font-extrabold tabular-nums text-[#1f5638]">
              {offer.ranking.overallScore}/100 procurement score
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm font-bold leading-5 text-[#31563d]">
          {offer.ranking.summary}
        </p>
        <dl
          className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
          aria-label={`Ranking factors for ${offer.title}`}
        >
          {(Object.keys(factorLabels) as Array<keyof RankingFactors>).map(
            (factor) => (
              <div
                key={factor}
                className="rounded-lg border border-[#e1e6e1] bg-[#f8faf7] px-2.5 py-2"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold">
                  <dt className="text-[#667269]">{factorLabels[factor]}</dt>
                  <dd className="tabular-nums text-[#26372d]">
                    {offer.ranking.factors[factor]}
                  </dd>
                </div>
                <div
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e4e9e3]"
                  role="img"
                  aria-label={`${factorLabels[factor]} score ${offer.ranking.factors[factor]} out of 100`}
                >
                  <span
                    className="block h-full rounded-full bg-[#6f8f48]"
                    style={{ width: `${offer.ranking.factors[factor]}%` }}
                  />
                </div>
              </div>
            ),
          )}
        </dl>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-5 text-[#5f6b64] marker:text-[#8da09a]">
          <li>
            <span className="font-bold text-[#2d3832]">Why it fits:</span>{" "}
            {offer.reason}
          </li>
          <li>
            <span className="font-bold text-[#2d3832]">Delivery:</span>{" "}
            {offer.delivery}
          </li>
          <li>
            <span className="font-bold text-[#2d3832]">Source:</span>{" "}
            {offer.source.authority} · {offer.source.name}, checked{" "}
            {offer.source.checkedMinutesAgo} min ago
          </li>
          <li>
            <span className="font-bold text-[#2d3832]">Seller:</span>{" "}
            {offer.seller.successfulTransactions.toLocaleString()} successful
            transactions · {offer.seller.paymentAddressChanges} address{" "}
            {offer.seller.paymentAddressChanges === 1 ? "change" : "changes"} in{" "}
            {offer.seller.monitoringDays} days ({changeRate.toFixed(1)} / 90d)
          </li>
        </ul>
        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-xs font-extrabold text-[#1f5638]">
            <Icon name="shield" className="h-4 w-4" /> Trust screen passed
          </span>
          <button
            onClick={() => onBuy(offer)}
            className="focus-ring flex h-11 items-center gap-2 rounded-full bg-[#1f5638] px-4 text-sm font-extrabold text-white transition hover:bg-[#123e28]"
            aria-label={`Pick ${offer.title}`}
          >
            Select #{offer.ranking.rank} <Icon name="arrow" className="h-4 w-4" />
          </button>
        </div>
      </article>
    </li>
  );
}

const suggestions = [
  "Wireless earbuds under $30 with fast delivery",
  "A quiet mouse under $30",
  "A portable speaker with strong reviews",
];

function BudgetSelector({
  value,
  max,
  fees,
  transactionLimit,
  onChange,
  compact = false,
}: {
  value: number;
  max: number;
  fees: number;
  transactionLimit: number;
  onChange: (value: number) => void;
  compact?: boolean;
}) {
  const presets = [10, 15, 20, 25, max].filter(
    (amount, index, values) =>
      amount <= max && values.indexOf(amount) === index,
  );
  if (compact)
    return (
      <div className="mb-3 rounded-xl border border-[#dce2dc] bg-[#f4f6f1] px-3 py-2">
        <div className="flex items-center gap-3">
          <label
            htmlFor="shopping-budget-compact"
            className="shrink-0 text-xs font-extrabold text-[#45534b]"
          >
            Budget
          </label>
          <input
            id="shopping-budget-compact"
            type="range"
            min="5"
            max={max}
            step="0.5"
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            className="h-11 min-w-0 flex-1 accent-[#1f5638]"
          />
          <output
            htmlFor="shopping-budget-compact"
            className="min-w-[72px] rounded-lg bg-white px-2.5 py-1.5 text-center text-sm font-extrabold tabular-nums text-[#1f5638]"
          >
            S${value.toFixed(2)}
          </output>
        </div>
      </div>
    );
  return (
    <section
      className="rounded-2xl border border-[#d8dfd8] bg-[#f5f7f2] p-4"
      aria-labelledby="budget-heading"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="budget-heading" className="text-sm font-extrabold">
            Set your product budget
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#707b74]">
            Recommendations will not exceed this amount.
          </p>
        </div>
        <output
          htmlFor="shopping-budget"
          className="rounded-xl bg-white px-3 py-2 text-lg font-extrabold tabular-nums text-[#1f5638] shadow-sm"
        >
          S${value.toFixed(2)}
        </output>
      </div>
      <input
        id="shopping-budget"
        aria-label="Maximum product budget"
        type="range"
        min="5"
        max={max}
        step="0.5"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 h-11 w-full accent-[#1f5638]"
      />
      <div className="mt-2 flex gap-1.5">
        {presets.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onChange(amount)}
            aria-pressed={value === amount}
            className={`focus-ring min-h-11 flex-1 rounded-lg px-2 text-xs font-extrabold transition ${value === amount ? "bg-[#1f5638] text-white" : "border border-[#d8ded8] bg-white text-[#5f6b64] hover:border-[#9dac9d]"}`}
          >
            {amount === max ? "Max" : `S$${amount}`}
          </button>
        ))}
      </div>
      <p className="mt-3 flex items-start gap-2 text-[11px] font-semibold leading-4 text-[#78827c]">
        <Icon name="shield" className="h-4 w-4 shrink-0" /> Up to S$
        {fees.toFixed(2)} is reserved for estimated fees, keeping the final
        charge within your S${transactionLimit.toFixed(2)} transaction limit.
      </p>
    </section>
  );
}

function ProcurementComposer({
  query,
  setQuery,
  loading,
  onSubmit,
}: {
  query: string;
  setQuery: (value: string) => void;
  loading: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="w-full">
      <label htmlFor="shopping-request" className="sr-only">
        What should I procure?
      </label>
      <div className="rounded-[22px] border border-[#d2d9d3] bg-white p-2 shadow-[0_10px_35px_rgba(23,36,29,.09)] focus-within:border-[#76936d]">
        <textarea
          id="shopping-request"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          rows={2}
          className="min-h-[64px] w-full resize-none border-0 bg-transparent px-3 py-2 text-base font-semibold leading-6 outline-none placeholder:font-medium placeholder:text-[#929b95]"
          placeholder="What do you need me to procure?"
        />
        <div className="flex items-center justify-between gap-3 px-1 pb-1">
          <span className="hidden text-xs font-medium text-[#8a938d] sm:block">
            Add preferences, brands, or a delivery deadline
          </span>
          <button
            disabled={loading || !query.trim()}
            aria-label={loading ? "Agent is procuring" : "Send request"}
            className="focus-ring ml-auto flex h-11 items-center gap-2 rounded-xl bg-[#1f5638] px-4 text-sm font-extrabold text-white transition hover:bg-[#123e28] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>{loading ? "Working" : "Send"}</span>
            <Icon name="arrow" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </form>
  );
}

function PurchasePanel({
  offer,
  transactionLimitSgd,
  onClose,
}: {
  offer: ProductOffer;
  transactionLimitSgd: number;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<
    "checking" | "approval" | "paying" | "complete"
  >("checking");
  const [step, setStep] = useState(0);
  const [card, setCard] = useState<SandboxCardResult | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const shipping = 1.99,
    fees = 0.5,
    total = offer.price + shipping + fees;
  useEffect(() => {
    if (phase !== "checking") return;
    const id = setInterval(
      () =>
        setStep((s) => {
          if (s >= purchaseSteps.length - 1) {
            clearInterval(id);
            setTimeout(() => setPhase("approval"), 500);
            return s;
          }
          return s + 1;
        }),
      480,
    );
    return () => clearInterval(id);
  }, [phase]);
  async function approve() {
    setPaymentError("");
    setPhase("paying");
    try {
      const issued = await issueSandboxCard(
        Number(total.toFixed(2)),
        "Agent Lane",
      );
      setCard(issued.result);
      setPhase("complete");
    } catch (error) {
      setPaymentError(
        error instanceof Error ? error.message : "Card issuance failed.",
      );
      setPhase("approval");
    }
  }
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#17241d]/35 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Purchase details"
    >
      <button
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close purchase panel"
      />
      <section className="lift-in relative z-10 flex h-full w-full max-w-[470px] flex-col overflow-y-auto bg-[#fbfcf8] shadow-[-20px_0_60px_rgba(23,36,29,.18)]">
        <div className="flex items-center justify-between border-b border-[#dfe4df] px-6 py-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#67716b]">
              Agent checkout
            </p>
            <h2 className="mt-1 text-xl font-extrabold">
              {phase === "complete"
                ? "Purchase complete"
                : phase === "checking"
                  ? "Preparing your order"
                  : "Approve payment"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-[#dfe4df] bg-white text-xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex-1 p-6">
          {phase === "checking" && (
            <div className="lift-in">
              <div className="rounded-2xl border border-[#dfe4df] bg-white p-5">
                <p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#1f5638]">
                  Agent working
                </p>
                <h3 className="mt-2 text-xl font-extrabold">
                  Preparing {offer.title}
                </h3>
              </div>
              <ol className="mt-6 space-y-1">
                {purchaseSteps.map((label, i) => (
                  <li key={label} className="flex min-h-14 items-center gap-4">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${i <= step ? "bg-[#1f5638] text-white" : "border border-[#dfe4df] bg-white text-[#a3aaa5]"}`}
                    >
                      {i < step ? (
                        <Icon name="check" className="h-4 w-4" />
                      ) : i === step ? (
                        <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                      ) : (
                        <span className="text-xs font-bold">{i + 1}</span>
                      )}
                    </span>
                    <span
                      className={`text-sm font-bold ${i <= step ? "text-[#17241d]" : "text-[#89918c]"}`}
                    >
                      {label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {(phase === "approval" || phase === "paying") && (
            <div className="lift-in">
              <div className="flex items-center gap-4 rounded-2xl border border-[#dfe4df] bg-white p-4">
                <div
                  className="product-art flex h-20 w-20 shrink-0 items-center justify-center rounded-xl"
                  style={
                    { "--art-color": offer.artColor } as React.CSSProperties
                  }
                >
                  <ProductGlyph kind={offer.icon} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#67716b]">
                    Rank #{offer.ranking.rank} · {offer.ranking.overallScore}/100
                    score · {offer.merchant}
                  </p>
                  <h3 className="mt-1 font-extrabold">{offer.title}</h3>
                  <p className="mt-1 text-xs text-[#67716b]">
                    Delivering to Home · Singapore
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-[#cddfcf] bg-[#f7faf3] p-4">
                <div className="flex items-center gap-2 font-extrabold text-[#1f5638]">
                  <Icon name="shield" className="h-5 w-5" /> Seller trust
                  rechecked
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-[#526159]">
                  {offer.source.authority}, checked{" "}
                  {offer.source.checkedMinutesAgo} min ago.{" "}
                  {offer.seller.successfulTransactions.toLocaleString()}{" "}
                  successful transactions and{" "}
                  {offer.seller.paymentAddressChanges} payment address{" "}
                  {offer.seller.paymentAddressChanges === 1
                    ? "change"
                    : "changes"}{" "}
                  across {offer.seller.monitoringDays} monitored days.
                </p>
              </div>
              <div className="mt-5 rounded-2xl border border-[#dfe4df] bg-white p-5">
                <h3 className="font-extrabold">Payment summary</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[#67716b]">Product</dt>
                    <dd>S${offer.price.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#67716b]">Shipping</dt>
                    <dd>S${shipping.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#67716b]">Service fee</dt>
                    <dd>S${fees.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-[#dfe4df] pt-4 text-base font-extrabold">
                    <dt>Sandbox card value</dt>
                    <dd>{total.toFixed(2)} XSGD</dd>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-[#67716b]">
                    <dt>User transaction limit</dt>
                    <dd>≤ S${transactionLimitSgd.toFixed(2)}</dd>
                  </div>
                </dl>
              </div>
              <div className="mt-5 flex gap-3 rounded-2xl bg-[#f2f8c8] p-4 text-[#123e28]">
                <Icon name="shield" className="h-5 w-5 shrink-0" />
                <p className="text-xs font-semibold leading-5">
                  MetaMask will switch to Avalanche Fuji and sign a gasless
                  EIP-3009 authorization. The XSGD MCP server will settle test
                  XSGD and issue a non-spendable sandbox Visa.
                </p>
              </div>
              {total > transactionLimitSgd && (
                <p role="alert" className="mt-4 text-sm font-bold text-red-700">
                  This exceeds the user&apos;s S$
                  {transactionLimitSgd.toFixed(2)} per-transaction limit.
                </p>
              )}
              {paymentError && (
                <p
                  role="alert"
                  className="mt-4 text-sm font-bold leading-5 text-red-700"
                >
                  {paymentError}
                </p>
              )}
              <button
                onClick={approve}
                disabled={phase === "paying" || total > transactionLimitSgd}
                className="focus-ring mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#1f5638] font-extrabold text-white transition hover:bg-[#123e28] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="wallet" />
                {phase === "paying"
                  ? "Sign in MetaMask…"
                  : `Approve S$${total.toFixed(2)} payment`}
              </button>
            </div>
          )}
          {phase === "complete" && card && (
            <div className="lift-in text-center">
              <div className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-[#dff45c] text-[#123e28]">
                <Icon name="check" className="h-9 w-9" />
              </div>
              <p className="mt-6 text-xs font-extrabold uppercase tracking-[.16em] text-[#1f5638]">
                Sandbox Visa issued
              </p>
              <h3 className="mt-2 text-2xl font-extrabold">
                S${total.toFixed(2)} temporary card
              </h3>
              <p className="mt-2 text-sm text-[#67716b]">
                Paid with test XSGD · Avalanche Fuji
              </p>
              <div className="mt-8 rounded-2xl border border-[#dfe4df] bg-white p-5 text-left">
                <div className="border-b border-[#edf0ed] pb-4">
                  <span className="text-xs text-[#67716b]">Card ID</span>
                  <p className="mt-1 break-all text-sm font-bold">
                    {card.card_opaque_id}
                  </p>
                </div>
                <div className="py-4">
                  <span className="text-xs text-[#67716b]">
                    Settlement transaction
                  </span>
                  <p className="mt-1 break-all text-sm font-bold">
                    {card.settlement_tx.slice(0, 14)}…
                    {card.settlement_tx.slice(-8)}
                  </p>
                </div>
                <a
                  href={`https://testnet.snowtrace.io/tx/${card.settlement_tx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#dfe4df] text-sm font-extrabold"
                >
                  View settlement <Icon name="external" className="h-4 w-4" />
                </a>
                {card.card_html && /^https:\/\//.test(card.card_html) && (
                  <a
                    href={card.card_html}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1f5638] text-sm font-extrabold text-white"
                  >
                    Open secure card{" "}
                    <Icon name="external" className="h-4 w-4" />
                  </a>
                )}
              </div>
              <button
                onClick={onClose}
                className="focus-ring mt-6 h-12 w-full rounded-full bg-[#17241d] font-extrabold text-white"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function CommerceWorkspace({
  initialBudgetPolicy,
}: {
  initialBudgetPolicy: BudgetPolicy;
}) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse>({
    ...initial,
    budgetPolicy: initialBudgetPolicy,
  });
  const maximumSelectableBudget =
    Math.floor(
      Math.max(
        5,
        data.budgetPolicy.effectiveTransactionLimitSgd -
          data.budgetPolicy.estimatedFeesSgd,
      ) * 2,
    ) / 2;
  const [shoppingBudget, setShoppingBudget] = useState(
    () =>
      Math.floor(
        Math.max(
          5,
          initialBudgetPolicy.effectiveTransactionLimitSgd -
            initialBudgetPolicy.estimatedFeesSgd,
        ) * 2,
      ) / 2,
  );
  const [submittedBudget, setSubmittedBudget] = useState(shoppingBudget);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [hasConversation, setHasConversation] = useState(false);
  const [stage, setStage] = useState<AgentStage>("ready");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ProductOffer | null>(null);
  const resultLabel = `${data.offers.length} trusted options across ${new Set(data.offers.map((offer) => offer.merchant)).size} stores`;
  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = query.trim();
    if (!message || loading) return;
    setSubmittedQuery(message);
    setSubmittedBudget(shoppingBudget);
    setHasConversation(true);
    setLoading(true);
    setError("");
    setStage("thinking");
    const findingTimer = window.setTimeout(() => setStage("finding"), 420);
    const procuringTimer = window.setTimeout(() => setStage("procuring"), 900);
    try {
      const [response] = await Promise.all([
        fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, maxBudget: shoppingBudget }),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 1450)),
      ]);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      setData(json);
      setStage("ready");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Search failed. Please try again.",
      );
      setStage("ready");
    } finally {
      window.clearTimeout(findingTimer);
      window.clearTimeout(procuringTimer);
      setLoading(false);
    }
  }
  const activeStep = agentSteps.findIndex((step) => step.id === stage);
  return (
    <main className="flex min-h-dvh flex-col bg-[#f8f9f5]">
      <header className="sticky top-0 z-40 border-b border-[#e1e5e1] bg-[#f8f9f5]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4 sm:px-6">
          <a
            href="#"
            className="focus-ring flex items-center gap-2.5 rounded-lg font-extrabold tracking-[-.03em]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1f5638] text-[#dff45c]">
              <Icon name="spark" className="h-4 w-4" />
            </span>
            <span className="text-lg">AgentLane</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs font-bold text-[#68736c] sm:flex">
              <span className="h-2 w-2 rounded-full bg-[#8aaa3e]" /> Procurement
              agent ready
            </span>
            <WalletButton />
          </div>
        </div>
      </header>
      {!hasConversation ? (
        <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center px-4 pb-16 pt-10 sm:px-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f2c5] text-[#1f5638]">
            <Icon name="spark" className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-center text-[clamp(2rem,6vw,3.4rem)] font-extrabold leading-[1.05] tracking-[-.055em]">
            What should I procure?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-center text-base leading-7 text-[#68736c]">
            Describe what you need. I&apos;ll simulate suitable products, assess
            the data and sellers, and handle checkout after you choose.
          </p>
          <div className="mt-6">
            <BudgetSelector
              value={shoppingBudget}
              max={maximumSelectableBudget}
              fees={data.budgetPolicy.estimatedFeesSgd}
              transactionLimit={data.budgetPolicy.effectiveTransactionLimitSgd}
              onChange={setShoppingBudget}
            />
          </div>
          <div className="mt-3">
            <ProcurementComposer
              query={query}
              setQuery={setQuery}
              loading={loading}
              onSubmit={submit}
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setQuery(suggestion)}
                className="focus-ring min-h-12 rounded-xl border border-[#dde2dd] bg-white px-3 py-2 text-left text-xs font-bold leading-5 text-[#58655e] transition hover:border-[#aebcae] hover:bg-[#fbfcf9]"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-[#87908a]">
            <Icon name="shield" className="h-4 w-4" /> Recommendations are
            trust-screened before comparison
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <section
            className="mx-auto w-full max-w-[880px] flex-1 space-y-9 px-4 py-8 sm:px-6 sm:py-10"
            aria-label="Procurement conversation"
          >
            <div className="flex justify-end">
              <div className="max-w-[85%]">
                <div className="rounded-[20px] rounded-br-md bg-[#e9ece7] px-4 py-3 text-sm font-semibold leading-6 text-[#26332c] sm:text-base">
                  {submittedQuery}
                </div>
                <p className="mt-2 text-right text-[11px] font-extrabold text-[#748078]">
                  Product budget · S${submittedBudget.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 sm:grid-cols-[42px_minmax(0,1fr)] sm:gap-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1f5638] text-[#dff45c] sm:h-10 sm:w-10">
                <Icon name="spark" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="mb-3 text-xs font-extrabold text-[#34433a]">
                  AgentLane
                </p>
                {loading ? (
                  <ol
                    className="space-y-2"
                    aria-label="Agent progress"
                    aria-live="polite"
                  >
                    {agentSteps.map((step, index) => {
                      const complete = index < activeStep;
                      const active = index === activeStep;
                      return (
                        <li
                          key={step.id}
                          className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${active ? "bg-[#eef4dc]" : ""}`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${complete ? "border-[#1f5638] bg-[#1f5638] text-white" : active ? "border-[#74903f] text-[#1f5638]" : "border-[#d8ddd9] text-[#9ba39e]"}`}
                          >
                            {complete ? (
                              <Icon name="check" className="h-3 w-3" />
                            ) : active ? (
                              <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            )}
                          </span>
                          <span>
                            <span
                              className={`block text-sm font-extrabold ${complete || active ? "text-[#24332b]" : "text-[#909993]"}`}
                            >
                              {step.label}
                              {active && (
                                <span
                                  className="thinking-dots"
                                  aria-hidden="true"
                                />
                              )}
                            </span>
                            <span className="mt-0.5 block text-xs leading-5 text-[#78837c]">
                              {step.detail}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  !error && (
                    <div className="lift-in">
                      <div className="flex flex-wrap gap-2">
                        {agentSteps.map((step) => (
                          <span
                            key={step.id}
                            className="flex items-center gap-1.5 rounded-full bg-[#edf3dc] px-2.5 py-1 text-[11px] font-extrabold text-[#31563d]"
                          >
                            <Icon name="check" className="h-3 w-3" />
                            {step.label}
                          </span>
                        ))}
                      </div>
                      <p className="mt-4 text-sm leading-6 text-[#46534c]">
                        I found{" "}
                        <strong className="text-[#17241d]">
                          {resultLabel}
                        </strong>
                        . Each passed checks for source recency and authority,
                        seller transaction history, and payment-address
                        stability.
                      </p>
                      <p className="mt-2 flex items-start gap-2 rounded-lg bg-[#f4f1e8] px-3 py-2 text-xs font-semibold leading-5 text-[#6c5b37]">
                        <Icon
                          name="clock"
                          className="mt-0.5 h-4 w-4 shrink-0"
                        />
                        {data.generation.disclaimer}
                      </p>
                      <div className="mt-5 rounded-2xl border border-[#dce3dd] bg-white p-4 shadow-[0_8px_28px_rgba(23,36,29,.04)] sm:p-5">
                        <div className="flex flex-col gap-2 border-b border-[#e5e9e5] pb-4 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#1f5638]">
                              Ranked products
                            </p>
                            <h2 className="mt-1 text-xl font-extrabold tracking-[-.03em]">
                              Compare, select, then I&apos;ll check out
                            </h2>
                          </div>
                          <div className="text-xs font-semibold leading-5 text-[#6b766f] sm:text-right">
                            <p>Request budget ≤ S${data.intent.maxBudget}</p>
                            <p>
                              Transaction limit ≤ S$
                              {data.budgetPolicy.effectiveTransactionLimitSgd.toFixed(
                                2,
                              )}
                            </p>
                          </div>
                        </div>
                        {data.offers.length > 0 && (
                          <details className="mt-4 rounded-xl border border-[#dfe5df] bg-[#f7f9f5] px-3.5 py-3 text-xs text-[#59665e]">
                            <summary className="focus-ring cursor-pointer rounded-md font-extrabold text-[#31563d]">
                              How procurement ranking works
                            </summary>
                            <p className="mt-2 leading-5">
                              Trust screening is mandatory. Passing products are
                              then ranked using your request priorities: trust{" "}
                              {data.offers[0].ranking.weights.trust}%, quality{" "}
                              {data.offers[0].ranking.weights.quality}%, value{" "}
                              {data.offers[0].ranking.weights.value}%, and delivery{" "}
                              {data.offers[0].ranking.weights.delivery}%. Ties favor
                              the safer seller, then the lower price.
                            </p>
                          </details>
                        )}
                        {data.offers.length ? (
                          <ol
                            className="mt-5"
                            aria-label="Products ranked best to worst"
                          >
                            {data.offers.map((offer, index) => (
                              <ProductListItem
                                key={offer.id}
                                offer={offer}
                                index={index}
                                onBuy={setSelected}
                              />
                            ))}
                          </ol>
                        ) : (
                          <div className="py-10 text-center">
                            <p className="font-extrabold">
                              No simulated offers fit the budget and transaction
                              limit.
                            </p>
                            <p className="mt-2 text-sm text-[#67716b]">
                              Try a lower-cost product or ask an administrator
                              to review the limit.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
                  >
                    {error}
                  </p>
                )}
              </div>
            </div>
          </section>
          <div className="sticky bottom-0 border-t border-[#e5e9e5] bg-[#f8f9f5]/95 px-4 pb-4 pt-3 backdrop-blur sm:px-6">
            <div className="mx-auto max-w-[820px]">
              <BudgetSelector
                compact
                value={shoppingBudget}
                max={maximumSelectableBudget}
                fees={data.budgetPolicy.estimatedFeesSgd}
                transactionLimit={
                  data.budgetPolicy.effectiveTransactionLimitSgd
                }
                onChange={setShoppingBudget}
              />
              <ProcurementComposer
                query={query}
                setQuery={setQuery}
                loading={loading}
                onSubmit={submit}
              />
              <p className="mt-2 text-center text-[11px] font-medium text-[#89918c]">
                Choose a recommendation and the agent will prepare checkout for
                your approval.
              </p>
            </div>
          </div>
        </div>
      )}
      {selected && (
        <PurchasePanel
          offer={selected}
          transactionLimitSgd={data.budgetPolicy.effectiveTransactionLimitSgd}
          onClose={() => setSelected(null)}
        />
      )}{" "}
    </main>
  );
}
