import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ExpenseGroup = Tables<"expense_groups">;
export type ExpenseGroupMember = Tables<"expense_group_members">;

export const groupKeys = {
  list: (roomId: string) => ["rooms", roomId, "groups"] as const,
  members: (roomId: string) => ["rooms", roomId, "group-members"] as const,
  participants: (roomId: string) => ["rooms", roomId, "participants"] as const,
};

/** All expense groups of a room. */
export function useGroups(roomId: string) {
  return useQuery({
    queryKey: groupKeys.list(roomId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_groups")
        .select("*")
        .eq("room_id", roomId)
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: Boolean(roomId),
  });
}

/** Membership rows for every group in the room. */
export function useGroupMembers(roomId: string) {
  return useQuery({
    queryKey: groupKeys.members(roomId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_group_members")
        .select("id, group_id, user_id, joined_at, left_at, expense_groups!inner(room_id)")
        .eq("expense_groups.room_id", roomId);
      if (error) throw error;
      return (data ?? []).map(({ expense_groups: _drop, ...row }) => row);
    },
    enabled: Boolean(roomId),
  });
}

/** Map of expense id -> user ids the expense is shared between. */
export function useExpenseParticipants(roomId: string) {
  return useQuery({
    queryKey: groupKeys.participants(roomId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_participants")
        .select("expense_id, user_id, expenses!inner(room_id)")
        .eq("expenses.room_id", roomId);
      if (error) throw error;
      const map = new Map<string, string[]>();
      for (const row of data ?? []) {
        const list = map.get(row.expense_id) ?? [];
        list.push(row.user_id);
        map.set(row.expense_id, list);
      }
      return map;
    },
    enabled: Boolean(roomId),
  });
}

export type GroupInput = {
  name: string;
  icon: string;
  color: string;
  description: string | null;
  is_active?: boolean;
};

export function useSaveGroup(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: GroupInput }) => {
      if (id) {
        const { error } = await supabase.from("expense_groups").update(values).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("expense_groups")
        .insert({ ...values, room_id: roomId })
        .select()
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: groupKeys.list(roomId) });
      void qc.invalidateQueries({ queryKey: groupKeys.members(roomId) });
    },
  });
}

export function useDeleteGroup(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expense_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: groupKeys.list(roomId) });
      void qc.invalidateQueries({ queryKey: groupKeys.members(roomId) });
    },
  });
}

/** Replace the member list of a group. */
export function useSetGroupMembers(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userIds }: { groupId: string; userIds: string[] }) => {
      const { data: current, error } = await supabase
        .from("expense_group_members")
        .select("id, user_id")
        .eq("group_id", groupId);
      if (error) throw error;
      const existing = new Set((current ?? []).map((r) => r.user_id));
      const wanted = new Set(userIds);

      const toRemove = (current ?? []).filter((r) => !wanted.has(r.user_id)).map((r) => r.id);
      if (toRemove.length) {
        const { error: delError } = await supabase.from("expense_group_members").delete().in("id", toRemove);
        if (delError) throw delError;
      }
      const toAdd = userIds.filter((id) => !existing.has(id));
      if (toAdd.length) {
        const { error: insError } = await supabase
          .from("expense_group_members")
          .insert(toAdd.map((user_id) => ({ group_id: groupId, user_id })));
        if (insError) throw insError;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.members(roomId) }),
  });
}
