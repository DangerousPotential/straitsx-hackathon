const elements = {
  unsupported: document.querySelector("#unsupported"), agentlane: document.querySelector("#agentlane"), issuedCard: document.querySelector("#issued-card"), capture: document.querySelector("#capture"), noCard: document.querySelector("#no-card"), livePrice: document.querySelector("#live-price"), cardReady: document.querySelector("#card-ready"), complete: document.querySelector("#complete"), paymentComplete: document.querySelector("#payment-complete"), captureCard: document.querySelector("#capture-card"), captureError: document.querySelector("#capture-error"), showRecovery: document.querySelector("#show-recovery"), recoveryForm: document.querySelector("#recovery-form"), recoveryCardId: document.querySelector("#recovery-card-id"), recoverySettlement: document.querySelector("#recovery-settlement"), recoveryWallet: document.querySelector("#recovery-wallet"), recoveryAmount: document.querySelector("#recovery-amount"), recoverCard: document.querySelector("#recover-card"), recoveryError: document.querySelector("#recovery-error"), refreshPrice: document.querySelector("#refresh-price"), prepareCheckout: document.querySelector("#prepare-checkout"), automationProgress: document.querySelector("#automation-progress"), automationState: document.querySelector("#automation-state"), automationMessage: document.querySelector("#automation-message"), automationStepTotal: document.querySelector("#automation-step-total"), automationStepPayment: document.querySelector("#automation-step-payment"), automationStepCard: document.querySelector("#automation-step-card"), quoteHeading: document.querySelector("#quote-heading"), quoteCopy: document.querySelector("#quote-copy"), quoteResult: document.querySelector("#quote-result"), quoteLabel: document.querySelector("#quote-label"), quotePrice: document.querySelector("#quote-price"), quoteError: document.querySelector("#quote-error"), useAgentLane: document.querySelector("#use-agentlane"), checkoutCaptured: document.querySelector("#checkout-captured"), checkoutDetail: document.querySelector("#checkout-detail"), checkoutCardState: document.querySelector("#checkout-card-state"), checkoutCardHeading: document.querySelector("#checkout-card-heading"), checkoutCardCopy: document.querySelector("#checkout-card-copy"), paymentCardPicker: document.querySelector("#payment-card-picker"), paymentCardOptions: document.querySelector("#payment-card-options"), reviewPayment: document.querySelector("#review-payment"), paymentConfirmation: document.querySelector("#payment-confirmation"), paymentConfirmCard: document.querySelector("#payment-confirm-card"), paymentConfirmTotal: document.querySelector("#payment-confirm-total"), cancelPayment: document.querySelector("#cancel-payment"), confirmPayment: document.querySelector("#confirm-payment"), paymentError: document.querySelector("#payment-error"), addCardPicker: document.querySelector("#add-card-picker"), addCardOptions: document.querySelector("#add-card-options"), checkoutBinding: document.querySelector("#checkout-binding"), boundCheckoutTotal: document.querySelector("#bound-checkout-total"), boundCheckoutAge: document.querySelector("#bound-checkout-age"), checkoutGuide: document.querySelector("#checkout-guide"), fillCard: document.querySelector("#fill-card"), fillNote: document.querySelector("#fill-note"), fillError: document.querySelector("#fill-error"), fillAgain: document.querySelector("#fill-again"), forgetCard: document.querySelector("#forget-card"), forgetCardComplete: document.querySelector("#forget-card-complete"), issuedCardValue: document.querySelector("#issued-card-value"), issuedCardSettlement: document.querySelector("#issued-card-settlement"), openIssuedCard: document.querySelector("#open-issued-card"), forgetIssuedCard: document.querySelector("#forget-issued-card"), revealCard: document.querySelector("#reveal-card"), sensitiveCardDetails: document.querySelector("#sensitive-card-details"), cardFullNumber: document.querySelector("#card-full-number"), cardCvv: document.querySelector("#card-cvv"),
};
const cardStorageKey = "agentlaneSandboxCard";
const persistentCardStorageKey = "agentlanePersistentSandboxCard";
const cardVaultStorageKey = "agentlaneSandboxCardVault";
const issuedCardStorageKey = "agentlaneIssuedSandboxCard";
const cardEventStorageKey = "agentlaneCardSessionEvents";
const contextStorageKey = "agentlaneProcurementContext";
const checkoutStorageKey = "agentlaneShopeeCheckout";
const pendingCheckoutStorageKey = "agentlanePendingShopeeCheckout";
const checkoutMaxAgeMs = 30 * 60 * 1000;
let activeTab;
let activeUrl;
let sandboxCard;
let sandboxCards = [];
let issuedCardReference;
let procurementContext;
let checkoutSnapshot;
let selectedPaymentOption = null;

function showSection(section) {
  [elements.unsupported, elements.agentlane, elements.issuedCard, elements.capture, elements.noCard, elements.livePrice, elements.cardReady, elements.complete, elements.paymentComplete].forEach((element) => { element.hidden = element !== section; });
}
function hostMatches(url, hostname) { return url.hostname === hostname || url.hostname.endsWith(`.${hostname}`); }
function isAgentLane(url) { return url.hostname === "localhost" || url.hostname === "127.0.0.1"; }
function isStraitsCard(url) { return hostMatches(url, "straitsx.ai") && /card/i.test(`${url.hostname}${url.pathname}`); }
function isShopee(url) { return url.protocol === "https:" && hostMatches(url, "shopee.sg"); }
function isShopeeCardForm(url) { return url.hostname === "pay.shopee.sg" && url.pathname.startsWith("/payment-v2/add-card"); }
function isShopeeCheckout(url) { return url.hostname === "shopee.sg" && url.pathname.startsWith("/checkout"); }
function ageInMinutes(value) { return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000)); }

