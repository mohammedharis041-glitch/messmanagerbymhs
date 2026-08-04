import { useMemo } from "react";

import type { Category, Expense, MemberWithProfile } from "@/hooks/use-mess";
import { settle, type MemberBalance, type Transfer } from "@/lib/settlement";
import { periodRange, type PeriodKey } from "@/lib/format";

export type RoomStats = {
  totalExpense: number;
  totalContribution: number;
  walletBalance: number;
  perHead: number;
  expenseCount: number;
  byCategory: Array<{ name: string; value: number; color: string }>;
  byDay: Array<{ label: string; amount: number }>;
  balances: MemberBalance[];
  transfers: Transfer[];
  filtered: Expense[];
};

export function useRoomStats({
  expenses,
  members,
  categories,
  period,
}: {
  expenses: Expense[] | undefined;
  members: MemberWithProfile[] | undefined;
  categories: Category[] | undefined;
  period: PeriodKey;
}): RoomStats {
  return useMemo(() => {
    const range = periodRange(period);
    const list = (expenses ?? []).filter((e) =>
      range ? e.spent_at >= range.start && e.spent_at <= range.end : true,
    );
    const roster = members ?? [];

    const totalExpense = list.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalContribution = roster.reduce((sum, m) => sum + Number(m.monthly_contribution ?? 0), 0);
    const perHead = roster.length ? totalExpense / roster.length : 0;

    const catMap = new Map((categories ?? []).map((c) => [c.id, c]));
    const catTotals = new Map<string, number>();
    for (const e of list) {
      const key = e.category_id ?? "uncategorised";
      catTotals.set(key, (catTotals.get(key) ?? 0) + Number(e.amount));
    }
    const byCategory = [...catTotals.entries()]
      .map(([id, value]) => ({
        name: catMap.get(id)?.name ?? "Uncategorised",
        value: Math.round(value * 100) / 100,
        color: catMap.get(id)?.color ?? "#94a3b8",
      }))
      .sort((a, b) => b.value - a.value);

    const dayTotals = new Map<string, number>();
    for (const e of list) {
      dayTotals.set(e.spent_at, (dayTotals.get(e.spent_at) ?? 0) + Number(e.amount));
    }
    const byDay = [...dayTotals.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({
        label: new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        amount: Math.round(amount * 100) / 100,
      }));

    const paidBy = new Map<string, number>();
    for (const e of list) {
      paidBy.set(e.paid_by, (paidBy.get(e.paid_by) ?? 0) + Number(e.amount));
    }

    const balances: MemberBalance[] = roster.map((m) => {
      const paid = paidBy.get(m.user_id) ?? 0;
      const contributed = Number(m.monthly_contribution ?? 0);
      return {
        userId: m.user_id,
        name: m.name,
        paid,
        contributed,
        share: perHead,
        balance: Math.round((paid - perHead) * 100) / 100,
      };
    });

    return {
      totalExpense,
      totalContribution,
      walletBalance: totalContribution - totalExpense,
      perHead,
      expenseCount: list.length,
      byCategory,
      byDay,
      balances,
      transfers: settle(balances),
      filtered: list,
    };
  }, [expenses, members, categories, period]);
}
