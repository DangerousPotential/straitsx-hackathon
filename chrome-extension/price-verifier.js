const legacyAutoCheckoutStorageKey = "agentlaneShopeeAutoCheckout";
const contextStorageKey = "agentlaneProcurementContext";
const pendingCheckoutStorageKey = "agentlanePendingShopeeCheckout";
const cartTakeoverStorageKey = "agentlaneCartTakeover";
const agentLaneOrigin = "https://straitsx-hackathon.vercel.app";
let handledCheckoutUrl = "";
let handledCartUrl = "";

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
  copy.textContent = price === null ? "Select the intended variant before continuing. The purchase card will use Shopee's final checkout total." : "Choose the intended variant, then click Buy Now on Shopee. No card is created until the checkout total is verified.";
  copy.style.cssText = "margin:5px 0 0;color:#637068;font-size:12px";
  banner.append(eyebrow, heading, copy);
  document.body.append(banner);
}

function showCartAutomationBanner(totalSgd) {
  document.querySelector("#agentlane-price-verification")?.remove();
  const banner = document.createElement("aside");
  banner.id = "agentlane-price-verification";
  banner.setAttribute("role", "status");
  banner.style.cssText = "position:fixed;right:20px;top:76px;z-index:2147483647;width:min(340px,calc(100vw - 40px));border:1px solid #cddfcf;border-radius:16px;background:#fff;padding:14px 16px;box-shadow:0 16px 40px rgba(23,36,29,.2);font:14px/1.45 Inter,system-ui,sans-serif;color:#17241d";
  const eyebrow = document.createElement("div");
  eyebrow.textContent = "AgentLane · cart takeover";
  eyebrow.style.cssText = "font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#1f5638";
  const heading = document.createElement("strong");
  heading.textContent = `Opening checkout · S$${totalSgd.toFixed(2)}`;
  heading.style.cssText = "display:block;margin-top:3px;font-size:16px";
  const copy = document.createElement("p");
  copy.textContent = "Selected items detected. Card Companion will resume when Shopee renders the final checkout total.";
  copy.style.cssText = "margin:5px 0 0;color:#637068;font-size:12px";
  banner.append(eyebrow, heading, copy);
  document.body.append(banner);
}