async function getSavedCard() {
  if (!globalThis.chrome?.storage) return null;
  const sessionResult = await chrome.storage.session.get(cardStorageKey);
  if (sessionResult[cardStorageKey]) return sessionResult[cardStorageKey];
  const localResult = await chrome.storage.local.get(persistentCardStorageKey);
  const saved = localResult[persistentCardStorageKey] || null;
  if (saved) await chrome.storage.session.set({ [cardStorageKey]: saved });
  return saved;
}
async function saveCard(card) {
  const savedCard = { ...card, cardId: card.cardId || crypto.randomUUID() };
  const vaultResult = await chrome.storage.local.get(cardVaultStorageKey);
  const vault = Array.isArray(vaultResult[cardVaultStorageKey]) ? vaultResult[cardVaultStorageKey] : [];
  const updatedVault = [...vault.filter((entry) => entry.cardId !== savedCard.cardId && entry.number !== savedCard.number), savedCard].slice(-5);
  await Promise.all([
    chrome.storage.session.set({ [cardStorageKey]: savedCard }),
    chrome.storage.local.set({ [persistentCardStorageKey]: savedCard, [cardVaultStorageKey]: updatedVault }),
  ]);
  sandboxCards = updatedVault;
  return savedCard;
}
async function getSavedCards() {
  if (!globalThis.chrome?.storage) return [];
  const result = await chrome.storage.local.get([cardVaultStorageKey, persistentCardStorageKey]);
  const vault = Array.isArray(result[cardVaultStorageKey]) ? result[cardVaultStorageKey] : [];
  const legacy = result[persistentCardStorageKey];
  if (legacy && !vault.some((card) => card.number === legacy.number)) vault.push({ ...legacy, cardId: legacy.cardId || crypto.randomUUID() });
  if (vault.length) await chrome.storage.local.set({ [cardVaultStorageKey]: vault.slice(-5) });
  return vault.slice(-5);
}
async function appendCardEvent(type, details = {}) {
  if (!globalThis.chrome?.storage?.session) return;
  const result = await chrome.storage.session.get(cardEventStorageKey);
  const events = Array.isArray(result[cardEventStorageKey]) ? result[cardEventStorageKey] : [];
  await chrome.storage.session.set({
    [cardEventStorageKey]: [...events.slice(-19), { type, ...details, at: new Date().toISOString() }],
  });
}
async function getSavedIssuedCard() {
  if (!globalThis.chrome?.storage?.session) return null;
  const result = await chrome.storage.session.get(issuedCardStorageKey);
  const saved = result[issuedCardStorageKey] || null;
  return validIssuedCardReference(saved) ? saved : null;
}
async function saveIssuedCard(card) {
  await chrome.storage.session.set({ [issuedCardStorageKey]: card });
  await appendCardEvent("issued_reference_saved", { settlementTx: card.settlementTx, amountSgd: card.amountSgd });
}
async function getSavedCheckout() {
  if (!globalThis.chrome?.storage?.session) return null;
  const result = await chrome.storage.session.get(checkoutStorageKey);
  let checkout = result[checkoutStorageKey] || null;
  if (!checkout) {
    const pending = await chrome.storage.local.get(pendingCheckoutStorageKey);
    checkout = pending[pendingCheckoutStorageKey] || null;
    if (checkout) {
      await chrome.storage.session.set({ [checkoutStorageKey]: checkout });
      await chrome.storage.local.remove(pendingCheckoutStorageKey);
    }
  }
  if (checkout && Date.now() - new Date(checkout.capturedAt).getTime() <= checkoutMaxAgeMs) return checkout;
  if (checkout) await chrome.storage.local.remove(pendingCheckoutStorageKey);
  return null;
}
async function saveCheckout(checkout) {
  await chrome.storage.session.set({ [checkoutStorageKey]: checkout });
  await chrome.storage.local.remove(pendingCheckoutStorageKey);
}
function decodePayload(encoded) {
  const normalized = encoded.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0))));
}
function encodePayload(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
function validIssuedCardReference(card) {
  if (!card || card.version !== 1) return false;
  if (typeof card.cardOpaqueId !== "string" || card.cardOpaqueId.length < 3 || card.cardOpaqueId.length > 240) return false;
  if (!/^0x[0-9a-f]{64}$/i.test(card.settlementTx || "")) return false;
  if (!Number.isFinite(card.amountSgd) || card.amountSgd < 5 || card.amountSgd > 30) return false;
  if (parseIssuedSandboxCard(card)) return true;
  try {
    const url = new URL(card.cardHtml);
    return url.protocol === "https:" && hostMatches(url, "straitsx.ai");
  } catch { return false; }
}
function parseIssuedSandboxCard(reference) {
  if (typeof reference?.cardHtml !== "string" || reference.cardHtml.length > 100_000 || !reference.cardHtml.trimStart().startsWith("<!DOCTYPE html>")) return null;
  const document = new DOMParser().parseFromString(reference.cardHtml, "text/html");
  const number = document.querySelector(".card-number")?.textContent?.replace(/\D/g, "") || "";
  const expiry = document.querySelector(".exp_val")?.textContent?.trim() || "";
  const cvv = document.querySelector(".cvv_val")?.textContent?.replace(/\D/g, "") || "";
  const name = document.querySelector(".card-holder-name")?.textContent?.trim().replace(/\s+/g, " ") || "";
  if (!/^\d{16,19}$/.test(number) || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry) || !/^\d{3,4}$/.test(cvv) || name.length < 2 || name.length > 80) return null;
  return { number, expiry, cvv, name, kind: "fuji-sandbox", fundedAmountSgd: reference.amountSgd };
}
function readIssuedCardReferenceFromPage() {
  return document.querySelector("#agentlane-issued-card-handoff")?.getAttribute("data-agentlane-issued-card") || null;
}
async function captureIssuedCardReference() {
  const results = await chrome.scripting.executeScript({ target: { tabId: activeTab.id, allFrames: false }, func: readIssuedCardReferenceFromPage });
  const encoded = results[0]?.result;
  if (!encoded) return getSavedIssuedCard();
  const parsed = decodePayload(encoded);
  if (!validIssuedCardReference(parsed)) throw new Error("AgentLane exposed an invalid sandbox-card reference.");
  await saveIssuedCard(parsed);
  return parsed;
}
async function saveIssuedSandboxCard(reference) {
  const parsedCard = parseIssuedSandboxCard(reference);
  if (!parsedCard) return null;
  checkoutSnapshot = await getSavedCheckout();
  const saved = { ...parsedCard, checkoutId: checkoutSnapshot?.checkoutId || null, capturedAt: new Date().toISOString() };
  const stored = await saveCard(saved);
  await appendCardEvent("card_fields_recovered", { lastFour: stored.number.slice(-4), settlementTx: reference.settlementTx, checkoutId: stored.checkoutId });
  await chrome.storage.session.remove(issuedCardStorageKey);
  issuedCardReference = null;
  return stored;
}
async function requestSandboxCardRecovery(payload) {
  const response = await fetch("/api/cards/sandbox/recover", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "StraitsX could not recover this card.");
  return result;
}
async function recoverPreviousCard(event) {
  event.preventDefault();
  elements.recoveryError.hidden = true;
  elements.recoverCard.disabled = true;
  elements.recoverCard.textContent = "Recovering…";
  try {
    const cardOpaqueId = elements.recoveryCardId.value.trim();
    const settlementTx = elements.recoverySettlement.value.trim();
    const walletAddress = elements.recoveryWallet.value.trim();
    const amountSgd = Number(elements.recoveryAmount.value);
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(cardOpaqueId)) throw new Error("Enter the 26-character sandbox card ID.");
    if (!/^0x[0-9a-f]{64}$/i.test(settlementTx)) throw new Error("Enter the Fuji settlement transaction.");
    if (!/^0x[0-9a-f]{40}$/i.test(walletAddress)) throw new Error("Enter the wallet that issued the card.");
    if (!Number.isFinite(amountSgd) || amountSgd < 5 || amountSgd > 30) throw new Error("Enter a card value from 5 to 30 XSGD.");
    const [execution] = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id, allFrames: false },
      func: requestSandboxCardRecovery,
      args: [{ card_opaque_id: cardOpaqueId, settlement_tx: settlementTx, wallet_address: walletAddress }],
    });
    if (!execution?.result?.card_html) throw new Error("The issuer returned no recoverable card document.");
    const reference = {
      version: 1,
      cardOpaqueId: execution.result.card_opaque_id || cardOpaqueId,
      cardHtml: execution.result.card_html,
      settlementTx,
      amountSgd,
      issuedAt: new Date().toISOString(),
    };
    if (!validIssuedCardReference(reference)) throw new Error("The issuer returned an invalid sandbox card.");
    const recovered = await saveIssuedSandboxCard(reference);
    if (!recovered) throw new Error("The returned test-card fields could not be read.");
    renderCard(recovered);
  } catch (error) {
    elements.recoveryError.textContent = error.message || "Card recovery failed.";
    elements.recoveryError.hidden = false;
  } finally {
    elements.recoverCard.disabled = false;
    elements.recoverCard.textContent = "Recover and save card";
  }
}
function renderIssuedCardReference(card) {
  issuedCardReference = card;
  elements.issuedCardValue.textContent = `${card.amountSgd.toFixed(2)} XSGD`;
  elements.issuedCardSettlement.textContent = `${card.settlementTx.slice(0, 8)}…${card.settlementTx.slice(-6)}`;
  elements.openIssuedCard.href = card.cardHtml;
  showSection(elements.issuedCard);
}
async function clearIssuedCard() {
  if (globalThis.chrome?.storage?.session) await chrome.storage.session.remove(issuedCardStorageKey);
  issuedCardReference = null;
  if (isAgentLane(activeUrl)) showSection(elements.agentlane); else showSection(elements.unsupported);
}
async function loadContextFromPage() {
  const encoded = new URLSearchParams(activeUrl.hash.slice(1)).get("agentlane");
  if (encoded) {
    const parsed = decodePayload(encoded);
    if (parsed?.version === 3 && parsed.intent === "verify_price" && parsed.offerId && parsed.listingUrl) {
      await chrome.storage.session.set({ [contextStorageKey]: parsed });
      return parsed;
    }
  }
  const saved = await chrome.storage.session.get(contextStorageKey);
  if (saved[contextStorageKey]) return saved[contextStorageKey];
  const persistent = await chrome.storage.local.get(contextStorageKey);
  if (persistent[contextStorageKey]) await chrome.storage.session.set({ [contextStorageKey]: persistent[contextStorageKey] });
  return persistent[contextStorageKey] || null;
}
async function clearCard() {
  if (globalThis.chrome?.storage) {
    await Promise.all([
      chrome.storage.session.remove([cardStorageKey, issuedCardStorageKey, cardEventStorageKey]),
      chrome.storage.local.remove([persistentCardStorageKey, cardVaultStorageKey]),
    ]);
  }
  sandboxCard = null;
  issuedCardReference = null;
  if (isShopee(activeUrl)) showSection(elements.noCard); else showSection(elements.capture);
}
function hideCardDetails() {
  elements.sensitiveCardDetails.hidden = true;
  elements.cardFullNumber.textContent = "";
  elements.cardCvv.textContent = "";
  elements.revealCard.textContent = "Reveal card details";
  elements.revealCard.setAttribute("aria-expanded", "false");
}
function toggleCardDetails() {
  if (!sandboxCard) return;
  if (!elements.sensitiveCardDetails.hidden) {
    hideCardDetails();
    return;
  }
  elements.cardFullNumber.textContent = sandboxCard.number.replace(/(\d{4})(?=\d)/g, "$1 ");
  elements.cardCvv.textContent = sandboxCard.cvv;
  elements.sensitiveCardDetails.hidden = false;
  elements.revealCard.textContent = "Hide card details";
  elements.revealCard.setAttribute("aria-expanded", "true");
}
function updateCardPreview(card) {
  sandboxCard = card;
  hideCardDetails();
  document.querySelector("#card-last-four").textContent = `•••• •••• •••• ${card.number.slice(-4)}`;
  document.querySelector("#card-name").textContent = card.name;
  document.querySelector("#card-expiry").textContent = card.expiry;
}

