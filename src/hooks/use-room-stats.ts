import { useMemo } from "react";

import type { Category, Expense, MemberWithProfile } from "@/hooks/use-mess";
import { settle, type MemberBalance, type Transfer } from "@/lib/settlement";
import { periodRange, toISODate, type PeriodKey } from "@/lib/format";

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

/** The day a member started counting towards the mess (YYYY-MM-DD). */
export function memberStartDay(member: MemberWithProfile) {
  return toISODate(new Date(member.joined_at));
}

/** The last day a member counts, or null when they are still in the mess. */
export function memberEndDay(member: MemberWithProfile) {
  const left = (member as { left_at?: string | null }).left_at;
  return left ? left.slice(0, 10) : null;
}

function isActiveOn(member: MemberWithProfile, day: string) {
  const end = memberEndDay(member);
  return memberStartDay(member) <= day && (end === null || day <= end);
}

export function useRoomStats({
  expenses,
  members,
  categories,
  period,
  participants,
  groupMemberIds,
  groupId = "all",
}: {
  expenses: Expense[] | undefined;
  members: MemberWithProfile[] | undefined;
  categories: Category[] | undefined;
  period: PeriodKey;
  /** expense id -> user ids the expense is shared between */
  participants?: Map<string, string[]>;
  /** group id -> user ids belonging to that group */
  groupMemberIds?: Map<string, string[]>;
  /** restrict every calculation to one expense group */
  groupId?: string;
}): RoomStats {
  return useMemo(() => {
    const range = periodRange(period);
    const list = (expenses ?? []).filter((e) => {
      if (range && (e.spent_at < range.start || e.spent_at > range.end)) return false;
      if (groupId !== "all" && e.group_id !== groupId) return false;
      return true;
    });
    const roster = members ?? [];


    const totalExpense = list.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalContribution = roster.reduce((sum, m) => sum + Number(m.monthly_contribution ?? 0), 0);

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

    // Fair share per expense: split only between the members the expense was
    // shared with, falling back to the expense group's roster, then the room
    // roster — always restricted to members active on that day (pro-rata
    // joining / leaving).
    const byUserId = new Map(roster.map((m) => [m.user_id, m]));
    const shareByUser = new Map<string, number>();
    const daysByUser = new Map<string, Set<string>>();

    for (const e of list) {
      const day = e.spent_at;
      const explicit = participants?.get(e.id) ?? [];
      const groupRoster = e.group_id ? (groupMemberIds?.get(e.group_id) ?? []) : [];
      const candidateIds = explicit.length ? explicit : groupRoster.length ? groupRoster : roster.map((m) => m.user_id);

      let pool = candidateIds
        .map((id) => byUserId.get(id))
        .filter((m): m is MemberWithProfile => Boolean(m) && isActiveOn(m as MemberWithProfile, day));
      if (!pool.length) {
        pool = candidateIds.map((id) => byUserId.get(id)).filter((m): m is MemberWithProfile => Boolean(m));
      }
      if (!pool.length) pool = roster;
      if (!pool.length) continue;

      const each = Number(e.amount) / pool.length;
      for (const m of pool) {
        shareByUser.set(m.user_id, (shareByUser.get(m.user_id) ?? 0) + each);
        const days = daysByUser.get(m.user_id) ?? new Set<string>();
        days.add(day);
        daysByUser.set(m.user_id, days);
      }
    }


    const balances: MemberBalance[] = roster.map((m) => {
      const paid = paidBy.get(m.user_id) ?? 0;
      const share = Math.round((shareByUser.get(m.user_id) ?? 0) * 100) / 100;
      return {
        userId: m.user_id,
        name: m.name,
        paid,
        contributed: Number(m.monthly_contribution ?? 0),
        share,
        days: daysByUser.get(m.user_id)?.size ?? 0,
        balance: Math.round((paid - share) * 100) / 100,
      };
    });

    const activeCount = balances.filter((b) => b.days > 0).length || roster.length;

    return {
      totalExpense,
      totalContribution,
      walletBalance: totalContribution - totalExpense,
      perHead: activeCount ? totalExpense / activeCount : 0,
      expenseCount: list.length,
      byCategory,
      byDay,
      balances,
      transfers: settle(balances),
      filtered: list,
    };
  }, [expenses, members, categories, period, participants, groupMemberIds, groupId]);
}
