
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('purge-deleted-user-cards')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-deleted-user-cards');

SELECT cron.schedule(
  'purge-deleted-user-cards',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--527db7eb-cbf0-46e8-a821-e3b4695af01e.lovable.app/api/public/purge-deleted-cards',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4b3JuaG10Y2N6dmx6Zmt5aWtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1Mzg2MDMsImV4cCI6MjEwMDExNDYwM30.zm_GedWEwHvzPwjykMzeM6dNqdo8vuHqS8bIpjGMVt4"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
