
REVOKE EXECUTE ON FUNCTION public.claim_memory_book_music(uuid, uuid, integer, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_memory_book_music(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_memory_book_music(uuid, uuid, integer, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_memory_book_music(uuid, uuid, text) TO service_role;
