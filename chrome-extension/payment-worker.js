const checkoutMaxAgeMs = 30 * 60 * 1000;
const openedAddCardTabs = new Map();

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForTab(tabId, predicate, timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url && predicate(new URL(tab.url))) return tab;
    await wait(250);
  }
  throw new Error("Shopee did not finish opening the next payment step.");
}

function validCheckout(checkout) {
  const capturedAt = new Date(checkout?.capturedAt).getTime();
  return Boolean(
    checkout &&
    Number.isFinite(checkout.totalSgd) &&
    checkout.totalSgd > 0 &&
    typeof checkout.checkoutId === "string" &&
    checkout.checkoutId.length === 24 &&
    Number.isFinite(capturedAt) &&
    Date.now() - capturedAt <= checkoutMaxAgeMs,
  );
}

function validSandboxCard(card) {
  return Boolean(
    card &&
    card.kind === "fuji-sandbox" &&
    /^\d{13,19}$/.test(card.number || "") &&
    /^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry || "") &&
    /^\d{3,4}$/.test(card.cvv || "") &&
    typeof card.name === "string" &&
    card.name.length >= 2 &&
    (!Number.isFinite(card.fundedAmountSgd) || card.fundedAmountSgd >= 5),
  );
}

function captureCheckoutTotal() {
  if (location.hostname !== "shopee.sg" || !location.pathname.startsWith("/checkout")) return null;
  const money = (value) => {
    const number = Number(String(value || "").replaceAll(",", ""));
    return Number.isFinite(number) && number > 0 ? number : null;
  };
  const labels = [/^Total Payment\s*:?$/i, /^Grand Total\s*:?$/i, /^Order Total(?:\s*\([^)]*\))?\s*:?$/i];
  for (const pattern of labels) {
    const matches = [...document.querySelectorAll("body *")].filter((element) => pattern.test(String(element.textContent || "").trim()) && element.children.length <= 1);
    for (const label of matches) {
      let region = label.parentElement;
      for (let depth = 0; depth < 3 && region; depth += 1, region = region.parentElement) {
        const values = [...String(region.innerText || "").matchAll(/(?:S\$|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/g)].map((match) => money(match[1])).filter((value) => value !== null);
        if (values.length) return values.at(-1);
      }
    }
  }
  const text = String(document.body?.innerText || "").replace(/\s+/g, " ");
  const matches = [...text.matchAll(/(?:Total Payment|Grand Total|Order Total(?:\s*\([^)]*\))?)\s*:?\s*(?:S\$|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi)];
  return matches.map((match) => money(match[1])).filter((value) => value !== null).at(-1) ?? null;
}

async function openNewCardForm() {
  if (location.hostname !== "shopee.sg" || !location.pathname.startsWith("/checkout")) return { opened: false };
  const visible = (element) => {
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  };
  const controls = [...document.querySelectorAll('button, [role="radio"], [role="button"]')].filter(visible);
  const cardMethod = controls.find((element) => /^Credit\s*\/\s*Debit Card$/i.test(String(element.textContent || "").replace(/\s+/g, " ").trim()));
  if (cardMethod) cardMethod.click();
  await new Promise((resolve) => setTimeout(resolve, 250));
  const newCard = [...document.querySelectorAll('button, [role="button"]')].filter(visible).find((element) => /^Pay with new card$/i.test(String(element.textContent || "").replace(/\s+/g, " ").trim()));
  if (!newCard) return { opened: false };
  newCard.click();
  return { opened: true };
}

function fillNewCard(card) {
  if (location.hostname !== "pay.shopee.sg" || !location.pathname.startsWith("/payment-v2/add-card")) return { filled: 0 };
  const inputs = [...document.querySelectorAll("input")].filter((input) => !input.disabled && input.type !== "hidden");
  const telInputs = inputs.filter((input) => input.type === "tel");
  const emptyTextInputs = inputs.filter((input) => input.type === "text" && !input.value.trim());
  const fields = [
    document.querySelector('input[autocomplete="cc-number"], input[name*="card" i]') || telInputs[0],
    document.querySelector('input[autocomplete="cc-exp"], input[name*="exp" i]') || telInputs[1],
    document.querySelector('input[autocomplete="cc-csc"], input[name*="cvv" i], input[name*="cvc" i]') || inputs.find((input) => input.type === "password"),
    document.querySelector('input[autocomplete="cc-name"], input[name*="name" i]') || emptyTextInputs[0],
  ];
  const values = [card.number, card.expiry, card.cvv, card.name];
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  let filled = 0;
  fields.forEach((input, index) => {
    if (!input || !nativeSetter) return;
    input.focus();
    nativeSetter.call(input, values[index]);
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: values[index] }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("blur", { bubbles: true }));
    if (input.value) filled += 1;
  });
  return { filled };
}

