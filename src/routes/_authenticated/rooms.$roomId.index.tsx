import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Receipt, TrendingUp, Users, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategories, useExpenses, useMembers, useRoom } from "@/hooks/use-mess";
import { useRoomStats } from "@/hooks/use-room-stats";
import { formatCurrency, formatDate, type PeriodKey } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/rooms/$roomId/")({
  component: RoomDashboard,
});

const periods: Array<{ key: PeriodKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week", label: "7 days" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "all", label: "All" },
];

function RoomDashboard() {
  const { roomId } = Route.useParams();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const { data: room } = useRoom(roomId);
  const { data: members } = useMembers(roomId);
  const { data: categories } = useCategories(roomId);
  const { data: expenses } = useExpenses(roomId);
  const stats = useRoomStats({ expenses, members, categories, period });
  const currency = room?.currency ?? "AED";

  const recent = stats.filtered.slice(0, 5);

  return (
    <div className="space-y-5">
      <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
        <TabsList className="w-full justify-between rounded-2xl">
          {periods.map((p) => (
            <TabsTrigger key={p.key} value={p.key} className="flex-1 rounded-xl text-xs sm:text-sm">
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="animate-slide-up overflow-hidden rounded-4xl border-0 bg-gradient-primary text-primary-foreground elevation-3">
        <CardContent className="p-6">
          <p className="text-sm/relaxed opacity-90">Mess wallet balance</p>
          <p className="mt-1 font-[Outfit] text-4xl font-bold tabular-nums">
            {formatCurrency(stats.walletBalance, currency)}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/15 p-3">
              <span className="flex items-center gap-1 opacity-90">
                <ArrowDownRight className="size-4" /> Contributions
              </span>
              <p className="mt-1 font-semibold tabular-nums">{formatCurrency(stats.totalContribution, currency)}</p>
            </div>
            <div className="rounded-2xl bg-black/15 p-3">
              <span className="flex items-center gap-1 opacity-90">
                <ArrowUpRight className="size-4" /> Expenses
              </span>
              <p className="mt-1 font-semibold tabular-nums">{formatCurrency(stats.totalExpense, currency)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Receipt} label="Entries" value={String(stats.expenseCount)} delay={0} />
        <StatCard icon={Users} label="Members" value={String(members?.length ?? 0)} delay={60} />
        <StatCard icon={TrendingUp} label="Per head" value={formatCurrency(stats.perHead, currency)} delay={120} />
        <StatCard
          icon={Wallet}
          label="Categories"
          value={String(stats.byCategory.length)}
          delay={180}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="animate-slide-up rounded-3xl">
          <CardHeader>
            <CardTitle className="font-[Outfit] text-base">Spending trend</CardTitle>
            <CardDescription>Daily totals for the selected period</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {stats.byDay.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.byDay} margin={{ left: -18, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={54} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-popover)",
                      color: "var(--color-popover-foreground)",
                    }}
                    formatter={(value: number) => formatCurrency(value, currency)}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    fill="url(#trendFill)"
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>

        <Card className="animate-slide-up rounded-3xl" style={{ animationDelay: "80ms" }}>
          <CardHeader>
            <CardTitle className="font-[Outfit] text-base">By category</CardTitle>
            <CardDescription>Where the money went</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {stats.byCategory.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={88}
                    paddingAngle={2}
                    animationDuration={900}
                  >
                    {stats.byCategory.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-popover)",
                      color: "var(--color-popover-foreground)",
                    }}
                    formatter={(value: number) => formatCurrency(value, currency)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>

        <Card className="animate-slide-up rounded-3xl" style={{ animationDelay: "160ms" }}>
          <CardHeader>
            <CardTitle className="font-[Outfit] text-base">Paid by member</CardTitle>
            <CardDescription>Out-of-pocket spend per person</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {stats.balances.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.balances} margin={{ left: -18, right: 8, top: 8 }}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={54} />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-popover)",
                      color: "var(--color-popover-foreground)",
                    }}
                    formatter={(value: number) => formatCurrency(value, currency)}
                  />
                  <Bar dataKey="paid" fill="var(--color-primary)" radius={[10, 10, 6, 6]} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>

        <Card className="animate-slide-up rounded-3xl" style={{ animationDelay: "240ms" }}>
          <CardHeader>
            <CardTitle className="font-[Outfit] text-base">Settle up</CardTitle>
            <CardDescription>Fewest transfers to square the period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.transfers.length ? (
              stats.transfers.map((t) => (
                <div
                  key={`${t.fromId}-${t.toId}`}
                  className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 text-sm"
                >
                  <span className="truncate">
                    <span className="font-medium">{t.from}</span> pays <span className="font-medium">{t.to}</span>
                  </span>
                  <Badge className="rounded-full tabular-nums">{formatCurrency(t.amount, currency)}</Badge>
                </div>
              ))
            ) : (
              <p className="rounded-2xl bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
                Everyone is square for this period.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="animate-slide-up rounded-3xl">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="font-[Outfit] text-base">Recent expenses</CardTitle>
            <CardDescription>Latest entries in this period</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/rooms/$roomId/expenses" params={{ roomId }}>
              View all
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length ? (
            recent.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(e.spent_at)}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(Number(e.amount), currency)}
                </span>
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
              No expenses recorded for this period yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <Card className="animate-slide-up rounded-3xl" style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="p-4">
        <div className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-primary-container text-primary-container-foreground">
          <Icon className="size-4" />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-[Outfit] text-lg font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Not enough data yet
    </div>
  );
}
