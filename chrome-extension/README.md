# AgentLane Card Companion

A Manifest V3 companion that verifies a live Shopee price before AgentLane can issue a non-spendable StraitsX Fuji sandbox Visa.

## Flow

1. Open a Shopee result from AgentLane.
2. AgentLane opens the merchant page without issuing a card. The extension reads Shopee's authoritative Product/Offer price and displays it on the page.
3. Choose **Return verified price to AgentLane** in the page banner or popup. Only this fresh extension quote unlocks sandbox-card issuance; the discovery price cannot issue a card.
4. If Shopee exposes multiple variant prices, select the intended variant and use **Refresh live price** instead of letting AgentLane guess.
5. Approve the budget-limited sandbox-card issuance in MetaMask. AgentLane exposes the successful card reference to the extension without exposing payment signatures.
6. Open the extension on AgentLane's successful issuance screen. It safely parses the StraitsX sandbox-card document without rendering it and stores the sandbox card locally until **Forget captured card** is selected.
7. Use **Reveal card details** in the extension whenever you need to retrieve the full test number and CVV.
8. Return to the already-open Shopee listing, select the intended variant, and proceed to checkout. The extension does not choose a variant or click **Buy Now**.
9. At Shopee checkout, click **Prepare card checkout** in the extension.
10. The extension captures the authoritative checkout total, binds the card, opens **Credit/Debit Card → Pay with new card**, and fills the four card fields.
11. Review the amount, delivery details, and card form manually. The extension never clicks **Place Order**, **Pay**, or another final-submit control.

## Price accuracy

- Product pages use Shopee's schema.org `Product` / `Offer` price when it identifies one exact SGD price.
- Voucher values, crossed-out prices, installment amounts, and arbitrary elements whose class contains `price` are not treated as the product price.
- Cart capture succeeds only when the selected product row exposes one unambiguous current price. Otherwise, continue to checkout and capture Shopee's labeled total.
- Checkout capture prioritizes the value paired with `Total Payment`, then `Grand Total`, then `Order Total`.
- When no authoritative single value is available, the extension reports that it could not determine the price instead of guessing.

## Security boundary

- The Fuji sandbox card is kept in `chrome.storage.local` until the user chooses **Forget captured card**. A session copy supports fast popup access.
- Sensitive fields are masked by default and appear only after the user chooses **Reveal card details**. They are never written to the browser console.
- A session-only recovery trail records issuance metadata and the captured card's last four digits, never the full card number or CVV.
- Legacy auto-checkout state is cleared when the verifier loads; no automated cart or Buy Now job is created.
- The issued-card handoff contains the sandbox card document, card ID, settlement transaction, value, and timestamp. It never stores the wallet signature or payment authorization.
- The returned HTML is parsed as an inert document; it is never inserted into the extension UI or executed.
- The extension has narrowly scoped access to `shopee.sg` and `pay.shopee.sg` only so one user-invoked checkout action can cross Shopee's payment iframe. It requests no cookie access, browsing history, clipboard access, or background execution.
- `activeTab` access is granted only when the user clicks the extension.
- It fills only card number, expiry, CVV, and cardholder name on `pay.shopee.sg/payment-v2/add-card`.
- A checkout capture contains only total, currency, item count, pathname, offer ID, and timestamp. It does not retain the delivery address or recipient name.
- Checkout captures expire after 30 minutes, and a card must be bound to the current capture before it can be filled.
- It does not alter the billing address supplied by Shopee and never submits either Shopee form.
- Fuji sandbox cards cannot spend real money.

## Load unpacked

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `chrome-extension` directory.
4. After code updates, click **Reload** on the extension card.
