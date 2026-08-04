import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  generateInviteCode,
  useCategories,
  useCreateCategory,
  useDeleteRoom,
  useExpenses,
  useMembers,
  useRoom,
  useUpdateRoom,
} from "@/hooks/use-mess";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/rooms/$roomId/settings")({
  component: SettingsPage,
});

const currencies = ["AED", "INR", "USD", "SAR", "QAR", "OMR", "EUR", "GBP"];

function SettingsPage() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const { data: room } = useRoom(roomId);
  const { data: members } = useMembers(roomId);
  const { data: categories } = useCategories(roomId);
  const { data: expenses } = useExpenses(roomId);
  const updateRoom = useUpdateRoom(roomId);
  const deleteRoom = useDeleteRoom();
  const createCategory = useCreateCategory(roomId);

  const [name, setName] = useState(room?.name ?? "");
  const [newCategory, setNewCategory] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const myRole = useMemo(
    () => (members ?? []).find((m) => m.user_id === user?.id)?.role ?? "member",
    [members, user],
  );
  const isOwner = isSuperAdmin || myRole === "owner";
  const currency = room?.currency ?? "AED";
  const memberName = useMemo(() => new Map((members ?? []).map((m) => [m.user_id, m.name])), [members]);
  const categoryName = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c.name])), [categories]);

  async function patch(values: Parameters<typeof updateRoom.mutateAsync>[0]) {
    try {
      await updateRoom.mutateAsync(values);
      toast.success("Room updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the room");
    }
  }

  async function addCategory() {
    const value = newCategory.trim();
    if (value.length < 2) {
      toast.error("Category name is too short");
      return;
    }
    try {
      await createCategory.mutateAsync(value);
      setNewCategory("");
      toast.success("Category added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the category");
    }
  }

  function exportCsv() {
    const rows = [
      ["Date", "Title", "Category", "Paid by", `Amount (${currency})`, "Notes"],
      ...(expenses ?? []).map((e) => [
        e.spent_at,
        e.title,
        e.category_id ? (categoryName.get(e.category_id) ?? "") : "",
        memberName.get(e.paid_by) ?? "",
        Number(e.amount).toFixed(2),
        e.notes ?? "",
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(room?.name ?? "mess").replace(/\W+/g, "-").toLowerCase()}-expenses.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  function printReport() {
    window.print();
  }

  async function onDeleteRoom() {
    try {
      await deleteRoom.mutateAsync(roomId);
      toast.success("Room deleted");
      void navigate({ to: "/rooms", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the room");
    }
  }

  const total = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-4 pb-4">
      <Card className="animate-slide-up rounded-3xl">
        <CardHeader>
          <CardTitle className="font-[Outfit] text-base">Room details</CardTitle>
          <CardDescription>
            Created {room ? formatDate(room.created_at) : "—"} · {formatCurrency(total, currency)} recorded in total
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-name">Room name</Label>
            <div className="flex gap-2">
              <Input
                id="room-name"
                value={name || (room?.name ?? "")}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                disabled={!isOwner}
                className="rounded-2xl"
              />
              {isOwner ? (
                <Button
                  className="rounded-2xl"
                  onClick={() => void patch({ name: name.trim() || room?.name || "Mess room" })}
                  disabled={updateRoom.isPending}
                >
                  Save
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={currency}
                onValueChange={(v) => void patch({ currency: v })}
                disabled={!isOwner}
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Invite code</Label>
              <div className="flex gap-2">
                <Input readOnly value={room?.invite_code ?? ""} className="rounded-2xl tracking-[0.3em]" />
                {isOwner ? (
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => void patch({ invite_code: generateInviteCode() })}
                    aria-label="Regenerate invite code"
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {isOwner ? (
            <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-medium">Room active</p>
                <p className="text-xs text-muted-foreground">Turn off to freeze new expenses and joins.</p>
              </div>
              <Switch
                checked={room?.is_active ?? true}
                onCheckedChange={(checked) => void patch({ is_active: checked })}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="animate-slide-up rounded-3xl" style={{ animationDelay: "80ms" }}>
        <CardHeader>
          <CardTitle className="font-[Outfit] text-base">Categories</CardTitle>
          <CardDescription>Used to group expenses and drive the analytics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(categories ?? []).map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium"
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
                {c.name}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Add a category"
              maxLength={40}
              className="rounded-2xl"
            />
            <Button onClick={() => void addCategory()} className="rounded-2xl" disabled={createCategory.isPending}>
              {createCategory.isPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Plus className="mr-1 size-4" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-slide-up rounded-3xl" style={{ animationDelay: "160ms" }}>
        <CardHeader>
          <CardTitle className="font-[Outfit] text-base">Reports</CardTitle>
          <CardDescription>Export the full expense history for this room.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-2xl" onClick={exportCsv}>
            <Download className="mr-1 size-4" /> Export CSV
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={printReport}>
            <Download className="mr-1 size-4" /> Print / save as PDF
          </Button>
        </CardContent>
      </Card>

      {isOwner ? (
        <Card className="animate-slide-up rounded-3xl border-destructive/40" style={{ animationDelay: "240ms" }}>
          <CardHeader>
            <CardTitle className="font-[Outfit] text-base text-destructive">Danger zone</CardTitle>
            <CardDescription>Deleting a room removes its members, categories and expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" className="rounded-2xl" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-1 size-4" /> Delete room
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {room?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-full" onClick={() => void onDeleteRoom()}>
              Delete room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
