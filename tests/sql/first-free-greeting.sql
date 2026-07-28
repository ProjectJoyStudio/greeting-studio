\set ON_ERROR_STOP off
\set u '''ddb9c1b8-8531-4371-a5f0-ef1f10089632'''
BEGIN;
SELECT set_config('request.jwt.claims','{"sub":"ddb9c1b8-8531-4371-a5f0-ef1f10089632","role":"authenticated"}', true);
SELECT public.claim_first_free_greeting('card','t','en') IS NOT NULL AS claimed_card;
\echo '== release does NOT fire for a healthy queued order =='
SELECT public.release_first_free_greeting((SELECT first_free_greeting_order_id FROM public.user_entitlements WHERE user_id = :u)) AS released_when_queued;
SELECT first_free_greeting_used AS still_used FROM public.get_first_free_greeting_status();
\echo '== 7a) restore rejects a too-short reason =='
SAVEPOINT s3;
SELECT public.admin_restore_first_free_greeting(:u, 'x');
ROLLBACK TO s3;
\echo '== 7b) super-admin restore with reason =='
SELECT public.admin_restore_first_free_greeting(:u, 'support ticket 42') AS restored;
SELECT NOT first_free_greeting_used AS eligible_after_restore FROM public.get_first_free_greeting_status();
\echo '== 8) audit trail =='
SELECT action, count(*) FROM public.admin_audit_log WHERE action LIKE 'first_free%' GROUP BY 1 ORDER BY 1;
\echo '== 9) audit payload of the restore =='
SELECT request_metadata->>'reason' AS reason, request_metadata->>'admin_id' IS NOT NULL AS has_admin, request_metadata->>'user_id' IS NOT NULL AS has_user, request_metadata->>'order_id' IS NOT NULL AS has_order
FROM public.admin_audit_log WHERE action='first_free_greeting.restored' ORDER BY created_at DESC LIMIT 1;
ROLLBACK;
