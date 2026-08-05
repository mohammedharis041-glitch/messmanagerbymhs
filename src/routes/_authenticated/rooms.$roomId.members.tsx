import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Crown, Shield, Trash2, User } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useExpenses,
  useMembers,
  useRemoveMember,
  useRoom,
  useUpdateMember,
  type MemberWithProfile,
  type RoomRole,
} from "@/hooks/use-mess";
import { useRoomStats } from "@/hooks/use-room-stats";
import { formatCurrency, formatDate, initials } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/rooms/$roomId/members")({
  component: MembersPage,
});

const roleIcon: Record<RoomRole, typeof User> = { owner: Crown, admin: Shield, member: User };

function MembersPage() {
  const { roomId } = Route.useParams();
  const { user, isSuperAdmin } = useAuth();
  const { data: room } = useRoom(roomId);
  const { data: members } = useMembers(roomId);
  const { data: expenses } = useExpenses(roomId);
  const updateMember = useUpdateMember(roomId);
  const removeMember = useRemoveMember(roomId);
  const stats = useRoomStats({ expenses, members, categories: [], period: "month" });

  const [copied, setCopied] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingRemove, setPendingRemove] = useState<MemberWithProfile | null>(null);

  const currency = room?.currency ?? "AED";
  const myRole = useMemo(
    () => (members ?? []).find((m) => m.user_id === user?.id)?.role ?? "member",
    [members, user],
  );
  const canManage = isSuperAdmin || myRole === "owner" || myRole === "admin";
  const isOwner = isSuperAdmin || myRole === "owner";
  const balanceByUser = useMemo(
    () => new Map(stats.balances.map((b) => [b.userId, b])),
    [stats.balances],
  );

  async function copyInvite() {
    if (!room) return;
    await navigator.clipboard.writeText(room.invite_code);
    setCopied(true);
    toast.success("Invite code copied");
    setTimeout(() => setCopied(false), 1800);
  }

  async function saveContribution(member: MemberWithProfile) {
    const raw = drafts[member.id];
    if (raw === undefined) return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      await updateMember.mutateAsync({ id: member.id, patch: { monthly_contribution: value } });
      setDrafts((d) => {
        const next = { ...d };
        delete next[member.id];
        return next;
      });
      toast.success("Contribution updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update contribution");
    }
  }

  async function saveLeftAt(member: MemberWithProfile, value: string) {
    try {
      await updateMember.mutateAsync({
        id: member.id,
        patch: { left_at: value ? value : null } as Partial<MemberWithProfile>,
      });
      toast.success(value ? "Leaving date saved" : "Leaving date cleared");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the leaving date");
    }
  }

  async function changeRole(member: MemberWithProfile, role: RoomRole) {
    try {
      await updateMember.mutateAsync({ id: member.id, patch: { role } });
      toast.success(`${member.name} is now ${role}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change the role");
    }
  }

  async function confirmRemove() {
    if (!pendingRemove) return;
    try {
      await removeMember.mutateAsync(pendingRemove.id);
      toast.success("Member removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the member");
    } finally {
      setPendingRemove(null);
    }
  }

  return (
    <div className="space-y-2.5 sm:space-y-4">
      <Card className="animate-slide-up rounded-2xl sm:rounded-3xl">
        <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-3">
          <CardTitle className="font-[Outfit] text-sm sm:text-base">Invite people</CardTitle>
          <CardDescription className="text-xs">Share this code to let someone join.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 p-3 pt-0 sm:gap-3 sm:p-6 sm:pt-0">
          <code className="flex-1 rounded-2xl bg-surface px-2 py-2 text-center font-[Outfit] text-base font-semibold tracking-[0.2em] sm:px-4 sm:py-3 sm:text-2xl sm:tracking-[0.35em]">
            {room?.invite_code ?? "······"}
          </code>
          <Button onClick={() => void copyInvite()} size="sm" variant="outline" className="rounded-2xl">
            {copied ? <Check className="mr-1 size-4" /> : <Copy className="mr-1 size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </CardContent>
      </Card>

      {!canManage ? (
        <p className="px-1 text-[11px] text-muted-foreground">
          Only owners and admins can change roles, contributions or membership dates.
        </p>
      ) : null}

      <div className="space-y-1.5 pb-4 sm:space-y-2">
        {(members ?? []).map((m, i) => {
          const Icon = roleIcon[m.role as RoomRole] ?? User;
          const balance = balanceByUser.get(m.user_id);
          const draft = drafts[m.id];
          const leftAt = (m as { left_at?: string | null }).left_at ?? null;
          return (
            <Card
              key={m.id}
              className="animate-slide-up rounded-2xl sm:rounded-3xl"
              style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
            >
              <CardContent className="space-y-2.5 p-3 sm:space-y-3 sm:p-4">
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-9 border border-border sm:size-11">
                    <AvatarImage src={m.profile?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="bg-primary-container text-primary-container-foreground">
                      {initials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium sm:text-sm">
                      {m.name}
                      {m.user_id === user?.id ? <span className="text-muted-foreground"> (you)</span> : null}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      Joined {formatDate(m.joined_at)}
                      {leftAt ? ` · left ${formatDate(leftAt)}` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 rounded-full text-[10px] capitalize">
                    <Icon className="mr-1 size-3" />
                    {m.role}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <Stat label="Paid" value={formatCurrency(balance?.paid ?? 0, currency)} />
                  <Stat
                    label={`Share · ${balance?.days ?? 0}d`}
                    value={formatCurrency(balance?.share ?? 0, currency)}
                  />
                  <Stat
                    label="Net"
                    value={formatCurrency(balance?.balance ?? 0, currency)}
                    tone={(balance?.balance ?? 0) >= 0 ? "positive" : "negative"}
                  />
                </div>

                {canManage ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className="h-8 w-24 rounded-xl text-xs"
                        value={draft ?? String(m.monthly_contribution ?? 0)}
                        onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
                        aria-label={`Monthly contribution for ${m.name}`}
                      />
                      <span className="text-[11px] text-muted-foreground">contribution</span>
                      {draft !== undefined ? (
                        <Button size="sm" className="h-8 rounded-xl text-xs" onClick={() => void saveContribution(m)}>
                          Save
                        </Button>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="date"
                        className="h-8 w-[9.5rem] rounded-xl text-xs"
                        value={leftAt ?? ""}
                        onChange={(e) => void saveLeftAt(m, e.target.value)}
                        aria-label={`Left date for ${m.name}`}
                      />
                      <span className="text-[11px] text-muted-foreground">left on</span>
                    </div>
                    {isOwner && m.role !== "owner" ? (
                      <Select value={m.role} onValueChange={(v) => void changeRole(m, v as RoomRole)}>
                        <SelectTrigger className="h-8 w-24 rounded-xl text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : null}
                    {isOwner && m.role !== "owner" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full text-destructive"
                        onClick={() => setPendingRemove(m)}
                        aria-label={`Remove ${m.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>


      <AlertDialog open={pendingRemove !== null} onOpenChange={(o) => !o && setPendingRemove(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingRemove?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They lose access to this room. Their past expenses stay in the records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-full" onClick={() => void confirmRemove()}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="rounded-2xl bg-surface px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={
          tone === "positive"
            ? "font-semibold tabular-nums text-primary"
            : tone === "negative"
              ? "font-semibold tabular-nums text-destructive"
              : "font-semibold tabular-nums"
        }
      >
        {value}
      </p>
    </div>
  );
}
