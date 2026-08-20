import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ChevronRight, Loader2, LogOut, Moon, Plus, Sun, UtensilsCrossed } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateRoom, useJoinRoom, useRooms } from "@/hooks/use-mess";

export const Route = createFileRoute("/_authenticated/rooms/")({
  head: () => ({
    meta: [
      { title: "Your mess rooms — Mess Manager Pro" },
      { name: "description", content: "All the mess rooms you belong to, with quick create and join by invite code." },
      { property: "og:title", content: "Your mess rooms — Mess Manager Pro" },
      { property: "og:description", content: "Create a mess room or join one with an invite code." },
    ],
  }),
  component: RoomsPage,
});

const currencies = ["AED", "INR", "USD", "SAR", "QAR", "OMR", "EUR", "GBP"];
const timezones = ["Asia/Dubai", "Asia/Kolkata", "Asia/Riyadh", "Asia/Qatar", "Asia/Muscat", "UTC", "Europe/London"];

const createSchema = z.object({
  name: z.string().trim().min(2, "Room name is too short").max(60),
  currency: z.string().min(3).max(3),
  timezone: z.string().min(2),
});

const joinSchema = z.object({ code: z.string().trim().min(4, "Enter the 6-character code").max(12) });

function RoomsPage() {
  const { data: rooms, isLoading } = useRooms();
  const { user, profile, signOut, isSuperAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const autoOpened = useRef(false);

  // Members added to a room by an admin land straight on that room's dashboard.
  useEffect(() => {
    if (isLoading || autoOpened.current || !rooms || rooms.length !== 1) return;
    if (typeof window !== "undefined" && sessionStorage.getItem("mm-auto-room") === "done") return;
    autoOpened.current = true;
    sessionStorage.setItem("mm-auto-room", "done");
    void navigate({ to: "/rooms/$roomId", params: { roomId: rooms[0].id }, replace: true });
  }, [isLoading, rooms, navigate]);

  const createForm = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", currency: "AED", timezone: "Asia/Dubai" },
  });
  const joinForm = useForm<z.infer<typeof joinSchema>>({
    resolver: zodResolver(joinSchema),
    defaultValues: { code: "" },
  });

  async function onCreate(values: z.infer<typeof createSchema>) {
    if (!user) return;
    try {
      const room = await createRoom.mutateAsync({ ...values, ownerId: user.id });
      setCreateOpen(false);
      createForm.reset();
      toast.success(`${room.name} created`);
      void navigate({ to: "/rooms/$roomId", params: { roomId: room.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the room");
    }
  }

  async function onJoin(values: z.infer<typeof joinSchema>) {
    try {
      const roomId = await joinRoom.mutateAsync(values.code);
      setJoinOpen(false);
      joinForm.reset();
      toast.success("Joined the room");
      void navigate({ to: "/rooms/$roomId", params: { roomId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid invite code");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="safe-top sticky top-0 z-20 border-b border-border/70 glass-panel">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
            <UtensilsCrossed className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-[Outfit] text-base font-semibold">Mess Manager Pro</p>
            <p className="truncate text-xs text-muted-foreground">
              {profile?.full_name ?? user?.email}
              {isSuperAdmin ? " · Super Admin" : ""}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => void signOut()} aria-label="Sign out">
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-[Outfit] text-xl font-semibold sm:text-2xl">Your rooms</h2>
            <p className="text-sm text-muted-foreground">Each room keeps its own wallet, members and expenses.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-full">
                  Join with code
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Join a room</DialogTitle>
                  <DialogDescription>Ask the room owner for the 6-character invite code.</DialogDescription>
                </DialogHeader>
                <Form {...joinForm}>
                  <form onSubmit={joinForm.handleSubmit(onJoin)} className="space-y-4">
                    <FormField
                      control={joinForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invite code</FormLabel>
                          <FormControl>
                            <Input placeholder="A1B2C3" className="uppercase tracking-[0.3em]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full rounded-2xl" disabled={joinRoom.isPending}>
                      {joinRoom.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Join room
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full">
                  <Plus className="mr-1 size-4" /> New room
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Create a mess room</DialogTitle>
                  <DialogDescription>You become the owner and get an invite code to share.</DialogDescription>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room name</FormLabel>
                          <FormControl>
                            <Input placeholder="Al Nahda Bachelors Mess" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={createForm.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {currencies.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timezone</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {timezones.map((tz) => (
                                  <SelectItem key={tz} value={tz}>
                                    {tz}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" className="w-full rounded-2xl" disabled={createRoom.isPending}>
                      {createRoom.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Create room
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-3xl" />
            ))}
          </div>
        ) : rooms && rooms.length > 0 ? (
          <div className="space-y-3">
            {rooms.map((room, i) => (
              <Link
                key={room.id}
                to="/rooms/$roomId"
                params={{ roomId: room.id }}
                className="block animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <Card className="rounded-3xl border-border transition-all duration-200 hover:elevation-2 hover:-translate-y-0.5">
                  <CardContent className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
                    <div className="inline-flex size-10 shrink-0 sm:size-12 items-center justify-center rounded-2xl bg-primary-container font-[Outfit] text-lg font-semibold text-primary-container-foreground">
                      {room.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-[Outfit] text-base font-semibold">{room.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {room.currency} · {room.timezone} · code {room.invite_code}
                      </p>
                    </div>
                    {!room.is_active ? <Badge variant="secondary">Disabled</Badge> : null}
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="rounded-3xl border-dashed">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <div className="inline-flex size-14 items-center justify-center rounded-3xl bg-primary-container text-primary-container-foreground">
                <UtensilsCrossed className="size-6" />
              </div>
              <p className="font-[Outfit] text-lg font-semibold">No rooms yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Create your first mess room, or join an existing one with an invite code.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
