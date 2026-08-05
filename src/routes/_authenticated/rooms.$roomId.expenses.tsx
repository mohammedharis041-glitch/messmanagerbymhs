import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCategories,
  useDeleteExpense,
  useExpenses,
  useMembers,
  useRoom,
  useRoomRole,
  useSaveExpense,
  type Expense,
} from "@/hooks/use-mess";
import { formatCurrency, formatDate, periodRange, toISODate, type PeriodKey } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/rooms/$roomId/expenses")({
  component: ExpensesPage,
});

const expenseSchema = z.object({
  title: z.string().trim().min(2, "Describe the expense").max(80),
  amount: z.coerce.number().positive("Enter an amount above zero").max(1_000_000),
  spent_at: z.string().min(8, "Pick a date"),
  category_id: z.string().min(1, "Pick a category"),
  paid_by: z.string().min(1, "Who paid?"),
  notes: z.string().trim().max(500).optional(),
});

type ExpenseForm = z.input<typeof expenseSchema>;

function ExpensesPage() {
  const { roomId } = Route.useParams();
  const { user, isSuperAdmin } = useAuth();
  const { data: room } = useRoom(roomId);
  const { data: expenses, isLoading } = useExpenses(roomId);
  const { data: categories } = useCategories(roomId);
  const { data: members } = useMembers(roomId);
  const { canManage } = useRoomRole(roomId, user?.id, isSuperAdmin);
  const saveExpense = useSaveExpense(roomId);
  const deleteExpense = useDeleteExpense(roomId);

  const canEdit = (e: Expense) => canManage || e.created_by === user?.id;


  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);

  const currency = room?.currency ?? "AED";
  const memberName = useMemo(
    () => new Map((members ?? []).map((m) => [m.user_id, m.name])),
    [members],
  );
  const categoryById = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );

  const form = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: "",
      amount: "" as unknown as number,
      spent_at: toISODate(new Date()),
      category_id: "",
      paid_by: user?.id ?? "",
      notes: "",
    },
  });

  const visible = useMemo(() => {
    const range = periodRange(period);
    const term = search.trim().toLowerCase();
    return (expenses ?? []).filter((e) => {
      if (range && (e.spent_at < range.start || e.spent_at > range.end)) return false;
      if (category !== "all" && e.category_id !== category) return false;
      if (!term) return true;
      return (
        e.title.toLowerCase().includes(term) ||
        (e.notes ?? "").toLowerCase().includes(term) ||
        (memberName.get(e.paid_by) ?? "").toLowerCase().includes(term)
      );
    });
  }, [expenses, period, category, search, memberName]);

  const total = visible.reduce((sum, e) => sum + Number(e.amount), 0);

  function openCreate() {
    setEditing(null);
    form.reset({
      title: "",
      amount: "" as unknown as number,
      spent_at: toISODate(new Date()),
      category_id: categories?.[0]?.id ?? "",
      paid_by: user?.id ?? "",
      notes: "",
    });
    setOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    form.reset({
      title: expense.title,
      amount: Number(expense.amount),
      spent_at: expense.spent_at,
      category_id: expense.category_id ?? "",
      paid_by: expense.paid_by,
      notes: expense.notes ?? "",
    });
    setOpen(true);
  }

  async function onSubmit(raw: ExpenseForm) {
    if (!user) return;
    const values = expenseSchema.parse(raw);
    // Plain members can only log what they paid for themselves.
    if (!canManage) values.paid_by = user.id;
    try {
      await saveExpense.mutateAsync({
        ...(editing ? { id: editing.id } : {}),
        userId: user.id,

        values: {
          title: values.title,
          amount: values.amount,
          spent_at: values.spent_at,
          category_id: values.category_id || null,
          paid_by: values.paid_by,
          notes: values.notes?.trim() ? values.notes.trim() : null,
        },
      });
      setOpen(false);
      toast.success(editing ? "Expense updated" : "Expense added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the expense");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteExpense.mutateAsync(pendingDelete.id);
      toast.success("Expense removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the expense");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-2.5 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses"
            className="h-9 rounded-2xl pl-9 text-sm"
            maxLength={80}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="h-9 rounded-2xl text-xs sm:w-32 sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">7 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="year">This year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 rounded-2xl text-xs sm:w-40 sm:text-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(categories ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="rounded-2xl sm:rounded-3xl">
        <CardContent className="flex items-center justify-between gap-3 p-3 sm:p-4">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">{visible.length} entries</p>
            <p className="truncate font-[Outfit] text-lg font-semibold tabular-nums sm:text-xl">
              {formatCurrency(total, currency)}
            </p>
          </div>
          <Button onClick={openCreate} size="sm" className="shrink-0 rounded-full">
            <Plus className="mr-1 size-4" /> Add
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-1.5 pb-4 sm:space-y-2">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading expenses…</p>
        ) : visible.length ? (
          visible.map((e, i) => {
            const cat = e.category_id ? categoryById.get(e.category_id) : undefined;
            const mine = canEdit(e);
            return (
              <Card
                key={e.id}
                className="animate-slide-up rounded-2xl sm:rounded-3xl"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <CardContent className="flex items-center gap-2 p-2.5 sm:gap-3 sm:p-4">
                  <span
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold text-white sm:size-10 sm:rounded-2xl sm:text-sm"
                    style={{ backgroundColor: cat?.color ?? "#64748b" }}
                    aria-hidden="true"
                  >
                    {(cat?.name ?? "?").slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium sm:text-sm">{e.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {formatDate(e.spent_at)} · {memberName.get(e.paid_by) ?? "Member"}
                      {cat ? ` · ${cat.name}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums sm:text-sm">
                    {formatCurrency(Number(e.amount), currency)}
                  </span>
                  {mine ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 rounded-full"
                        onClick={() => openEdit(e)}
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 rounded-full text-destructive"
                        onClick={() => setPendingDelete(e)}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="rounded-2xl border-dashed sm:rounded-3xl">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No expenses match these filters.
            </CardContent>
          </Card>
        )}
      </div>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit expense" : "Add expense"}</DialogTitle>
            <DialogDescription>Amounts are recorded in {currency}.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What was it?</FormLabel>
                    <FormControl>
                      <Input placeholder="Weekly vegetables" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="spent_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(categories ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paid_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid by</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={canManage ? field.value : (user?.id ?? "")}
                      disabled={!canManage}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(members ?? [])
                          .filter((m) => canManage || m.user_id === user?.id)
                          .map((m) => (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              {m.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {!canManage ? (
                      <p className="text-xs text-muted-foreground">
                        Only owners and admins can log an expense paid by someone else.
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={3} maxLength={500} placeholder="Shop, split details, anything useful" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full rounded-2xl" disabled={saveExpense.isPending}>
                {saveExpense.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {editing ? "Save changes" : "Add expense"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? `“${pendingDelete.title}” will no longer count towards the wallet.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-full" onClick={() => void confirmDelete()}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        onClick={openCreate}
        size="icon"
        className="fixed bottom-20 right-4 z-40 size-12 rounded-2xl elevation-2 md:hidden"
        aria-label="Add expense"
      >
        <Plus className="size-6" />
      </Button>

      <Badge className="sr-only">{visible.length}</Badge>
    </div>
  );
}
