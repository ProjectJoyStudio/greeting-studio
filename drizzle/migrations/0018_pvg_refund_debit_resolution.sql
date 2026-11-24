DO $$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.refund_pvg_video_credits(uuid,text)'::regprocedure);
 def:=replace(def,'AND amount<0 AND metadata','AND credit_transactions.amount<0 AND metadata');
 EXECUTE def;
END $$;