async function continueFromAgentLaneCart() {
  if (!location.pathname.startsWith("/cart") || handledCartUrl === location.href) return;
  const saved = await chrome.storage.session.get(cartTakeoverStorageKey);
  const takeover = saved[cartTakeoverStorageKey];
  const activatedAt = new Date(takeover?.activatedAt).getTime();
  if (!Number.isFinite(activatedAt) || Date.now() - activatedAt > 10 * 60 * 1000) return;
  const startedAt = Date.now();
  while (Date.now() - startedAt < 12_000 && location.pathname.startsWith("/cart")) {
    const checkoutButton = [...document.querySelectorAll("button")].find((button) => /^Check Out$/i.test(String(button.textContent || "").replace(/\s+/g, " ").trim()) && !button.disabled);
    if (checkoutButton) {
      let region = checkoutButton.parentElement;
      let match = null;
      for (let depth = 0; depth < 5 && region; depth += 1, region = region.parentElement) {
        match = String(region.innerText || "").replace(/\s+/g, " ").match(/Total\s*\((\d+)\s*items?\)\s*:\s*(?:S\$|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
        if (match) break;
      }
      const itemCount = Number(match?.[1]);
      const totalSgd = Number(String(match?.[2] || "").replaceAll(",", ""));
      if (itemCount > 0 && Number.isFinite(totalSgd) && totalSgd > 0) {
        handledCartUrl = location.href;
        await chrome.storage.session.remove(cartTakeoverStorageKey);
        showCartAutomationBanner(totalSgd);
        checkoutButton.click();
        return;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

function captureCheckoutTotal(context) {
  if (location.hostname !== "shopee.sg" || !location.pathname.startsWith("/checkout")) return null;
  const money = (value) => {
    const number = Number(String(value || "").replaceAll(",", ""));
    return Number.isFinite(number) && number > 0 ? number : null;
  };
  const labelPatterns = [/^Total Payment\s*:?$/i, /^Grand Total\s*:?$/i, /^Order Total(?:\s*\([^)]*\))?\s*:?$/i];
  let totalSgd = null;
  for (const labelPattern of labelPatterns) {
    const labels = [...document.querySelectorAll("body *")].filter((element) => labelPattern.test(String(element.textContent || "").trim()) && element.children.length <= 1);
    for (const label of labels) {
      let region = label.parentElement;
      for (let depth = 0; depth < 3 && region; depth += 1, region = region.parentElement) {
        const values = [...String(region.innerText || "").matchAll(/(?:S\$|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/g)].map((match) => money(match[1])).filter((value) => value !== null);
        if (values.length) { totalSgd = values.at(-1); break; }
      }
      if (totalSgd !== null) break;
    }
    if (totalSgd !== null) break;
  }
  if (totalSgd === null) {
    const text = String(document.body?.innerText || "").replace(/\s+/g, " ");
    const matches = [...text.matchAll(/(?:Total Payment|Grand Total|Order Total(?:\s*\([^)]*\))?)\s*:?\s*(?:S\$|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi)];
    totalSgd = matches.map((match) => money(match[1])).filter((value) => value !== null).at(-1) ?? null;
  }
  if (!Number.isFinite(totalSgd)) return null;
  const itemLinks = new Set([...document.querySelectorAll('a[href*="-i."], a[href*="/product/"]')].map((anchor) => productIds(anchor.href)).filter(Boolean));
  return {
    version: 1,
    offerId: context?.offerId || "shopee-cart",
    title: context?.title || "Shopee cart checkout",
    totalSgd,
    itemCount: Math.max(1, itemLinks.size),
    currency: "SGD",
    checkoutPath: location.pathname,
    capturedAt: new Date().toISOString(),
  };
}

async function addCheckoutId(checkout) {
  const input = new TextEncoder().encode(JSON.stringify([checkout.offerId, checkout.totalSgd, checkout.itemCount, checkout.capturedAt]));
  const digest = await crypto.subtle.digest("SHA-256", input);
  return { ...checkout, checkoutId: [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 24) };
}

function showCheckoutBanner(checkout) {
  document.querySelector("#agentlane-price-verification")?.remove();
  const quote = { version: 1, offerId: checkout.offerId, title: checkout.title, checkoutTotalSgd: checkout.totalSgd, source: "checkout_total", capturedAt: checkout.capturedAt };
  const banner = document.createElement("aside");
  banner.id = "agentlane-price-verification";
  banner.setAttribute("role", "status");
  banner.style.cssText = "position:fixed;right:20px;top:76px;z-index:2147483647;width:min(340px,calc(100vw - 40px));border:1px solid #cddfcf;border-radius:16px;background:#fff;padding:14px 16px;box-shadow:0 16px 40px rgba(23,36,29,.2);font:14px/1.45 Inter,system-ui,sans-serif;color:#17241d";
  const eyebrow = document.createElement("div");
  eyebrow.textContent = "AgentLane · checkout verified";
  eyebrow.style.cssText = "font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#1f5638";
  const heading = document.createElement("strong");
  heading.textContent = `Ready to create card: S$${checkout.totalSgd.toFixed(2)}`;
  heading.style.cssText = "display:block;margin-top:3px;font-size:16px";
  const copy = document.createElement("p");
  copy.textContent = "Shopee's final total is captured. Card Companion is opening so you can choose a card.";
  copy.style.cssText = "margin:5px 0 0;color:#637068;font-size:12px";
  const link = document.createElement("a");
  link.href = `${agentLaneOrigin}/#lastMile=${encodeAgentLanePayload(quote)}`;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = `Purchase now · S$${checkout.totalSgd.toFixed(2)}`;
  link.style.cssText = "display:flex;min-height:44px;margin-top:12px;align-items:center;justify-content:center;border-radius:999px;background:#1f5638;padding:0 14px;color:#fff;font-size:12px;font-weight:800;text-decoration:none";
  banner.append(eyebrow, heading, copy, link);
  document.body.append(banner);
}

async function verifyAgentLaneCheckout() {
  if (handledCheckoutUrl === location.href) return;
  const saved = await chrome.storage.local.get(contextStorageKey);
  const context = saved[contextStorageKey];
  const validContext = context?.version === 3 && context.intent === "verify_price" && typeof context.offerId === "string" && productIds(context.listingUrl)
    ? context
    : null;
  const startedAt = Date.now();
  let captured = null;
  while (!captured && Date.now() - startedAt < 12_000) {
    captured = captureCheckoutTotal(validContext);
    if (!captured) await new Promise((resolve) => setTimeout(resolve, 300));
  }
  if (!captured) return;
  const checkout = await addCheckoutId(captured);
  await chrome.storage.local.set({ [pendingCheckoutStorageKey]: checkout });
  handledCheckoutUrl = location.href;
  showCheckoutBanner(checkout);
  await chrome.runtime.sendMessage({ type: "agentlane_checkout_captured", checkout }).catch(() => null);
}

async function verifyAgentLanePrice() {
  await chrome.storage.local.remove(legacyAutoCheckoutStorageKey);
  if (location.pathname.startsWith("/cart")) {
    await continueFromAgentLaneCart();
    return;
  }
  if (location.pathname.startsWith("/checkout")) {
    await verifyAgentLaneCheckout();
    return;
  }
  const handoff = new URLSearchParams(location.hash.slice(1)).get("agentlane");
  if (!handoff) return;
  try {
    const context = decodeAgentLanePayload(handoff);
    if (!validPriceHandoff(context)) return;
    await Promise.all([
      chrome.storage.local.set({ [contextStorageKey]: context }),
      chrome.storage.session.set({ [cartTakeoverStorageKey]: { activatedAt: new Date().toISOString(), offerId: context.offerId } }),
    ]);
    showVerificationBanner(context, await waitForStructuredProductPrice());
  } catch { /* Ignore malformed handoffs. */ }
}

let observedLocation = location.href;

function handleShopeeRoute() {
  document.querySelector("#agentlane-price-verification")?.remove();
  handledCheckoutUrl = "";
  if (!location.pathname.startsWith("/cart")) handledCartUrl = "";
  verifyAgentLanePrice().catch(() => {});
}

verifyAgentLanePrice();
setInterval(() => {
  if (observedLocation !== location.href) {
    observedLocation = location.href;
    handleShopeeRoute();
    return;
  }
  if (location.pathname.startsWith("/checkout") && handledCheckoutUrl !== location.href) verifyAgentLaneCheckout().catch(() => {});
}, 250);