function renderAddCardOptions(cards) {
  elements.addCardOptions.replaceChildren();
  const eligibleCards = cards.filter((card) => card?.kind === "fuji-sandbox" && /^\d{13,19}$/.test(card.number || ""));
  eligibleCards.forEach((card) => {
    const label = document.createElement("label");
    label.className = "card-option";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "add-card";
    input.checked = card.number === sandboxCard?.number;
    const insufficient = Boolean(checkoutSnapshot && Number.isFinite(card.fundedAmountSgd) && card.fundedAmountSgd < checkoutSnapshot.totalSgd);
    input.disabled = false;
    const copy = document.createElement("span");
    copy.className = "card-option-copy";
    const strong = document.createElement("strong");
    strong.textContent = `AgentLane Visa •••• ${card.number.slice(-4)}`;
    const detail = document.createElement("span");
    detail.textContent = insufficient
      ? `${Number(card.fundedAmountSgd || 0).toFixed(2)} XSGD · needs S$${checkoutSnapshot.totalSgd.toFixed(2)}`
      : `${Number(card.fundedAmountSgd || 0).toFixed(2)} XSGD · expires ${card.expiry}`;
    copy.append(strong, detail);
    const status = document.createElement("small");
    status.textContent = insufficient ? "LOW" : "FUJI";
    input.addEventListener("change", () => updateCardPreview(card));
    label.append(input, copy, status);
    elements.addCardOptions.append(label);
  });
  elements.addCardPicker.hidden = eligibleCards.length === 0;
}

