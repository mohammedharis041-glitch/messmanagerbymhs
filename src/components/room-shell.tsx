import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  Contrast,
  LayoutDashboard,
  LogOut,
  Moon,
  Receipt,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/rooms/$roomId", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/rooms/$roomId/expenses", label: "Expenses", icon: Receipt, exact: false },
  { to: "/rooms/$roomId/members", label: "Members", icon: Users, exact: false },
  { to: "/rooms/$roomId/settings", label: "Settings", icon: Settings, exact: false },
] as const;

export function RoomShell({
  roomId,
  title,
  subtitle,
  children,
}: {
  roomId: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { theme, toggleTheme } = useTheme();
  const { profile, user, signOut, isSuperAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const base = `/rooms/${roomId}`;

  const isActive = (to: string, exact: boolean) => {
    const resolved = to.replace("$roomId", roomId);
    return exact ? pathname === resolved || pathname === `${resolved}/` : pathname.startsWith(resolved);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="safe-top sticky top-0 z-30 border-b border-border/70 glass-panel">
        <div className="mx-auto flex max-w-5xl items-center gap-1 px-2 py-1.5 sm:gap-3 sm:px-4 sm:py-3">
          <Button asChild variant="ghost" size="icon" className="size-9 rounded-full">
            <Link to="/rooms" aria-label="All rooms">
              <ArrowLeft className="size-[18px]" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-[Outfit] text-sm font-semibold text-foreground sm:text-base">{title}</h1>
            {subtitle ? <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{subtitle}</p> : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full"
            onClick={toggleTheme}
            aria-label={`Theme: ${theme}. Switch theme`}
          >
            {theme === "light" ? (
              <Moon className="size-[18px]" />
            ) : theme === "dark" ? (
              <Contrast className="size-[18px]" />
            ) : (
              <Sun className="size-[18px]" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none ring-ring focus-visible:ring-2" aria-label="Account">
                <Avatar className="size-8 border border-border sm:size-9">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                  <AvatarFallback className="bg-primary-container text-primary-container-foreground">
                    {initials(profile?.full_name ?? user?.email)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl">
              <DropdownMenuLabel className="truncate">
                {profile?.full_name ?? user?.email}
                {isSuperAdmin ? <span className="ml-1 text-xs text-primary">· Super Admin</span> : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/rooms">All rooms</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void signOut()} className="text-destructive">
                <LogOut className="mr-2 size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="mx-auto hidden max-w-5xl gap-1 px-4 pb-2 md:flex">
          {tabs.map((tab) => {
            const active = isActive(tab.to, tab.exact);
            return (
              <Link
                key={tab.label}
                to={tab.to}
                params={{ roomId }}
                className={cn(
                  "relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary-container text-primary-container-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <tab.icon className="size-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main key={pathname} className="animate-page mx-auto w-full max-w-5xl px-2.5 py-3 sm:px-4 sm:py-5">
        {children}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border/70 glass-panel md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1">
          {tabs.map((tab) => {
            const active = isActive(tab.to, tab.exact);
            return (
              <Link
                key={tab.label}
                to={tab.to}
                params={{ roomId }}
                className="group relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1"
              >
                <span
                  className={cn(
                    "flex h-6 w-12 items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.05,0.7,0.1,1)]",
                    active
                      ? "scale-[1.12] bg-primary-container text-primary-container-foreground"
                      : "scale-100 text-muted-foreground",
                  )}
                >
                  <tab.icon className="size-[18px]" />
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-opacity duration-200",
                    active ? "text-foreground opacity-100" : "text-muted-foreground opacity-70",
                  )}
                >
                  {tab.label}
                </span>
              </Link>

            );
          })}
        </div>
      </nav>
      <span className="sr-only">{base}</span>
    </div>
  );
}
