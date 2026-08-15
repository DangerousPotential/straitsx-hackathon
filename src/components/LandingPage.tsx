import Link from "next/link";
import { HandoffRedirect } from "@/components/HandoffRedirect";

type IconName =
  | "arrow"
  | "browser"
  | "card"
  | "check"
  | "chevron"
  | "globe"
  | "lock"
  | "search"
  | "shield"
  | "spark"
  | "wallet";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const props = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "spark") return <svg {...props}><path d="m12 3 1.3 4.2a5 5 0 0 0 3.4 3.4L21 12l-4.3 1.4a5 5 0 0 0-3.4 3.4L12 21l-1.3-4.2a5 5 0 0 0-3.4-3.4L3 12l4.3-1.4a5 5 0 0 0 3.4-3.4L12 3Z" /></svg>;
  if (name === "arrow") return <svg {...props}><path d="M5 12h14m-5-5 5 5-5 5" /></svg>;
  if (name === "chevron") return <svg {...props}><path d="m9 18 6-6-6-6" /></svg>;
  if (name === "check") return <svg {...props}><path d="m5 12 4 4L19 6" /></svg>;
  if (name === "search") return <svg {...props}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
  if (name === "shield") return <svg {...props}><path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
  if (name === "wallet") return <svg {...props}><path d="M4 7h14a2 2 0 0 1 2 2v9H6a2 2 0 0 1-2-2V7Z" /><path d="M5 7 16 4v3m0 5h4" /></svg>;
  if (name === "card") return <svg {...props}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h4" /></svg>;
  if (name === "browser") return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 8h18M7 6h.01M10 6h.01" /></svg>;
  if (name === "globe") return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
  return <svg {...props}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>;
}

const features = [
  {
    icon: "search" as const,
    eyebrow: "Discover",
    title: "Procurement, not just search",
    body: "Turns a plain-language request into ranked Singapore marketplace options, balancing budget, seller evidence, reviews, and delivery fit.",
    className: "lg:col-span-2",
  },
  {
    icon: "shield" as const,
    eyebrow: "Control",
    title: "Policy before payment",
    body: "Budget rules apply during discovery, quote creation, and card issuance—so constraints remain active across the full journey.",
    className: "",
  },
  {
    icon: "browser" as const,
    eyebrow: "Verify",
    title: "The checkout total wins",
    body: "The Chrome companion reads Shopee's rendered final total after quantity, vouchers, and shipping instead of trusting an earlier listing price.",
    className: "",
  },
  {
    icon: "wallet" as const,
    eyebrow: "Authorize",
    title: "Wallet-native approval",
    body: "MetaMask signs a time-limited EIP-3009 authorization for XSGD on Avalanche Fuji. The user sees and approves the value first.",
    className: "lg:col-span-2",
  },
];

const steps = [
  ["01", "Describe the intent", "Tell AgentLane what you need, what matters, and the maximum budget."],
  ["02", "Review ranked options", "Compare concise recommendations grounded in live or clearly labeled demo data."],
  ["03", "Verify at checkout", "The browser companion captures Shopee's authoritative final total."],
  ["04", "Authorize, then confirm", "Create a checkout-sized sandbox card and keep final payment behind your explicit action."],
];