function submitNewCard() {
  if (location.hostname !== "pay.shopee.sg" || !location.pathname.startsWith("/payment-v2/add-card")) return { submitted: false };
  const submit = [...document.querySelectorAll("button")].find((button) => /^Submit$/i.test(String(button.textContent || "").trim()) && !button.disabled && button.getAttribute("aria-disabled") !== "true");
  if (!submit) return { submitted: false };
  submit.click();
  return { submitted: true };
}

async function selectCardAndPlaceOrder(lastFour, expectedTotal) {
  if (location.hostname !== "shopee.sg" || !location.pathname.startsWith("/checkout")) return { placed: false, reason: "not_checkout" };
  const visible = (element) => {
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  };
  const money = (value) => {
    const number = Number(String(value || "").replaceAll(",", ""));
    return Number.isFinite(number) && number > 0 ? number : null;
  };
  let total = null;
  for (const pattern of [/^Total Payment\s*:?$/i, /^Grand Total\s*:?$/i, /^Order Total(?:\s*\([^)]*\))?\s*:?$/i]) {
    const labels = [...document.querySelectorAll("body *")].filter((element) => pattern.test(String(element.textContent || "").trim()) && element.children.length <= 1);
    for (const label of labels) {
      let region = label.parentElement;
      for (let depth = 0; depth < 3 && region; depth += 1, region = region.parentElement) {
        const values = [...String(region.innerText || "").matchAll(/(?:S\$|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/g)].map((match) => money(match[1])).filter((value) => value !== null);
        if (values.length) { total = values.at(-1); break; }
      }
      if (total !== null) break;
    }
    if (total !== null) break;
  }
  if (total === null) {
    const text = String(document.body?.innerText || "").replace(/\s+/g, " ");
    const matches = [...text.matchAll(/(?:Total Payment|Grand Total|Order Total(?:\s*\([^)]*\))?)\s*:?\s*(?:S\$|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi)];
    total = matches.map((match) => money(match[1])).filter((value) => value !== null).at(-1) ?? null;
  }
  if (!Number.isFinite(total) || Math.abs(total - expectedTotal) > 0.005) return { placed: false, reason: "total_changed", total };
  const radios = [...document.querySelectorAll('[role="radio"], input[type="radio"]')].filter(visible);
  let cardControl = null;
  for (const radio of radios) {
    const ownText = String(radio.textContent || "").replace(/\s+/g, " ").trim();
    if (/^(ShopeePay Balance|PayNow|DBS PayLah!|Google Pay|Credit\s*\/\s*Debit Card|Credit Card Installment|Apple Pay)/i.test(ownText)) continue;
    let region = radio;
    for (let depth = 0; depth < 5 && region.parentElement; depth += 1) {
      region = region.parentElement;
      const text = String(region.innerText || "").replace(/\s+/g, " ");
      if (text.includes(lastFour) && !/expired/i.test(text)) { cardControl = radio; break; }
    }
    if (cardControl) break;
  }
  if (!cardControl) return { placed: false, reason: "card_missing" };
  const selected = cardControl.checked || cardControl.getAttribute("aria-checked") === "true";
  if (!selected) {
    cardControl.click();
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  const placeOrder = [...document.querySelectorAll("button")].filter(visible).find((button) => /^Place Order$/i.test(String(button.textContent || "").replace(/\s+/g, " ").trim()) && !button.disabled && button.getAttribute("aria-disabled") !== "true");
  if (!placeOrder) return { placed: false, reason: "place_order_missing" };
  placeOrder.click();
  return { placed: true };
}

async function runCheckoutPayment(message) {
  const { tabId, checkout, payment } = message;
  if (!Number.isInteger(tabId) || !validCheckout(checkout)) throw new Error("The captured checkout is invalid or expired.");
  if (!payment || !/^(agentlane|shopee-saved)$/.test(payment.kind || "") || !/^\d{4}$/.test(payment.kind === "agentlane" ? payment.card?.number?.slice(-4) || "" : payment.lastFour || "")) throw new Error("Choose a valid payment card.");

  const [capture] = await chrome.scripting.executeScript({ target: { tabId }, func: captureCheckoutTotal });
  if (!Number.isFinite(capture?.result) || Math.abs(capture.result - checkout.totalSgd) > 0.005) throw new Error("The Shopee total changed. Reopen Card Companion and review it again.");

  let lastFour = payment.lastFour;
  if (payment.kind === "agentlane") {
    if (!validSandboxCard(payment.card)) throw new Error("The selected AgentLane card is invalid.");
    lastFour = payment.card.number.slice(-4);
    const [opened] = await chrome.scripting.executeScript({ target: { tabId }, func: openNewCardForm });
    if (!opened?.result?.opened) throw new Error("Shopee's new-card form could not be opened.");
    await waitForTab(tabId, (url) => url.hostname === "pay.shopee.sg" && url.pathname.startsWith("/payment-v2/add-card"));
    return { ok: true, awaitingCardChoice: true };
  }

  const [placed] = await chrome.scripting.executeScript({ target: { tabId }, func: selectCardAndPlaceOrder, args: [lastFour, checkout.totalSgd] });
  if (!placed?.result?.placed) {
    const reasons = { total_changed: "The Shopee total changed.", card_missing: "Shopee did not show the selected card.", place_order_missing: "Shopee's Place Order button is unavailable." };
    throw new Error(reasons[placed?.result?.reason] || "Shopee could not place the order.");
  }
  return { ok: true };
}

async function openCardCompanion(tabId, windowId, mode) {
  await chrome.storage.session.set({ agentlaneAutoPopup: { tabId, mode, openedAt: new Date().toISOString() } });
  await chrome.action.setBadgeText({ tabId, text: "" });
  try {
    await chrome.action.openPopup({ windowId });
  } catch {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#1f5638" });
    await chrome.action.setBadgeText({ tabId, text: "CARD" });
    await chrome.action.setTitle({ tabId, title: "Choose an AgentLane card" });
  }
}

async function runAddSelectedCard(message) {
  const { tabId, checkout, card } = message;
  if (!Number.isInteger(tabId) || !validCheckout(checkout) || !validSandboxCard(card)) throw new Error("The selected card or checkout is invalid.");
  if (card.checkoutId !== checkout.checkoutId) throw new Error("This card is not bound to the current checkout.");
  const tab = await chrome.tabs.get(tabId);
  const currentUrl = new URL(tab.url || "about:blank");
  if (currentUrl.hostname !== "pay.shopee.sg" || !currentUrl.pathname.startsWith("/payment-v2/add-card")) throw new Error("Open Shopee's Add Card page first.");

  let filled = 0;
  for (let attempt = 0; attempt < 12 && filled < 4; attempt += 1) {
    const results = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: fillNewCard, args: [card] });
    filled = Math.max(0, ...results.map((entry) => entry.result?.filled || 0));
    if (filled < 4) await wait(250);
  }
  if (filled !== 4) throw new Error(`Shopee exposed only ${filled} of 4 card fields. Reopen Add Card and retry.`);
  let submitted = false;
  for (let attempt = 0; attempt < 24 && !submitted; attempt += 1) {
    await wait(250);
    const results = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: submitNewCard });
    submitted = results.some((entry) => entry.result?.submitted);
  }
  if (!submitted) throw new Error("Shopee did not enable the Add Card submission.");
  const checkoutTab = await waitForTab(tabId, (url) => url.hostname === "shopee.sg" && url.pathname.startsWith("/checkout"));
  await wait(400);
  await openCardCompanion(tabId, checkoutTab.windowId, "checkout");
  return { ok: true };
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const rawUrl = changeInfo.url || tab.url || "";
  let url;
  try { url = new URL(rawUrl); } catch { return; }
  const isAddCard = url.hostname === "pay.shopee.sg" && url.pathname.startsWith("/payment-v2/add-card");
  if (!isAddCard) {
    openedAddCardTabs.delete(tabId);
    return;
  }
  if (changeInfo.status !== "complete") return;
  if (!isAddCard || !tab.active || !Number.isInteger(tab.windowId)) return;
  const key = `${tabId}:${url.origin}${url.pathname}`;
  if (openedAddCardTabs.get(tabId) === key) return;
  openedAddCardTabs.set(tabId, key);
  openCardCompanion(tabId, tab.windowId, "add_card").catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "agentlane_checkout_captured") {
    const checkout = message.checkout;
    if (!validCheckout(checkout)) {
      sendResponse({ ok: false, error: "Shopee checkout capture was invalid." });
      return false;
    }
    chrome.storage.session.set({ agentlaneShopeeCheckout: checkout })
      .then(() => chrome.storage.local.remove("agentlanePendingShopeeCheckout"))
      .then(async () => {
        const tab = _sender.tab;
        if (tab?.active && Number.isInteger(tab.id) && Number.isInteger(tab.windowId)) await openCardCompanion(tab.id, tab.windowId, "checkout");
        sendResponse({ ok: true });
      })
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Checkout takeover failed." }));
    return true;
  }
  if (message?.type === "agentlane_pay_checkout") {
    runCheckoutPayment(message).then(sendResponse).catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Shopee payment failed." }));
    return true;
  }
  if (message?.type === "agentlane_add_selected_card") {
    runAddSelectedCard(message).then(sendResponse).catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Shopee could not add the card." }));
    return true;
  }
  return false;
});
