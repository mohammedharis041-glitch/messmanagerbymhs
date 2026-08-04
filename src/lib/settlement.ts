export type MemberBalance = {
  userId: string;
  name: string;
  paid: number;
  contributed: number;
  share: number;
  balance: number;
};

export type Transfer = { fromId: string; from: string; toId: string; to: string; amount: number };

/**
 * Minimum-transfer settlement: repeatedly match the largest debtor with the
 * largest creditor. Produces at most n-1 transfers.
 */
export function settle(balances: MemberBalance[]): Transfer[] {
  const debtors = balances
    .filter((b) => b.balance < -0.005)
    .map((b) => ({ ...b, remaining: -b.balance }))
    .sort((a, b) => b.remaining - a.remaining);
  const creditors = balances
    .filter((b) => b.balance > 0.005)
    .map((b) => ({ ...b, remaining: b.balance }))
    .sort((a, b) => b.remaining - a.remaining);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;
    const amount = Math.min(debtor.remaining, creditor.remaining);
    if (amount > 0.005) {
      transfers.push({
        fromId: debtor.userId,
        from: debtor.name,
        toId: creditor.userId,
        to: creditor.name,
        amount: Math.round(amount * 100) / 100,
      });
    }
    debtor.remaining -= amount;
    creditor.remaining -= amount;
    if (debtor.remaining <= 0.005) i += 1;
    if (creditor.remaining <= 0.005) j += 1;
  }
  return transfers;
}
