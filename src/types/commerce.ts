export type DataSource = {
  name:string;
  authority:"Official marketplace feed"|"Verified merchant listing"|"Live public listing";
  checkedMinutesAgo:number;
};

export type SellerProfile = {
  name:string|null;
  successfulTransactions:number|null;
  paymentAddressChanges:number|null;
  monitoringDays:number|null;
};

export type RankingFactors = {
  trust:number;
  fit:number;
  quality:number;
  value:number;
  delivery:number;
};

export type OfferRanking = {
  rank:number;
  overallScore:number;
  factors:RankingFactors;
  weights:RankingFactors;
  summary:string;
};

export type ProductOfferBase = {
  id:string;
  title:string;
  merchant:"Lazada"|"Shopee"|"Amazon SG";
  price:number;
  rating:number|null;
  reviewCount:number|null;
  delivery:string|null;
  availability?:string|null;
  listingUrl?:string;
  artColor:string;
  icon:"earbuds"|"mouse"|"speaker";
  badge:"Best match"|"Best value"|"Fastest";
  reason:string;
  requestFitScore?:number;
  source:DataSource;
  seller:SellerProfile;
};
export type ProductOffer = ProductOfferBase & { ranking:OfferRanking };
export type ShoppingIntent = { query:string; maxBudget:number; priorities:string[]; requirements:string[] };
export type TrustPolicy = { maxDataAgeMinutes:number; minimumSuccessfulTransactions:number; maximumAddressChangesPer90Days:number };
export type BudgetPolicy = { userTransactionLimitSgd:number; providerTransactionLimitSgd:number; effectiveTransactionLimitSgd:number; estimatedFeesSgd:number };
export type ResultGeneration = { mode:"live_mcp_review"|"openai_simulation"|"catalog_fallback"; disclaimer:string };
export type SearchResponse = { intent:ShoppingIntent; offers:ProductOffer[]; trustPolicy:TrustPolicy; budgetPolicy:BudgetPolicy; generation:ResultGeneration; screenedOut:number };