function renderCard(card) {
  updateCardPreview(card);
  const onForm = isShopeeCardForm(activeUrl);
  const boundCheckout = Boolean(checkoutSnapshot);
  elements.checkoutGuide.hidden = onForm;
  elements.fillCard.hidden = !onForm;
  elements.fillNote.hidden = !onForm;
  if (onForm) {
    renderAddCardOptions(sandboxCards.length ? sandboxCards : [card]);
    elements.fillCard.textContent = "Add selected card to Shopee";
    elements.fillNote.textContent = "This fills the selected AgentLane card and submits Shopee's Add Card form. A low balance is shown as a warning only; billing address fields remain untouched.";
    elements.fillCard.disabled = !boundCheckout;
  }
  elements.checkoutBinding.hidden = !boundCheckout;
  if (boundCheckout) {
    elements.boundCheckoutTotal.textContent = `S$${checkoutSnapshot.totalSgd.toFixed(2)}`;
    const age = ageInMinutes(checkoutSnapshot.capturedAt);
    elements.boundCheckoutAge.textContent = `Captured ${age === 0 ? "just now" : `${age} min ago`} · ${checkoutSnapshot.itemCount} ${checkoutSnapshot.itemCount === 1 ? "item" : "items"}`;
  }
  showSection(elements.cardReady);
}

function readShopeeSavedCards() {
  if (location.hostname !== "shopee.sg" || !location.pathname.startsWith("/checkout")) return [];
  const controls = [...document.querySelectorAll('[role="radio"], input[type="radio"]')];
  const cards = [];
  for (const control of controls) {
    const ownText = String(control.textContent || "").replace(/\s+/g, " ").trim();
    if (/^(ShopeePay Balance|PayNow|DBS PayLah!|Google Pay|Credit\s*\/\s*Debit Card|Credit Card Installment|Apple Pay)/i.test(ownText)) continue;
    let region = control;
    for (let depth = 0; depth < 5 && region.parentElement; depth += 1) {
      region = region.parentElement;
      const text = String(region.innerText || "").replace(/\s+/g, " ").trim();
      const match = text.match(/(?:\*{4}|•{4})\s*(\d{4})/);
      if (!match) continue;
      const disabled = control.disabled || control.getAttribute("aria-disabled") === "true" || /expired/i.test(text);
      const brand = text.replace(/(?:\*{4}|•{4})\s*\d{4}.*/i, "").trim().slice(0, 40) || "Saved card";
      if (!cards.some((card) => card.lastFour === match[1])) cards.push({ kind: "shopee-saved", lastFour: match[1], label: `${brand} •••• ${match[1]}`, disabled });
      break;
    }
  }
  return cards;
}

function renderPaymentOptions(options) {
  selectedPaymentOption = options.find((option) => !option.disabled && option.kind === "agentlane") || options.find((option) => !option.disabled) || null;
  elements.paymentCardOptions.replaceChildren();
  options.forEach((option, index) => {
    const label = document.createElement("label");
    label.className = "card-option";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "payment-card";
    input.value = String(index);
    input.checked = option === selectedPaymentOption;
    input.disabled = option.disabled;
    const copy = document.createElement("span");
    copy.className = "card-option-copy";
    const strong = document.createElement("strong");
    strong.textContent = option.label;
    const detail = document.createElement("span");
    const lowBalance = option.kind === "agentlane" && Number.isFinite(option.card?.fundedAmountSgd) && option.card.fundedAmountSgd < checkoutSnapshot.totalSgd;
    detail.textContent = option.disabled
      ? "Unavailable"
      : lowBalance
        ? `${option.card.fundedAmountSgd.toFixed(2)} XSGD · below S$${checkoutSnapshot.totalSgd.toFixed(2)} (test allowed)`
        : option.kind === "agentlane" ? "AgentLane sandbox card" : "Saved on Shopee";
    copy.append(strong, detail);
    const status = document.createElement("small");
    status.textContent = lowBalance ? "LOW" : option.kind === "agentlane" ? "FUJI" : "SHOPEE";
    input.addEventListener("change", () => { selectedPaymentOption = option; });
    label.append(input, copy, status);
    elements.paymentCardOptions.append(label);
  });
  elements.paymentCardPicker.hidden = options.length === 0;
  elements.reviewPayment.hidden = !selectedPaymentOption || !checkoutSnapshot;
  if (checkoutSnapshot) elements.reviewPayment.textContent = `Review payment · S$${checkoutSnapshot.totalSgd.toFixed(2)}`;
}

async function loadPaymentOptions() {
  if (!isShopeeCheckout(activeUrl) || !checkoutSnapshot) return;
  const [result] = await chrome.scripting.executeScript({ target: { tabId: activeTab.id, allFrames: false }, func: readShopeeSavedCards });
  const options = Array.isArray(result?.result) ? result.result : [];
  const agentLaneOptions = sandboxCards
    .filter((card) => card?.kind === "fuji-sandbox" && /^\d{13,19}$/.test(card.number || ""))
    .slice()
    .reverse()
    .map((card) => ({
      kind: "agentlane",
      card,
      lastFour: card.number.slice(-4),
      label: `AgentLane Visa •••• ${card.number.slice(-4)}`,
      disabled: false,
    }));
  options.unshift(...agentLaneOptions);
  renderPaymentOptions(options);
}

function reviewSelectedPayment() {
  if (!selectedPaymentOption || !checkoutSnapshot) return;
  const addingAgentLaneCard = selectedPaymentOption.kind === "agentlane";
  elements.paymentConfirmCard.textContent = selectedPaymentOption.label;
  elements.paymentConfirmTotal.textContent = `S$${checkoutSnapshot.totalSgd.toFixed(2)}`;
  elements.paymentConfirmation.querySelector("h2").textContent = addingAgentLaneCard ? "Add this card to Shopee?" : "Place this Shopee order?";
  elements.paymentConfirmation.querySelector("p:not(.eyebrow):not(.error)").textContent = addingAgentLaneCard
    ? "Shopee's secure Add Card page will open. Card Companion will pop up there so you can choose and add an AgentLane card."
    : "This will select the saved card and click Shopee's Place Order. The selected card may be charged if Shopee accepts it.";
  elements.confirmPayment.textContent = addingAgentLaneCard ? "Continue to Add Card" : "Confirm and pay";
  elements.paymentConfirmation.hidden = false;
  elements.reviewPayment.hidden = true;
  elements.paymentConfirmation.querySelector("button")?.focus();
}

function cancelSelectedPayment() {
  elements.paymentConfirmation.hidden = true;
  elements.reviewPayment.hidden = !selectedPaymentOption;
  elements.reviewPayment.focus();
}

