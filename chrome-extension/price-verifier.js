const legacyAutoCheckoutStorageKey = "agentlaneShopeeAutoCheckout";

function decodeAgentLanePayload(encoded) {
  const normalized = encoded.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0))));
}

function encodeAgentLanePayload(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function productIds(value) {
  try {
    const path = new URL(value, location.origin).pathname;
    const match = path.match(/-i\.(\d+)\.(\d+)/i) || path.match(/\/product\/(\d+)\/(\d+)/i);
    return match ? `${match[1]}:${match[2]}` : null;
  } catch { return null; }
}

function validPriceHandoff(value) {
  return Boolean(value && value.version === 3 && value.intent === "verify_price" && typeof value.offerId === "string" && typeof value.listingUrl === "string" && productIds(value.listingUrl) && productIds(value.listingUrl) === productIds(location.href));
}

function readStructuredProductPrice() {
  const money = (value) => {
    const number = Number(String(value || "").replaceAll(",", ""));
    return Number.isFinite(number) && number > 0 ? number : null;
  };
  const prices = [];
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const root = JSON.parse(script.textContent || "null");
      const queue = Array.isArray(root) ? [...root] : [root];
      while (queue.length) {
        const entry = queue.shift();
        if (!entry || typeof entry !== "object") continue;
        const types = Array.isArray(entry["@type"]) ? entry["@type"] : [entry["@type"]];
        if (types.includes("Product") && entry.offers) {
          for (const offer of Array.isArray(entry.offers) ? entry.offers : [entry.offers]) {
            if (!offer || (offer.priceCurrency && offer.priceCurrency !== "SGD")) continue;
            const exactPrice = money(offer.price);
            const lowPrice = money(offer.lowPrice);
            const highPrice = money(offer.highPrice);
            if (exactPrice !== null) prices.push(exactPrice);
            else if (lowPrice !== null && lowPrice === highPrice) prices.push(lowPrice);
          }
        }
        for (const value of Object.values(entry)) {
          if (value && typeof value === "object") queue.push(...(Array.isArray(value) ? value : [value]));
        }
      }
    } catch { /* Ignore malformed marketplace metadata. */ }
  }
  const uniquePrices = [...new Set(prices)];
  return uniquePrices.length === 1 ? uniquePrices[0] : null;
}

async function waitForStructuredProductPrice(timeoutMs = 8_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const price = readStructuredProductPrice();
    if (price !== null) return price;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

function showVerificationBanner(context, price) {
  document.querySelector("#agentlane-price-verification")?.remove();
  const banner = document.createElement("aside");
  banner.id = "agentlane-price-verification";
  banner.setAttribute("role", "status");
  banner.style.cssText = "position:fixed;right:20px;top:76px;z-index:2147483647;width:min(340px,calc(100vw - 40px));border:1px solid #cddfcf;border-radius:16px;background:#fff;padding:14px 16px;box-shadow:0 16px 40px rgba(23,36,29,.2);font:14px/1.45 Inter,system-ui,sans-serif;color:#17241d";
  const eyebrow = document.createElement("div");
  eyebrow.textContent = "AgentLane · live verification";
  eyebrow.style.cssText = "font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#1f5638";
  const heading = document.createElement("strong");
  heading.textContent = price === null ? "Select a variant to verify its price" : `Live price verified: S$${price.toFixed(2)}`;
  heading.style.cssText = "display:block;margin-top:3px;font-size:16px";
  const copy = document.createElement("p");
  copy.textContent = price === null ? "The extension found no single authoritative price. Select a variant, then reopen Card Companion." : "No card has been issued. Return this verified price to AgentLane before approving a sandbox card.";
  copy.style.cssText = "margin:5px 0 0;color:#637068;font-size:12px";
  banner.append(eyebrow, heading, copy);
  if (price !== null) {
    const quote = { version: 1, offerId: context.offerId, title: context.title, productPriceSgd: price, source: "product_page", capturedAt: new Date().toISOString() };
    const link = document.createElement("a");
    link.href = `http://localhost:3001/#lastMile=${encodeAgentLanePayload(quote)}`;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Return verified price to AgentLane";
    link.style.cssText = "display:flex;min-height:42px;margin-top:12px;align-items:center;justify-content:center;border-radius:999px;background:#1f5638;padding:0 14px;color:#fff;font-size:12px;font-weight:800;text-decoration:none";
    banner.append(link);
  }
  document.body.append(banner);
}

async function verifyAgentLanePrice() {
  await chrome.storage.local.remove(legacyAutoCheckoutStorageKey);
  const handoff = new URLSearchParams(location.hash.slice(1)).get("agentlane");
  if (!handoff) return;
  try {
    const context = decodeAgentLanePayload(handoff);
    if (!validPriceHandoff(context)) return;
    showVerificationBanner(context, await waitForStructuredProductPrice());
  } catch { /* Ignore malformed handoffs. */ }
}

verifyAgentLanePrice();
