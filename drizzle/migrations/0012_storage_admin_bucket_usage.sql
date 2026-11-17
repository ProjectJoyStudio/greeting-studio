CREATE OR REPLACE FUNCTION public.storage_admin_bucket_usage()
RETURNS TABLE(bucket_id text, objects bigint, bytes bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT o.bucket_id::text, count(*)::bigint, COALESCE(sum((o.metadata->>'size')::bigint),0)::bigint
  FROM storage.objects o GROUP BY o.bucket_id ORDER BY 1
$$;
REVOKE ALL ON FUNCTION public.storage_admin_bucket_usage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.storage_admin_bucket_usage() TO service_role;