async function confirmSelectedPayment() {
  if (!selectedPaymentOption || !checkoutSnapshot) return;
  elements.confirmPayment.disabled = true;
  elements.cancelPayment.disabled = true;
  elements.confirmPayment.textContent = selectedPaymentOption.kind === "agentlane" ? "Opening Add Card…" : "Paying…";
  elements.paymentError.hidden = true;
  try {
    if (selectedPaymentOption.kind === "agentlane") {
      sandboxCard = { ...selectedPaymentOption.card, checkoutId: checkoutSnapshot.checkoutId };
      sandboxCard = await saveCard(sandboxCard);
      selectedPaymentOption = { ...selectedPaymentOption, card: sandboxCard };
    }
    const response = await chrome.runtime.sendMessage({
      type: "agentlane_pay_checkout",
      tabId: activeTab.id,
      checkout: checkoutSnapshot,
      payment: selectedPaymentOption.kind === "agentlane" ? { kind: "agentlane", card: selectedPaymentOption.card } : selectedPaymentOption,
    });
    if (!response?.ok) throw new Error(response?.error || "Shopee payment could not be started.");
    if (response.awaitingCardChoice) {
      await appendCardEvent("shopee_add_card_picker_opened", { totalSgd: checkoutSnapshot.totalSgd, lastFour: selectedPaymentOption.lastFour });
      return;
    }
    await appendCardEvent("shopee_place_order_clicked", { totalSgd: checkoutSnapshot.totalSgd, lastFour: selectedPaymentOption.lastFour, paymentKind: selectedPaymentOption.kind });
    showSection(elements.paymentComplete);
  } catch (error) {
    elements.paymentError.textContent = error.message || "Shopee payment could not be started.";
    elements.paymentError.hidden = false;
  } finally {
    elements.confirmPayment.disabled = false;
    elements.cancelPayment.disabled = false;
    elements.confirmPayment.textContent = selectedPaymentOption?.kind === "agentlane" ? "Continue to Add Card" : "Confirm and pay";
  }
}

function renderCheckoutState(checkout) {
  if (!checkout) return;
  checkoutSnapshot = checkout;
  elements.quoteResult.hidden = false;
  elements.quoteLabel.textContent = "Live checkout total";
  elements.quotePrice.textContent = `S$${checkout.totalSgd.toFixed(2)}`;
  elements.checkoutCaptured.hidden = false;
  elements.checkoutDetail.textContent = `${checkout.itemCount} ${checkout.itemCount === 1 ? "item" : "items"} · session-only handoff`;
  elements.refreshPrice.textContent = "Recapture checkout";
  elements.checkoutCardState.hidden = false;
  if (sandboxCard) {
    elements.checkoutCardHeading.textContent = `Sandbox Visa •••• ${sandboxCard.number.slice(-4)} ready`;
    elements.checkoutCardCopy.textContent = "Choose Credit/Debit Card and Pay with new card. The extension will verify this captured total before filling.";
    elements.prepareCheckout.hidden = false;
    elements.useAgentLane.hidden = true;
  } else {
    elements.checkoutCardHeading.textContent = "Checkout is ready for a sandbox Visa";
    elements.checkoutCardCopy.textContent = "Create a checkout-sized purchase card, then return to Shopee to fill it.";
    if (procurementContext) {
      const quote = { version: 1, offerId: procurementContext.offerId, title: procurementContext.title, checkoutTotalSgd: checkout.totalSgd, source: "checkout_total", capturedAt: checkout.capturedAt };
      elements.useAgentLane.href = `http://localhost:3001/#lastMile=${encodePayload(quote)}`;
      elements.useAgentLane.textContent = `Purchase now · S$${checkout.totalSgd.toFixed(2)}`;
      elements.useAgentLane.hidden = false;
    }
  }
}

function setAutomationProgress(step, message) {
  const steps = [elements.automationStepTotal, elements.automationStepPayment, elements.automationStepCard];
  elements.automationProgress.hidden = false;
  steps.forEach((element, index) => {
    element.classList.toggle("complete", index < step);
    element.classList.toggle("active", index === step);
  });
  elements.automationState.textContent = step >= steps.length ? "Ready to review" : `Step ${step + 1} of ${steps.length}`;
  elements.automationMessage.textContent = message;
}

function readLiveShopeePrice(context) {
  if (!location.hostname.endsWith("shopee.sg")) return null;
  const money = (value) => {
    const number = Number(String(value || "").replace(/,/g, ""));
    return Number.isFinite(number) && number >= 0 ? number : null;
  };
  const text = String(document.body?.innerText || "").replace(/\s+/g, " ");
  const checkoutMatch = text.match(/(?:Total Payment|Order Total(?:\s*\([^)]*\))?)\s*:?\s*(?:S\$|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (location.pathname.startsWith("/checkout") && checkoutMatch) {
    return { checkoutTotalSgd: money(checkoutMatch[1]), source: "checkout_total" };
  }

  const productIds = (value) => {
    try {
      const path = new URL(value, location.origin).pathname;
      const match = path.match(/-i\.(\d+)\.(\d+)/i) || path.match(/\/product\/(\d+)\/(\d+)/i);
      return match ? `${match[1]}:${match[2]}` : null;
    } catch { return null; }
  };
  const expectedIds = productIds(context?.listingUrl);
  if (location.pathname.startsWith("/cart") && expectedIds) {
    const anchor = [...document.querySelectorAll("a[href]")].find((candidate) => productIds(candidate.href) === expectedIds);
    if (anchor) {
      let region = anchor;
      for (let depth = 0; depth < 7 && region.parentElement; depth += 1) {
        region = region.parentElement;
        if ((region.innerText || "").length > 180 && (region.innerText || "").length < 2500) break;
      }
      const priceElements = [...region.querySelectorAll("*")].filter((element) => {
        const ownText = String(element.textContent || "").trim();
        if (!/^(?:S\$|\$)\s*[0-9,]+(?:\.[0-9]{1,2})?$/.test(ownText)) return false;
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && style.textDecorationLine !== "line-through" && element.getClientRects().length > 0;
      });
      const prices = priceElements.map((element) => money(element.textContent.replace(/^(?:S\$|\$)/, ""))).filter((value) => value !== null && value > 0);
      const uniquePrices = [...new Set(prices)];
      if (uniquePrices.length === 1) return { productPriceSgd: uniquePrices[0], source: "cart_item" };
    }
  }

  const productOffers = [];
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const root = JSON.parse(script.textContent || "null");
      const queue = Array.isArray(root) ? [...root] : [root];
      while (queue.length) {
        const entry = queue.shift();
        if (!entry || typeof entry !== "object") continue;
        const types = Array.isArray(entry["@type"]) ? entry["@type"] : [entry["@type"]];
        if (types.includes("Product") && entry.offers) {
          const offers = Array.isArray(entry.offers) ? entry.offers : [entry.offers];
          for (const offer of offers) {
            if (!offer || (offer.priceCurrency && offer.priceCurrency !== "SGD")) continue;
            const exactPrice = money(offer.price);
            const lowPrice = money(offer.lowPrice);
            const highPrice = money(offer.highPrice);
            if (exactPrice !== null && exactPrice > 0) productOffers.push(exactPrice);
            else if (lowPrice !== null && lowPrice === highPrice && lowPrice > 0) productOffers.push(lowPrice);
          }
        }
        for (const value of Object.values(entry)) {
          if (value && typeof value === "object") queue.push(...(Array.isArray(value) ? value : [value]));
        }
      }
    } catch { /* Ignore malformed third-party structured data. */ }
  }
  const structuredPrices = [...new Set(productOffers)];
  if (structuredPrices.length === 1) return { productPriceSgd: structuredPrices[0], source: "product_page" };

  const exactMetaPrices = ['meta[itemprop="price"]', 'meta[property="product:price:amount"]']
    .map((selector) => money(document.querySelector(selector)?.content))
    .filter((value) => value !== null && value > 0);
  const uniqueMetaPrices = [...new Set(exactMetaPrices)];
  return uniqueMetaPrices.length === 1 ? { productPriceSgd: uniqueMetaPrices[0], source: "product_page" } : null;
}

