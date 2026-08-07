import { createFileRoute } from "@tanstack/react-router";
import { Layers, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteGroup,
  useGroupMembers,
  useGroups,
  useSaveGroup,
  useSetGroupMembers,
  type ExpenseGroup,
} from "@/hooks/use-groups";
import { useMembers, useRoomRole } from "@/hooks/use-mess";

export const Route = createFileRoute("/_authenticated/rooms/$roomId/groups")({
  component: GroupsPage,
});

const palette = ["#2f9e8f", "#5cb85c", "#0ea5e9", "#a855f7", "#f97316", "#ef4444", "#eab308", "#64748b"];

function GroupsPage() {
  const { roomId } = Route.useParams();
  const { user, isSuperAdmin } = useAuth();
  const { data: groups, isLoading } = useGroups(roomId);
  const { data: groupMembers } = useGroupMembers(roomId);
  const { data: members } = useMembers(roomId);
  const { canManage } = useRoomRole(roomId, user?.id, isSuperAdmin);

  const saveGroup = useSaveGroup(roomId);
  const deleteGroup = useDeleteGroup(roomId);
  const setGroupMembers = useSetGroupMembers(roomId);

  const [editing, setEditing] = useState<ExpenseGroup | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(palette[0]!);
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<ExpenseGroup | null>(null);

  const idsByGroup = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of groupMembers ?? []) {
      const list = map.get(row.group_id) ?? [];
      list.push(row.user_id);
      map.set(row.group_id, list);
    }
    return map;
  }, [groupMembers]);

  const nameByUser = useMemo(() => new Map((members ?? []).map((m) => [m.user_id, m.name])), [members]);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setColor(palette[0]!);
    setSelected((members ?? []).map((m) => m.user_id));
    setOpen(true);
  }

  function openEdit(group: ExpenseGroup) {
    setEditing(group);
    setName(group.name);
    setDescription(group.description ?? "");
    setColor(group.color);
    setSelected(idsByGroup.get(group.id) ?? []);
    setOpen(true);
  }

  async function onSave() {
    if (!name.trim()) {
      toast.error("Give the group a name");
      return;
    }
    try {
      const id = await saveGroup.mutateAsync({
        ...(editing ? { id: editing.id } : {}),
        values: {
          name: name.trim(),
          icon: "layers",
          color,
          description: description.trim() || null,
        },
      });
      await setGroupMembers.mutateAsync({ groupId: id, userIds: selected });
      toast.success(editing ? "Group updated" : "Group created");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the group");
    }
  }

  async function onDelete() {
    if (!pendingDelete) return;
    try {
      await deleteGroup.mutateAsync(pendingDelete.id);
      toast.success("Group deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the group");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-2.5 sm:space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-[Outfit] text-base font-semibold sm:text-lg">Expense groups</h2>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            Each group has its own members, wallet and settlement.
          </p>
        </div>
        {canManage ? (
          <Button size="sm" className="h-9 shrink-0 rounded-2xl" onClick={openCreate}>
            <Plus className="mr-1 size-4" /> New
          </Button>
        ) : null}
      </div>

      <div className="grid gap-1.5 pb-4 sm:grid-cols-2 sm:gap-3">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading groups…</p>
        ) : (groups ?? []).length ? (
          (groups ?? []).map((g, i) => {
            const ids = idsByGroup.get(g.id) ?? [];
            return (
              <Card
                key={g.id}
                className="animate-slide-up rounded-2xl sm:rounded-3xl"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <CardContent className="flex items-start gap-2.5 p-3 sm:p-4">
                  <span
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl text-white"
                    style={{ backgroundColor: g.color }}
                    aria-hidden="true"
                  >
                    <Layers className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{g.name}</p>
                      {g.is_default ? (
                        <Badge variant="secondary" className="rounded-full text-[10px]">
                          Default
                        </Badge>
                      ) : null}
                    </div>
                    {g.description ? (
                      <p className="truncate text-[11px] text-muted-foreground">{g.description}</p>
                    ) : null}
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Users className="size-3" />
                      {ids.length
                        ? ids
                            .map((id) => nameByUser.get(id) ?? "Member")
                            .slice(0, 3)
                            .join(", ") + (ids.length > 3 ? ` +${ids.length - 3}` : "")
                        : "No members yet"}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full"
                        onClick={() => openEdit(g)}
                        aria-label={`Edit ${g.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full text-destructive"
                        onClick={() => setPendingDelete(g)}
                        aria-label={`Delete ${g.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">No groups yet.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit group" : "New group"}</DialogTitle>
            <DialogDescription>Expenses are split only between the members you pick here.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="group-name">Name</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="Mess, Utilities…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-desc">Description</Label>
              <Textarea
                id="group-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={140}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <div className="flex flex-wrap gap-2">
                {palette.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Colour ${c}`}
                    onClick={() => setColor(c)}
                    className={`size-7 rounded-full ring-offset-2 ring-offset-background ${
                      color === c ? "ring-2 ring-ring" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Members</Label>
              <div className="grid max-h-44 grid-cols-1 gap-1 overflow-y-auto rounded-2xl border border-border p-2 sm:grid-cols-2">
                {(members ?? []).map((m) => (
                  <label
                    key={m.user_id}
                    className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      checked={selected.includes(m.user_id)}
                      onCheckedChange={(checked) =>
                        setSelected((prev) =>
                          checked ? [...new Set([...prev, m.user_id])] : prev.filter((id) => id !== m.user_id),
                        )
                      }
                    />
                    <span className="truncate">{m.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void onSave()} disabled={saveGroup.isPending} className="rounded-2xl">
              {editing ? "Save changes" : "Create group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.name}?</DialogTitle>
            <DialogDescription>Expenses in this group stay, but lose their group link.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" className="rounded-2xl" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-2xl" onClick={() => void onDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
