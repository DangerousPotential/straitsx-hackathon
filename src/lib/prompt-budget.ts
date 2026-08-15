export function promptBudgetLimit(message: string) {
  const normalized = message.replace(/,/g, "");
  const patterns = [
    /(?:under|below|less than|up to|maximum(?: budget)?(?: of)?|max(?: budget)?(?: of)?)\s*(?:s\s*\$|sgd|\$)?\s*(\d+(?:\.\d+)?)/i,
    /(?:s\s*\$|sgd|\$)\s*(\d+(?:\.\d+)?)/i,
  ];
  for (const pattern of patterns) {
    const value = Number(normalized.match(pattern)?.[1]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

export function effectiveSearchBudget(
  message: string,
  selectedBudget: number | undefined,
) {
  const promptBudget = promptBudgetLimit(message);
  const selected = Number.isFinite(selectedBudget)
    ? Number(selectedBudget)
    : Infinity;
  return Math.min(selected, promptBudget ?? Infinity);
}
