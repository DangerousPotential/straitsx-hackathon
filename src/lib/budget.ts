import type { BudgetPolicy } from "@/types/commerce";

export const PROVIDER_TRANSACTION_LIMIT_SGD=30;
export const ESTIMATED_CHECKOUT_FEES_SGD=2.49;

function configuredUserLimit() {
  const value=Number(process.env.USER_TRANSACTION_LIMIT_SGD??PROVIDER_TRANSACTION_LIMIT_SGD);
  if(!Number.isFinite(value)||value<5) return PROVIDER_TRANSACTION_LIMIT_SGD;
  return Math.min(value,PROVIDER_TRANSACTION_LIMIT_SGD);
}

export function getBudgetPolicy():BudgetPolicy {
  const userTransactionLimitSgd=configuredUserLimit();
  return {
    userTransactionLimitSgd,
    providerTransactionLimitSgd:PROVIDER_TRANSACTION_LIMIT_SGD,
    effectiveTransactionLimitSgd:Math.min(userTransactionLimitSgd,PROVIDER_TRANSACTION_LIMIT_SGD),
    estimatedFeesSgd:ESTIMATED_CHECKOUT_FEES_SGD,
  };
}

export function validateIssuanceAmount(amount:number) {
  const policy=getBudgetPolicy();
  return { policy,valid:Number.isFinite(amount)&&amount>=5&&amount<=policy.effectiveTransactionLimitSgd };
}