function captureShopeeCheckout(context) {
  if (location.hostname !== "shopee.sg" || !location.pathname.startsWith("/checkout")) return null;
  const text = String(document.body?.innerText || "").replace(/\s+/g, " ");
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
    const totalMatches = [...text.matchAll(/(?:Total Payment|Grand Total|Order Total(?:\s*\([^)]*\))?)\s*:?\s*(?:S\$|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi)];
    totalSgd = totalMatches.map((match) => money(match[1])).filter((value) => value !== null).at(-1) ?? null;
  }
  if (!Number.isFinite(totalSgd)) return null;
  const productIds = new Set([...document.querySelectorAll('a[href*="-i."], a[href*="/product/"]')].map((anchor) => {
    const match = new URL(anchor.href, location.origin).pathname.match(/-i\.(\d+)\.(\d+)/i) || new URL(anchor.href, location.origin).pathname.match(/\/product\/(\d+)\/(\d+)/i);
    return match ? `${match[1]}:${match[2]}` : null;
  }).filter(Boolean));
  const itemCount = Math.max(1, productIds.size);
  return { version: 1, offerId: context?.offerId || null, totalSgd, itemCount, currency: "SGD", checkoutPath: location.pathname, capturedAt: new Date().toISOString() };
}

async function addCheckoutId(checkout) {
  const input = new TextEncoder().encode(JSON.stringify([checkout.offerId, checkout.totalSgd, checkout.itemCount, checkout.capturedAt]));
  const digest = await crypto.subtle.digest("SHA-256", input);
  return { ...checkout, checkoutId: [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 24) };
}

async function refreshLivePrice() {
  elements.refreshPrice.disabled = true;
  elements.quoteError.hidden = true;
  try {
    const checkoutMode = isShopeeCheckout(activeUrl);
    if (!checkoutMode && !procurementContext) throw new Error("Open this Shopee listing from AgentLane once so the quote can be matched to your selected product.");
    const results = await chrome.scripting.executeScript({ target: { tabId: activeTab.id, allFrames: false }, func: checkoutMode ? captureShopeeCheckout : readLiveShopeePrice, args: [procurementContext] });
    const captured = results[0]?.result;
    const live = checkoutMode && captured ? { checkoutTotalSgd: captured.totalSgd, source: "checkout_total" } : captured;
    const amount = live?.checkoutTotalSgd ?? live?.productPriceSgd;
    if (!Number.isFinite(amount)) throw new Error("No reliable live price was visible. Select the product variant or continue to checkout and try again.");
    const quote = { version: 1, offerId: procurementContext.offerId, title: procurementContext.title, ...live, capturedAt: new Date().toISOString() };
    if (checkoutMode) {
      const checkout = await addCheckoutId(captured);
      await saveCheckout(checkout);
      checkoutSnapshot = checkout;
      renderCheckoutState(checkout);
      await loadPaymentOptions();
    }
    elements.quoteLabel.textContent = live.checkoutTotalSgd ? "Live checkout total" : live.source === "cart_item" ? "Live cart price" : "Live product price";
    elements.quotePrice.textContent = `S$${amount.toFixed(2)}`;
    elements.quoteResult.hidden = false;
    if (checkoutMode) {
      elements.useAgentLane.href = `http://localhost:3001/#lastMile=${encodePayload(quote)}`;
      elements.useAgentLane.textContent = `Purchase now · S$${amount.toFixed(2)}`;
      elements.useAgentLane.hidden = Boolean(sandboxCard);
    } else {
      elements.quoteCopy.textContent = "Price checked. Choose the intended variant and click Buy Now; the final checkout total will create the card.";
      elements.useAgentLane.hidden = true;
    }
  } catch (error) {
    elements.quoteError.textContent = error.message || "Live price refresh failed.";
    elements.quoteError.hidden = false;
  } finally {
    elements.refreshPrice.disabled = false;
  }
}