export function LandingPage() {
  return (
    <main className="landing-shell min-h-dvh overflow-hidden bg-[#f6f7f2] text-[#17241d]">
      <HandoffRedirect />
      <a href="#main-content" className="focus-ring sr-only z-50 bg-white px-4 py-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-[#dfe4df]/80 bg-[#f6f7f2]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="focus-ring flex min-h-11 items-center gap-2.5 rounded-xl font-extrabold tracking-[-.035em]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1f5638] text-[#dff45c] shadow-[0_8px_24px_rgba(31,86,56,.18)]">
              <Icon name="spark" className="h-[18px] w-[18px]" />
            </span>
            <span className="text-lg">AgentLane</span>
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-7 md:flex">
            <a href="#features" className="focus-ring rounded-md text-sm font-bold text-[#526159] transition-colors hover:text-[#17241d]">Features</a>
            <a href="#how-it-works" className="focus-ring rounded-md text-sm font-bold text-[#526159] transition-colors hover:text-[#17241d]">How it works</a>
            <a href="#safety" className="focus-ring rounded-md text-sm font-bold text-[#526159] transition-colors hover:text-[#17241d]">Safety</a>
          </nav>

          <Link href="/agent" className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#1f5638] px-4 text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(31,86,56,.18)] transition hover:bg-[#123e28] active:scale-[.98] sm:px-5">
            Launch agent <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div id="main-content">
        <section className="relative">
          <div className="landing-grid absolute inset-0 opacity-55" aria-hidden />
          <div className="absolute left-[6%] top-16 h-64 w-64 rounded-full bg-[#dff45c]/20 blur-3xl" aria-hidden />
          <div className="relative mx-auto grid max-w-[1180px] items-center gap-14 px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:grid-cols-[1.02fr_.98fr] lg:px-8 lg:pb-32 lg:pt-28">
            <div className="max-w-[690px]">
              <div className="lift-in inline-flex min-h-9 items-center gap-2 rounded-full border border-[#cbd8c9] bg-white/80 px-3.5 text-xs font-extrabold uppercase tracking-[.12em] text-[#31563d] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#668d1f]" aria-hidden />
                Agentic commerce · human confirmed
              </div>
              <h1 className="mt-6 text-[clamp(3.25rem,8vw,6.9rem)] font-extrabold leading-[.91] tracking-[-.075em] text-balance">
                From intent to checkout, in one guarded lane.
              </h1>
              <p className="mt-7 max-w-2xl text-lg font-medium leading-8 text-[#5f6b64] sm:text-xl sm:leading-9">
                AgentLane finds the right product, verifies the live checkout total, enforces your budget, and coordinates an XSGD sandbox payment—without taking control away from you.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/agent" className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#1f5638] px-7 text-base font-extrabold text-white shadow-[0_14px_34px_rgba(31,86,56,.22)] transition hover:-translate-y-0.5 hover:bg-[#123e28] active:translate-y-0">
                  Start procuring <Icon name="arrow" />
                </Link>
                <a href="#how-it-works" className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-[#cfd7cf] bg-white/80 px-7 text-base font-extrabold text-[#26372d] transition hover:border-[#9eafa0] hover:bg-white">
                  See how it works <Icon name="chevron" className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-[#67716b]">
                {["No autonomous purchases", "S$30 sandbox ceiling", "Final action stays yours"].map((item) => (
                  <span key={item} className="flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-[#4f7621]" />{item}</span>
                ))}
              </div>
            </div>

            <div className="hero-console lift-in relative mx-auto w-full max-w-[560px] lg:ml-auto">
              <div className="absolute -left-6 top-24 hidden rounded-2xl border border-[#dce3dc] bg-white p-3 shadow-[0_16px_45px_rgba(23,36,29,.12)] sm:block" aria-hidden>
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#31563d]"><Icon name="shield" className="h-4 w-4" /> Budget enforced</div>
                <p className="mt-1 text-[11px] font-bold text-[#79837d]">S$20.00 limit</p>
              </div>
              <div className="rounded-[30px] border border-[#d4dcd5] bg-[#fbfcf8] p-2 shadow-[0_28px_80px_rgba(23,36,29,.15)]">
                <div className="overflow-hidden rounded-[24px] border border-[#e1e6e1] bg-white">
                  <div className="flex items-center justify-between border-b border-[#e5e9e5] px-5 py-4">
                    <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1f5638] text-[#dff45c]"><Icon name="spark" className="h-4 w-4" /></span><div><p className="text-sm font-extrabold">AgentLane</p><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#768179]">Procurement agent</p></div></div>
                    <span className="rounded-full bg-[#eef4dc] px-2.5 py-1 text-[10px] font-extrabold text-[#31563d]">READY</span>
                  </div>
                  <div className="bg-[#f7f8f4] p-5 sm:p-6">
                    <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[#e7eae5] px-4 py-3 text-sm font-bold leading-6 text-[#344039]">Find a reliable wireless mouse on Shopee under S$20.</div>
                    <div className="mt-5 flex gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1f5638] text-[#dff45c]"><Icon name="spark" className="h-4 w-4" /></span>
                      <div className="flex-1 rounded-2xl border border-[#dce3dd] bg-white p-4 shadow-[0_8px_24px_rgba(23,36,29,.05)]">
                        <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#1f5638]">Top ranked option</p><span className="text-xs font-extrabold tabular-nums">S$14.90</span></div>
                        <div className="mt-3 flex gap-3">
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[#eef2de] text-[#31563d]"><svg viewBox="0 0 80 64" className="h-14 w-16" aria-hidden><path d="M40 6C26 6 17 17 17 34v4c0 14 9 20 23 20s23-6 23-20v-4C63 17 54 6 40 6Z" fill="#fff" stroke="currentColor" strokeWidth="2"/><path d="M40 7v18m-6 1h12" stroke="currentColor" strokeWidth="2"/><rect x="37" y="13" width="6" height="10" rx="3" fill="#dff45c"/></svg></div>
                          <div className="min-w-0"><p className="font-extrabold leading-5">Silent wireless mouse</p><p className="mt-1 text-xs font-semibold leading-5 text-[#68736c]">4.8 rating · Local seller · In budget</p><div className="mt-2 flex gap-1.5"><span className="rounded-md bg-[#eff5e0] px-2 py-1 text-[9px] font-extrabold text-[#31563d]">BEST FIT</span><span className="rounded-md bg-[#f4f1e8] px-2 py-1 text-[9px] font-extrabold text-[#6c5b37]">LIVE</span></div></div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[["01", "Intent"], ["02", "Evidence"], ["03", "Policy"]].map(([number, label]) => <div key={number} className="rounded-xl border border-[#e1e6e1] bg-white px-3 py-2.5"><p className="text-[10px] font-extrabold text-[#849087]">{number}</p><p className="mt-1 text-xs font-extrabold">{label}</p></div>)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 right-5 rounded-2xl bg-[#dff45c] px-4 py-3 text-[#123e28] shadow-[0_16px_45px_rgba(49,86,61,.18)] sm:right-[-18px]" aria-hidden>
                <p className="text-[10px] font-extrabold uppercase tracking-[.11em]">User control</p><p className="mt-0.5 text-sm font-extrabold">Confirm before pay</p>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Technology integrations" className="border-y border-[#dfe4df] bg-white/70">
          <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-5 px-4 py-7 sm:px-6 lg:flex-row lg:justify-between lg:px-8">
            <p className="text-center text-[11px] font-extrabold uppercase tracking-[.16em] text-[#7a857d] lg:text-left">One flow across the commerce stack</p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-extrabold text-[#435249] sm:gap-x-10">
              {["BuyWhere", "OpenAI", "StraitsX", "Avalanche Fuji", "Chrome MV3"].map((name) => <span key={name}>{name}</span>)}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-[1180px]">
            <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
              <div><p className="section-kicker">Built for the last mile</p><h2 className="mt-4 max-w-xl text-[clamp(2.5rem,5vw,4.8rem)] font-extrabold leading-[.98] tracking-[-.06em] text-balance">The useful parts of an agent. None of the blind trust.</h2></div>
              <p className="max-w-xl text-lg font-medium leading-8 text-[#667269] lg:ml-auto">Most shopping assistants stop at recommendations. AgentLane continues through price verification and payment authorization, adding a deliberate checkpoint at every risky boundary.</p>
            </div>

            <div className="mt-14 grid gap-4 lg:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className={`feature-card group min-h-[310px] rounded-[26px] border border-[#dce3dc] bg-white p-6 shadow-[0_14px_40px_rgba(23,36,29,.045)] transition duration-300 hover:-translate-y-1 hover:border-[#b8c8b9] sm:p-8 ${feature.className}`}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf3dc] text-[#1f5638] transition group-hover:bg-[#dff45c]"><Icon name={feature.icon} className="h-6 w-6" /></div>
                  <p className="mt-8 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#6e7a72]">{feature.eyebrow}</p>
                  <h3 className="mt-2 text-2xl font-extrabold tracking-[-.04em]">{feature.title}</h3>
                  <p className="mt-4 max-w-xl text-[15px] font-medium leading-7 text-[#667269]">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 bg-[#17241d] px-4 py-24 text-white sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-[1180px]">
            <div className="grid gap-8 lg:grid-cols-2">
              <div><p className="section-kicker text-[#dff45c]">How it works</p><h2 className="mt-4 max-w-xl text-[clamp(2.5rem,5vw,4.8rem)] font-extrabold leading-[.98] tracking-[-.06em] text-balance">Four moments. Every one auditable.</h2></div>
              <p className="max-w-xl text-lg font-medium leading-8 text-[#b9c3bc] lg:ml-auto lg:self-end">The agent coordinates the journey. You retain the choices that matter: product, wallet authorization, card, and final confirmation.</p>
            </div>
            <ol className="mt-16 grid gap-px overflow-hidden rounded-[28px] border border-white/12 bg-white/12 md:grid-cols-2 lg:grid-cols-4">
              {steps.map(([number, title, body]) => (
                <li key={number} className="min-h-[300px] bg-[#17241d] p-7 sm:p-8">
                  <span className="font-mono text-xs font-bold text-[#dff45c]">{number}</span>
                  <h3 className="mt-20 text-xl font-extrabold tracking-[-.03em]">{title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-[#aeb9b2]">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="safety" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
            <div>
              <p className="section-kicker">Designed to stop safely</p>
              <h2 className="mt-4 text-[clamp(2.5rem,5vw,4.8rem)] font-extrabold leading-[.98] tracking-[-.06em] text-balance">Human control is a feature, not friction.</h2>
              <p className="mt-6 max-w-xl text-lg font-medium leading-8 text-[#667269]">AgentLane is a hackathon prototype for sandbox infrastructure. Its controls are intentionally visible so judges can inspect what the agent can—and cannot—do.</p>
              <Link href="/agent" className="focus-ring mt-8 inline-flex min-h-12 items-center gap-2 rounded-full border border-[#b9c7ba] bg-white px-5 text-sm font-extrabold text-[#1f5638] transition hover:border-[#7f9784]">Open the live workspace <Icon name="arrow" className="h-4 w-4" /></Link>
            </div>
            <div className="rounded-[30px] border border-[#d4ddd5] bg-white p-3 shadow-[0_24px_70px_rgba(23,36,29,.08)]">
              <div className="rounded-[23px] bg-[#f1f5e6] p-6 sm:p-8">
                <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f5638] text-[#dff45c]"><Icon name="lock" /></span><div><p className="font-extrabold">Guardrail status</p><p className="text-xs font-bold text-[#667269]">Active across the entire flow</p></div></div>
                <ul className="mt-7 space-y-3">
                  {[
                    ["Sandbox-only cards", "Cannot purchase real goods"],
                    ["Fresh checkout capture", "Expires after 30 minutes"],
                    ["Narrow browser access", "Shopee checkout domains only"],
                    ["Explicit final action", "No autonomous Place Order"],
                  ].map(([title, detail]) => <li key={title} className="flex items-start gap-3 rounded-2xl border border-[#dbe3d5] bg-white px-4 py-4"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dff45c] text-[#123e28]"><Icon name="check" className="h-3.5 w-3.5" /></span><div><p className="text-sm font-extrabold">{title}</p><p className="mt-1 text-xs font-semibold text-[#6e7972]">{detail}</p></div></li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1180px] overflow-hidden rounded-[32px] bg-[#dff45c] px-6 py-14 text-[#123e28] sm:px-12 sm:py-16 lg:flex lg:items-center lg:justify-between lg:gap-12">
            <div><p className="text-xs font-extrabold uppercase tracking-[.14em]">Ready for a guarded run?</p><h2 className="mt-3 max-w-3xl text-[clamp(2.25rem,5vw,4.6rem)] font-extrabold leading-[.96] tracking-[-.06em] text-balance">Give the agent an intent. Keep the authority.</h2></div>
            <Link href="/agent" className="focus-ring mt-8 inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-full bg-[#123e28] px-7 text-base font-extrabold text-white shadow-[0_14px_34px_rgba(18,62,40,.2)] transition hover:-translate-y-0.5 hover:bg-[#17241d] lg:mt-0">Launch AgentLane <Icon name="arrow" /></Link>
          </div>
        </section>
      </div>

      <footer className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-5 border-t border-[#dfe4df] pt-8 text-sm font-semibold text-[#68736c] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 font-extrabold text-[#17241d]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1f5638] text-[#dff45c]"><Icon name="spark" className="h-4 w-4" /></span>AgentLane</div>
          <p>Hackathon prototype · Sandbox infrastructure · Singapore</p>
          <a href="https://github.com/DangerousPotential/straitsx-hackathon" target="_blank" rel="noreferrer" className="focus-ring min-h-11 rounded-lg py-3 font-extrabold text-[#31563d] hover:text-[#123e28]">View source on GitHub</a>
        </div>
      </footer>
    </main>
  );
}
