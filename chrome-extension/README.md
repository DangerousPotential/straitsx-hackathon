# AgentLane Card Companion

A Manifest V3 companion that verifies a live Shopee price before AgentLane can issue a non-spendable StraitsX Fuji sandbox Visa.

AgentLane production app: [https://straitsx-hackathon.vercel.app](https://straitsx-hackathon.vercel.app)

## Flow

1. Start from an AgentLane Shopee handoff. When Shopee reaches `shopee.sg/cart` with selected items, the extension activates the exact **Check Out** control once; it never selects or changes cart items.
2. As soon as Shopee reaches `/checkout`, the extension captures the authoritative checkout total and automatically opens Card Companion.
3. Card Companion lists every card in the local AgentLane vault plus non-expired cards already saved in Shopee. Low-balance AgentLane cards remain selectable and carry a visible warning.
4. If a checkout-sized AgentLane card is still needed, choose **Purchase now** to send only the checkout total to AgentLane.
5. Choose **Purchase now** to return the checkout total to AgentLane. MetaMask asks for the required Fuji test authorization and AgentLane creates a checkout-sized, non-spendable sandbox Visa.
6. Open the extension on AgentLane's success screen. It safely parses and stores the sandbox card until **Forget captured card** is selected.
7. Return to the already-open Shopee checkout. Card Companion reopens with the available cards without retaining the details of Shopee-saved cards.
8. If an AgentLane card is chosen, Shopee's secure Add Card page opens. On Chrome 127+, Card Companion opens its own popup automatically on that page and displays up to five checkout-bound AgentLane cards.
9. Choose **Add selected card to Shopee**. The extension fills only the four card fields, submits Add Card, returns to checkout, and reopens Card Companion.
10. Select the newly saved card and choose **Review payment**. The extension shows the exact card and checkout total before enabling **Confirm and pay**.
11. After that explicit confirmation, the background payment worker verifies that the total has not changed and clicks Shopee's exact **Place Order** control.
12. The original **Prepare card checkout** path remains available when the user wants autofill without order submission.

## Price accuracy

- Product pages use Shopee's schema.org `Product` / `Offer` price when it identifies one exact SGD price.
- Voucher values, crossed-out prices, installment amounts, and arbitrary elements whose class contains `price` are not treated as the product price.
- Cart capture succeeds only when the selected product row exposes one unambiguous current price. Otherwise, continue to checkout and capture Shopee's labeled total.
- Checkout capture prioritizes the value paired with `Total Payment`, then `Grand Total`, then `Order Total`.
- When no authoritative single value is available, the extension reports that it could not determine the price instead of guessing.

## Security boundary

- The Fuji sandbox card is kept in `chrome.storage.local` until the user chooses **Forget captured card**. A session copy supports fast popup access.
- A local vault keeps at most five captured AgentLane sandbox cards. Checkout shows every card that can cover the total; the chosen card is then bound to that checkout before Shopee's Add Card step.
- Sensitive fields are masked by default and appear only after the user chooses **Reveal card details**. They are never written to the browser console.
- A session-only recovery trail records issuance metadata and the captured card's last four digits, never the full card number or CVV.
- Cart takeover is armed only by a recent AgentLane product handoff, expires after ten minutes, and activates Shopee's exact **Check Out** control only when one or more items are already selected. It never selects items or touches **Place Order**.
- A prior AgentLane product context is optional. The pending checkout contains only total, currency, item count, pathname, offer ID, and timestamp; the worker moves it into session storage and removes the local copy.
- The issued-card handoff contains the sandbox card document, card ID, settlement transaction, value, and timestamp. It never stores the wallet signature or payment authorization.
- The returned HTML is parsed as an inert document; it is never inserted into the extension UI or executed.
- The extension has narrowly scoped access to `shopee.sg` and `pay.shopee.sg` only so a user-confirmed checkout action can cross Shopee's secure card page. It requests no cookie access, browsing history, or clipboard access.
- `activeTab` access is granted only when the user clicks the extension.
- It fills only card number, expiry, CVV, and cardholder name on `pay.shopee.sg/payment-v2/add-card`.
- A checkout capture contains only total, currency, item count, pathname, offer ID, and timestamp. It does not retain the delivery address or recipient name.
- Checkout captures expire after 30 minutes, and a card must be bound to the current capture before it can be filled.
- It does not alter the billing address supplied by Shopee. The new-card form and **Place Order** are submitted only after the extension shows the selected card and exact total and the user chooses **Confirm and pay**.
- Fuji sandbox cards cannot spend real money.

## Load unpacked

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `chrome-extension` directory.
4. After code updates, click **Reload** on the extension card.