function captureCardFromPage() {
  function digits(value) { return String(value || "").replace(/\D/g, ""); }
  function visible(element) { const style = getComputedStyle(element); return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0; }
  function valuesFor(selectors) { return [...document.querySelectorAll(selectors)].filter(visible).map((element) => String(element.value || element.textContent || "").trim()).filter(Boolean); }
  function luhn(value) {
    let sum = 0; let double = false;
    for (let index = value.length - 1; index >= 0; index -= 1) { let digit = Number(value[index]); if (double) { digit *= 2; if (digit > 9) digit -= 9; } sum += digit; double = !double; }
    return sum % 10 === 0;
  }
  const inputs = valuesFor("input, [data-card-number], [data-expiry], [data-cvv], [data-cardholder]");
  const pageText = String(document.body?.innerText || "").replace(/\s+/g, " ");
  const numberCandidates = [...inputs, ...(pageText.match(/(?:\d[ -]?){13,19}/g) || [])].map(digits).filter((value) => value.length >= 13 && value.length <= 19 && luhn(value));
  const expiryCandidates = [...inputs, ...(pageText.match(/(?:0[1-9]|1[0-2])\s*\/\s*\d{2,4}/g) || [])].map((value) => value.match(/(?:0[1-9]|1[0-2])\s*\/\s*(?:\d{2,4})/)?.[0]?.replace(/\s/g, "")).filter(Boolean);
  const cvvCandidates = valuesFor('input[autocomplete="cc-csc"], input[name*="cvv" i], input[name*="cvc" i], input[type="password"], [data-cvv]').map(digits).filter((value) => /^\d{3,4}$/.test(value));
  const nameCandidates = valuesFor('input[autocomplete="cc-name"], input[name*="name" i], [data-cardholder]').filter((value) => /^[A-Za-z][A-Za-z ]{1,25}$/.test(value));
  const [number] = numberCandidates; const [expiry] = expiryCandidates; const [cvv] = cvvCandidates; const [name] = nameCandidates;
  const amountMatches = [...pageText.matchAll(/(?:S\$|XSGD\s*)\s*([0-9,]+(?:\.[0-9]{1,2})?)|([0-9,]+(?:\.[0-9]{1,2})?)\s*XSGD/gi)];
  const fundedAmounts = amountMatches.flatMap((match) => [match[1], match[2]]).filter(Boolean).map((value) => Number(value.replaceAll(",", ""))).filter((value) => Number.isFinite(value) && value >= 5 && value <= 30);
  return number && expiry && cvv && name ? { number, expiry, cvv, name, fundedAmountSgd: fundedAmounts.at(-1) || null, kind: "fuji-sandbox" } : null;
}

function fillShopeeCard(card) {
  if (location.hostname !== "pay.shopee.sg" || !location.pathname.startsWith("/payment-v2/add-card")) return null;
  const inputs = [...document.querySelectorAll("input")].filter((input) => !input.disabled && input.type !== "hidden");
  const telInputs = inputs.filter((input) => input.type === "tel");
  const textInputs = inputs.filter((input) => input.type === "text");
  const find = (selector, fallback) => document.querySelector(selector) || fallback;
  const fields = {
    number: find('input[autocomplete="cc-number"], input[name*="card" i]', telInputs[0]),
    expiry: find('input[autocomplete="cc-exp"], input[name*="exp" i]', telInputs[1]),
    cvv: find('input[autocomplete="cc-csc"], input[name*="cvv" i], input[name*="cvc" i]', inputs.find((input) => input.type === "password")),
    name: find('input[autocomplete="cc-name"], input[name*="name" i]', textInputs[0]),
  };
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  function setValue(input, value) {
    if (!input || !nativeSetter) return false;
    nativeSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("blur", { bubbles: true }));
    return input.value.replace(/\s/g, "").length > 0;
  }
  const filled = [setValue(fields.number, card.number), setValue(fields.expiry, card.expiry), setValue(fields.cvv, card.cvv), setValue(fields.name, card.name)].filter(Boolean).length;
  return { filled };
}

async function prepareShopeeCardPayment() {
  if (location.hostname !== "shopee.sg" || !location.pathname.startsWith("/checkout")) return { ready: false, reason: "not_checkout" };
  const visible = (element) => {
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  };
  const blockedLabels = /^(place order|pay|pay now|submit order|confirm payment)$/i;
  const candidates = () => [...document.querySelectorAll('button, [role="button"], label, [tabindex="0"]')].filter(visible);
  const control = (labels) => candidates().find((element) => {
    const text = String(element.textContent || "").replace(/\s+/g, " ").trim();
    return !blockedLabels.test(text) && labels.some((label) => label.test(text));
  });
  const waitForControl = async (labels, timeoutMs = 8000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const found = control(labels);
      if (found) return found;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return null;
  };
  const method = await waitForControl([/^credit\s*\/\s*debit card$/i, /^credit card\s*\/\s*debit card$/i, /^card$/i]);
  if (method) method.click();
  const newCard = await waitForControl([/^pay with new card$/i, /^add new card$/i, /^new card$/i]);
  if (newCard) newCard.click();
  return { ready: Boolean(newCard), methodFound: Boolean(method), newCardFound: Boolean(newCard) };
}

async function prepareCheckout() {
  elements.prepareCheckout.disabled = true;
  elements.quoteError.hidden = true;
  setAutomationProgress(0, "Reading Shopee's rendered checkout total.");
  try {
    if (!sandboxCard) throw new Error("Recover the sandbox Visa from AgentLane before preparing checkout.");
    const checkoutResults = await chrome.scripting.executeScript({ target: { tabId: activeTab.id, allFrames: false }, func: captureShopeeCheckout, args: [procurementContext] });
    const captured = checkoutResults[0]?.result;
    if (!captured) throw new Error("Shopee's live checkout total is not visible yet.");
    const checkout = await addCheckoutId(captured);
    await saveCheckout(checkout);
    checkoutSnapshot = checkout;
    sandboxCard = { ...sandboxCard, checkoutId: checkout.checkoutId };
    await saveCard(sandboxCard);
    renderCheckoutState(checkout);
    setAutomationProgress(1, "Opening Shopee's new-card payment form.");
    const paymentResults = await chrome.scripting.executeScript({ target: { tabId: activeTab.id, allFrames: false }, func: prepareShopeeCardPayment });
    const payment = paymentResults[0]?.result;
    if (!payment?.ready) throw new Error("Choose Credit/Debit Card and Pay with new card once, then press Prepare card checkout again.");
    setAutomationProgress(2, "Waiting for the secure card form, then filling four fields.");
    let filled = 0;
    for (let attempt = 0; attempt < 24 && filled < 4; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const cardResults = await chrome.scripting.executeScript({ target: { tabId: activeTab.id, allFrames: true }, func: fillShopeeCard, args: [sandboxCard] });
      filled = Math.max(0, ...cardResults.map((entry) => entry.result?.filled || 0));
    }
    if (filled !== 4) throw new Error(`Shopee opened the payment flow, but only ${filled} of 4 card fields were available. Open the new-card form and retry.`);
    await appendCardEvent("shopee_checkout_prepared", { lastFour: sandboxCard.number.slice(-4), checkoutId: checkout.checkoutId, totalSgd: checkout.totalSgd });
    setAutomationProgress(3, "Card filled. Review the order; Place Order was not clicked.");
    showSection(elements.complete);
  } catch (error) {
    elements.quoteError.textContent = error.message || "Checkout preparation failed.";
    elements.quoteError.hidden = false;
    elements.automationState.textContent = "Needs attention";
    elements.automationMessage.textContent = error.message || "Review Shopee and retry.";
  } finally {
    elements.prepareCheckout.disabled = false;
  }
}

