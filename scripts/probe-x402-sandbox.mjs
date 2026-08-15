import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { bytesToHex } from "viem";

const account = privateKeyToAccount(generatePrivateKey());
const cardBody = { amount_sgd: 5, cardholder_name: "Agent Lane" };
const first = await fetch("https://card.straitsx.ai/sandbox/cardapi/issue_card", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(cardBody),
});
const challenge = JSON.parse(Buffer.from(first.headers.get("payment-required"), "base64").toString("utf8"));
const requirement = challenge.accepts[0];
const bytes = crypto.getRandomValues(new Uint8Array(32));
const authorization = {
  from: account.address,
  to: requirement.payTo,
  value: requirement.amount,
  validAfter: 0n,
  validBefore: BigInt(Math.floor(Date.now() / 1000) + requirement.maxTimeoutSeconds),
  nonce: bytesToHex(bytes),
};
const signature = await account.signTypedData({
  domain: { name: requirement.extra.name, version: requirement.extra.version, chainId: requirement.chainId, verifyingContract: requirement.asset },
  primaryType: "TransferWithAuthorization",
  types: { TransferWithAuthorization: [
    { name: "from", type: "address" }, { name: "to", type: "address" },
    { name: "value", type: "uint256" }, { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
  ] },
  message: authorization,
});
const jsonAuthorization = { ...authorization, validAfter: authorization.validAfter.toString(), validBefore: authorization.validBefore.toString() };
const variants = [
  { label: "v1", value: { x402Version: 1, scheme: requirement.scheme, network: requirement.network, payload: { signature, authorization: jsonAuthorization } } },
  { label: "accepted", value: { x402Version: 1, accepted: requirement, payload: { signature, authorization: jsonAuthorization } } },
  { label: "combined", value: { x402Version: 1, scheme: requirement.scheme, network: requirement.network, accepted: requirement, payload: { signature, authorization: jsonAuthorization } } },
];
for (const variant of variants) {
  const payment = Buffer.from(JSON.stringify(variant.value)).toString("base64");
  const response = await fetch("https://card.straitsx.ai/sandbox/cardapi/issue_card", {
    method: "POST",
    headers: { "content-type": "application/json", "payment-signature": payment },
    body: JSON.stringify(cardBody),
  });
  console.log(variant.label, response.status, await response.text());
}
