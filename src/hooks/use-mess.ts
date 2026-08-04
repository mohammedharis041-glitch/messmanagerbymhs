import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Room = Tables<"rooms">;
export type RoomMember = Tables<"room_members">;
export type Category = Tables<"categories">;
export type Expense = Tables<"expenses">;
export type RoomRole = "owner" | "admin" | "member";

export type MemberWithProfile = RoomMember & {
  profile: { id: string; full_name: string | null; email: string | null; avatar_url: string | null } | null;
  name: string;
};

export function generateInviteCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export const roomKeys = {
  all: ["rooms"] as const,
  detail: (id: string) => ["rooms", id] as const,
  members: (id: string) => ["rooms", id, "members"] as const,
  categories: (id: string) => ["rooms", id, "categories"] as const,
  expenses: (id: string) => ["rooms", id, "expenses"] as const,
};

export function useRooms() {
  return useQuery({
    queryKey: roomKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useRoom(roomId: string) {
  return useQuery({
    queryKey: roomKeys.detail(roomId),
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(roomId),
  });
}

export function useMembers(roomId: string) {
  return useQuery({
    queryKey: roomKeys.members(roomId),
    queryFn: async (): Promise<MemberWithProfile[]> => {
      const { data: members, error } = await supabase
        .from("room_members")
        .select("*")
        .eq("room_id", roomId)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      const ids = (members ?? []).map((m) => m.user_id);
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", ids)
        : { data: [] as Array<{ id: string; full_name: string | null; email: string | null; avatar_url: string | null }> };
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (members ?? []).map((m) => {
        const profile = byId.get(m.user_id) ?? null;
        return {
          ...m,
          profile,
          name: m.display_name || profile?.full_name || profile?.email || "Member",
        };
      });
    },
    enabled: Boolean(roomId),
  });
}

export function useCategories(roomId: string) {
  return useQuery({
    queryKey: roomKeys.categories(roomId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("room_id", roomId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: Boolean(roomId),
  });
}

export function useExpenses(roomId: string) {
  return useQuery({
    queryKey: roomKeys.expenses(roomId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("room_id", roomId)
        .is("deleted_at", null)
        .order("spent_at", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(roomId),
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; currency: string; timezone: string; ownerId: string }) => {
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data, error } = await supabase
          .from("rooms")
          .insert({
            name: input.name,
            currency: input.currency,
            timezone: input.timezone,
            owner_id: input.ownerId,
            invite_code: generateInviteCode(),
          })
          .select()
          .single();
        if (!error) return data;
        lastError = error;
        if (!`${error.message}`.includes("invite_code")) break;
      }
      throw lastError;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.all }),
  });
}

export function useJoinRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc("join_room_by_code", { _code: code });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.all }),
  });
}

export function useUpdateRoom(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Room>) => {
      const { data, error } = await supabase.from("rooms").update(patch).eq("id", roomId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: roomKeys.detail(roomId) });
      void qc.invalidateQueries({ queryKey: roomKeys.all });
    },
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase.from("rooms").delete().eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.all }),
  });
}

export type ExpenseInput = {
  title: string;
  amount: number;
  spent_at: string;
  category_id: string | null;
  paid_by: string;
  notes: string | null;
};

export function useSaveExpense(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values, userId }: { id?: string; values: ExpenseInput; userId: string }) => {
      if (id) {
        const { data, error } = await supabase.from("expenses").update(values).eq("id", id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...values, room_id: roomId, created_by: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.expenses(roomId) }),
  });
}

export function useDeleteExpense(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expenses")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.expenses(roomId) }),
  });
}

export function useUpdateMember(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<RoomMember> }) => {
      const { error } = await supabase.from("room_members").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.members(roomId) }),
  });
}

export function useRemoveMember(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("room_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.members(roomId) }),
  });
}

export function useCreateCategory(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("categories")
        .insert({ room_id: roomId, name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.categories(roomId) }),
  });
}
