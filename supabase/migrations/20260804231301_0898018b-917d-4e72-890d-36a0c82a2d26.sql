REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.room_role_of(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_room(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_room_by_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_room() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated;