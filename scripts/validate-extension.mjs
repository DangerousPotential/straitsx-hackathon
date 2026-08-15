import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve("chrome-extension");
const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));
const failures = [];

if (manifest.manifest_version !== 3) failures.push("manifest_version must be 3");
const allowedHosts = new Set(["https://shopee.sg/*", "https://pay.shopee.sg/*"]);
for (const host of manifest.host_permissions || []) {
  if (!allowedHosts.has(host)) failures.push(`unexpected host permission: ${host}`);
}
const contentScripts = manifest.content_scripts || [];
if (contentScripts.length !== 1 || contentScripts[0]?.js?.[0] !== "price-verifier.js") failures.push("one guarded Shopee price verifier is required");
if (JSON.stringify(contentScripts[0]?.matches) !== JSON.stringify(["https://shopee.sg/*"])) failures.push("checkout content script must remain limited to shopee.sg");

const allowedPermissions = new Set(["activeTab", "scripting", "storage"]);
for (const permission of manifest.permissions || []) {
  if (!allowedPermissions.has(permission)) failures.push(`unexpected permission: ${permission}`);
}

for (const file of [manifest.action?.default_popup, "popup.css", "popup.js", "price-verifier.js", "README.md"]) {
  if (!file) {
    failures.push("manifest is missing its popup");
    continue;
  }
  try {
    await stat(resolve(root, file));
  } catch {
    failures.push(`missing file: ${file}`);
  }
}

for (const [file, forbidden] of [
  ["popup.js", ["chrome.cookies", "chrome.debugger", "chrome.webRequest", "document.cookie", "localStorage", "sessionStorage", ".innerHTML"]],
]) {
  const source = await readFile(resolve(root, file), "utf8");
  for (const token of forbidden) {
    if (source.includes(token)) failures.push(`${file} contains forbidden capability: ${token}`);
  }
}

const popupSource = await readFile(resolve(root, "popup.js"), "utf8");
for (const required of [
  'chrome.storage.session',
  'agentlaneShopeeCheckout',
  'agentlaneIssuedSandboxCard',
  'agentlaneCardSessionEvents',
  'agentlanePersistentSandboxCard',
  'chrome.storage.local',
  'appendCardEvent',
  'toggleCardDetails',
  'parseIssuedSandboxCard',
  'card_fields_recovered',
  'requestSandboxCardRecovery',
  'Recover and save card',
  'prepareShopeeCardPayment',
  'shopee_checkout_prepared',
  'blockedLabels',
  'readIssuedCardReferenceFromPage',
  'validIssuedCardReference',
  'captureShopeeCheckout',
  'application/ld+json',
  'priceCurrency',
  'checkoutMaxAgeMs',
  'checkoutId',
  'fuji-sandbox',
]) {
  if (!popupSource.includes(required)) failures.push(`popup.js is missing checkout safeguard: ${required}`);
}

const verifierSource = await readFile(resolve(root, "price-verifier.js"), "utf8");
for (const required of ["verify_price", "readStructuredProductPrice", "waitForStructuredProductPrice", "Live price verified", "No card has been issued", "Return verified price to AgentLane"]) {
  if (!verifierSource.includes(required)) failures.push(`price-verifier.js is missing verify-first safeguard: ${required}`);
}
for (const forbidden of ["autoCheckout === true", "buyNow.click", "checkout.click", "expectedPriceSgd", "Step 1 of 3"]) {
  if (verifierSource.includes(forbidden)) failures.push(`price-verifier.js contains legacy checkout automation: ${forbidden}`);
}

if (popupSource.includes("Math.min(...visiblePrices)")) {
  failures.push("popup.js must not treat the lowest visible Shopee number as the product price");
}

for (const forbiddenCheckoutField of ["recipientName", "deliveryAddress", "postalCode"]) {
  if (popupSource.includes(forbiddenCheckoutField)) failures.push(`popup.js must not retain checkout PII: ${forbiddenCheckoutField}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Manifest V3 card companion checks passed (session-bound checkout, user-invoked fill, no submit automation).")
}
