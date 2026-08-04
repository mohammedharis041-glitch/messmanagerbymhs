import { createFileRoute, Outlet } from "@tanstack/react-router";

import { RoomShell } from "@/components/room-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useMembers, useRoom } from "@/hooks/use-mess";

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  component: RoomLayout,
});

function RoomLayout() {
  const { roomId } = Route.useParams();
  const { data: room, isLoading } = useRoom(roomId);
  const { data: members } = useMembers(roomId);

  if (isLoading) {
    return (
      <div className="min-h-screen space-y-4 bg-background p-5">
        <Skeleton className="h-14 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div>
          <h1 className="font-[Outfit] text-xl font-semibold">Room unavailable</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            It may have been deleted, or you no longer have access to it.
          </p>
        </div>
      </div>
    );
  }

  const memberCount = members?.length ?? 0;

  return (
    <RoomShell
      roomId={roomId}
      title={room.name}
      subtitle={`${memberCount} member${memberCount === 1 ? "" : "s"} · ${room.currency} · code ${room.invite_code}`}
    >
      <Outlet />
    </RoomShell>
  );
}
