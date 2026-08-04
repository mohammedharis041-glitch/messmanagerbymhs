import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, PieChart, Receipt, ShieldCheck, Users, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mess Manager Pro — Shared mess expenses, settled fairly" },
      {
        name: "description",
        content:
          "Track shared mess expenses, contributions and wallet balance across rooms, then settle up in the fewest transfers. Works offline-friendly on phone, tablet and desktop.",
      },
      { property: "og:title", content: "Mess Manager Pro — Shared mess expenses, settled fairly" },
      {
        property: "og:description",
        content:
          "Multi-room mess accounting with roles, live dashboards, category analytics and automatic settlement instructions.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Receipt, title: "Every expense, logged", body: "Categories, receipts, notes and who actually paid." },
  { icon: Wallet, title: "Live mess wallet", body: "Contributions in, expenses out, remaining cash always visible." },
  { icon: PieChart, title: "Real analytics", body: "Category and member breakdowns that update as you type." },
  { icon: Users, title: "Rooms & roles", body: "Owner, admin and member permissions enforced server-side." },
];

function Landing() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) window.location.replace("/rooms");
  }, [loading, session]);

  return (
    <main className="min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-primary opacity-10" />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-16 px-5 py-16 sm:py-24">
        <header className="animate-slide-up space-y-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted-foreground elevation-1">
            <ShieldCheck className="size-3.5 text-primary" /> Secure multi-room mess accounting
          </span>
          <h1 className="font-[Outfit] text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
            Mess Manager <span className="text-primary">Pro</span>
          </h1>
          <p className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg">
            Shared kitchen, shared bills — zero arguments. Log expenses, track each member's
            contribution, and get exact settlement instructions at month end.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link to="/auth">
                Get started <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-7">
              <Link to="/auth" search={{ mode: "signin" }}>
                I already have an account
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {features.map((f, i) => (
            <article
              key={f.title}
              className="animate-slide-up rounded-3xl border border-border bg-card p-6 elevation-1"
              style={{ animationDelay: `${80 * i}ms` }}
            >
              <div className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-primary-container text-primary-container-foreground">
                <f.icon className="size-5" />
              </div>
              <h2 className="font-[Outfit] text-lg font-semibold text-foreground">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
