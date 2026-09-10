CREATE OR REPLACE FUNCTION public.memory_book_improve_allowance(_package_code text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE _package_code
    WHEN 'mb_15' THEN 7
    WHEN 'mb_10' THEN 5
    ELSE 2
  END;
$$;