async function captureCard() {
  elements.captureCard.disabled = true; elements.captureError.hidden = true;
  try {
    const results = await chrome.scripting.executeScript({ target: { tabId: activeTab.id, allFrames: true }, func: captureCardFromPage });
    const card = results.map((entry) => entry.result).find(Boolean);
    if (!card) throw new Error("Could not read all four card fields. Reveal the sandbox card details and try again.");
    checkoutSnapshot = await getSavedCheckout();
    const saved = { ...card, checkoutId: checkoutSnapshot?.checkoutId || null, capturedAt: new Date().toISOString() };
    const stored = await saveCard(saved);
    await appendCardEvent("card_fields_captured", { lastFour: stored.number.slice(-4), checkoutId: stored.checkoutId });
    await chrome.storage.session.remove(issuedCardStorageKey);
    issuedCardReference = null;
    renderCard(stored);
  } catch (error) { elements.captureError.textContent = error.message || "Card capture failed."; elements.captureError.hidden = false; }
  finally { elements.captureCard.disabled = false; }
}
async function fillCard() {
  elements.fillCard.disabled = true; elements.fillError.hidden = true;
  try {
    checkoutSnapshot = await getSavedCheckout();
    if (!checkoutSnapshot) throw new Error("Capture the Shopee checkout again before filling the card.");
    if (sandboxCard.kind !== "fuji-sandbox") throw new Error("Only a Fuji sandbox card can be filled.");
    if (isShopeeCardForm(activeUrl)) {
      sandboxCard = await saveCard({ ...sandboxCard, checkoutId: checkoutSnapshot.checkoutId });
      const response = await chrome.runtime.sendMessage({ type: "agentlane_add_selected_card", tabId: activeTab.id, checkout: checkoutSnapshot, card: sandboxCard });
      if (!response?.ok) throw new Error(response?.error || "Shopee could not add the selected card.");
      await appendCardEvent("shopee_card_added", { lastFour: sandboxCard.number.slice(-4), checkoutId: checkoutSnapshot.checkoutId });
      elements.complete.querySelector("h2").textContent = "Card added to Shopee";
      elements.complete.querySelector(".manual-note").textContent = "Shopee returned to checkout. Card Companion will reopen so you can review payment.";
      showSection(elements.complete);
      return;
    }
    const results = await chrome.scripting.executeScript({ target: { tabId: activeTab.id, allFrames: true }, func: fillShopeeCard, args: [sandboxCard] });
    const best = results.map((entry) => entry.result).filter(Boolean).sort((left, right) => right.filled - left.filled)[0];
    if (!best || best.filled !== 4) throw new Error(`Filled ${best?.filled || 0} of 4 card fields. Shopee may have changed its form.`);
    showSection(elements.complete);
  } catch (error) { elements.fillError.textContent = error.message || "Card autofill failed."; elements.fillError.hidden = false; }
  finally { elements.fillCard.disabled = false; }
}

elements.captureCard.addEventListener("click", captureCard);
elements.showRecovery.addEventListener("click", () => {
  elements.recoveryForm.hidden = !elements.recoveryForm.hidden;
  elements.showRecovery.textContent = elements.recoveryForm.hidden ? "Recover previous card" : "Hide recovery";
  if (!elements.recoveryForm.hidden) elements.recoveryCardId.focus();
});
elements.recoveryForm.addEventListener("submit", recoverPreviousCard);
elements.refreshPrice.addEventListener("click", refreshLivePrice);
elements.prepareCheckout.addEventListener("click", prepareCheckout);
elements.reviewPayment.addEventListener("click", reviewSelectedPayment);
elements.cancelPayment.addEventListener("click", cancelSelectedPayment);
elements.confirmPayment.addEventListener("click", confirmSelectedPayment);
elements.fillCard.addEventListener("click", fillCard);
elements.fillAgain.addEventListener("click", fillCard);
elements.forgetCard.addEventListener("click", clearCard);
elements.forgetCardComplete.addEventListener("click", clearCard);
elements.forgetIssuedCard.addEventListener("click", clearIssuedCard);
elements.revealCard.addEventListener("click", toggleCardDetails);

(async () => {
  if (!globalThis.chrome?.tabs) {
    activeUrl = new URL("https://pay.shopee.sg/payment-v2/add-card");
    renderCard({ number: "4111111111111111", expiry: "12/30", cvv: "123", name: "AGENT LANE" });
    elements.fillCard.disabled = true;
    return;
  }
  [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try { activeUrl = new URL(activeTab?.url || "about:blank"); }
  catch { showSection(elements.unsupported); return; }
  sandboxCards = await getSavedCards();
  sandboxCard = await getSavedCard() || sandboxCards.at(-1) || null;
  issuedCardReference = await getSavedIssuedCard();
  checkoutSnapshot = await getSavedCheckout();
  if (isStraitsCard(activeUrl)) showSection(elements.capture);
  else if (isAgentLane(activeUrl)) {
    if (sandboxCard) renderCard(sandboxCard);
    else {
      try { issuedCardReference = await captureIssuedCardReference(); }
      catch { issuedCardReference = await getSavedIssuedCard(); }
      const recoveredCard = issuedCardReference ? await saveIssuedSandboxCard(issuedCardReference) : null;
      if (recoveredCard) renderCard(recoveredCard);
      else if (issuedCardReference) renderIssuedCardReference(issuedCardReference);
      else showSection(elements.agentlane);
    }
  }
  else if (isShopee(activeUrl)) {
    try { procurementContext = await loadContextFromPage(); } catch { procurementContext = null; }
    if (isShopeeCardForm(activeUrl)) {
      const boundCards = sandboxCards.filter((card) => card.checkoutId === checkoutSnapshot?.checkoutId);
      if (boundCards.length) sandboxCard = boundCards.at(-1);
      if (sandboxCard) renderCard(sandboxCard); else showSection(elements.noCard);
    } else {
      if (isShopeeCheckout(activeUrl)) {
        elements.quoteHeading.textContent = "Capture this checkout";
        elements.quoteCopy.textContent = "Card Companion uses Shopee's rendered total to create a card for this checkout only.";
        elements.refreshPrice.textContent = "Capture checkout";
      }
      showSection(elements.livePrice);
      if (isShopeeCheckout(activeUrl) && sandboxCard) elements.prepareCheckout.hidden = false;
      if (isShopeeCheckout(activeUrl) && checkoutSnapshot) {
        renderCheckoutState(checkoutSnapshot);
        await loadPaymentOptions();
      }
      if (isShopeeCheckout(activeUrl) && !checkoutSnapshot) await refreshLivePrice();
    }
  }
  else showSection(elements.unsupported);
})();
