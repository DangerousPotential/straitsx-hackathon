export type DataSource = {
  name:string;
  authority:"Official marketplace feed"|"Verified merchant listing";
  checkedMinutesAgo:number;
};

export type SellerProfile = {
  name:string;
  successfulTransactions:number;
  paymentAddressChanges:number;
  monitoringDays:number;
};

export type ProductOffer = {
  id:string;
  title:string;
  merchant:"Lazada"|"Shopee"|"Amazon SG";
  price:number;
  rating:number;
  reviewCount:number;
  delivery:string;
  artColor:string;
  icon:"earbuds"|"mouse"|"speaker";
  badge:"Best match"|"Best value"|"Fastest";
  reason:string;
  source:DataSource;
  seller:SellerProfile;
};
export type ShoppingIntent = { query:string; maxBudget:number; priorities:string[]; requirements:string[] };
export type TrustPolicy = { maxDataAgeMinutes:number; minimumSuccessfulTransactions:number; maximumAddressChangesPer90Days:number };
export type BudgetPolicy = { userTransactionLimitSgd:number; providerTransactionLimitSgd:number; effectiveTransactionLimitSgd:number; estimatedFeesSgd:number };
export type ResultGeneration = { mode:"openai_simulation"|"catalog_fallback"; disclaimer:string };
export type SearchResponse = { intent:ShoppingIntent; offers:ProductOffer[]; trustPolicy:TrustPolicy; budgetPolicy:BudgetPolicy; generation:ResultGeneration; screenedOut:number };
