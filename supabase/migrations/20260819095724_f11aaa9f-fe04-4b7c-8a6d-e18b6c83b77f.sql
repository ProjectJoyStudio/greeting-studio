DROP TABLE IF EXISTS public._pvg_pack_check;

UPDATE public.pvg_projects
SET generations_used = 1, scene_packs = 1, credits_charged = credits_charged - 1
WHERE id = '47f29f4d-6f79-4770-b775-590c27cdc7e7';

UPDATE public.credit_wallets
SET balance = balance + 1, lifetime_spent = GREATEST(0, lifetime_spent - 1)
WHERE user_id = 'ddb9c1b8-8531-4371-a5f0-ef1f10089632';

DELETE FROM public.credit_transactions
WHERE user_id = 'ddb9c1b8-8531-4371-a5f0-ef1f10089632'
  AND description = 'Personal video greeting — starting scene attempt package'
  AND metadata->>'project_id' = '47f29f4d-6f79-4770-b775-590c27cdc7e7';