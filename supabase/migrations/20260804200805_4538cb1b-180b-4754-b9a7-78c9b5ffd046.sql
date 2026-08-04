select cron.schedule('voice-previews-maintain', '40 3 * * *', $$
  SELECT net.http_post(
    url := 'https://project--527db7eb-cbf0-46e8-a821-e3b4695af01e.lovable.app/api/public/voice-previews-maintain',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4b3JuaG10Y2N6dmx6Zmt5aWtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1Mzg2MDMsImV4cCI6MjEwMDExNDYwM30.zm_GedWEwHvzPwjykMzeM6dNqdo8vuHqS8bIpjGMVt4"}'::jsonb,
    body := '{}'::jsonb
  );
$$);