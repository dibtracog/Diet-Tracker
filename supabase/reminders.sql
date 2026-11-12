-- Diet Tracker: the 5-minute timer that sends meal and water reminders.
--
-- Run this once in Supabase (SQL Editor -> New query -> paste -> Run), AFTER the
-- app is live on Vercel and the push settings are added there (SETUP.md, step 5).
--
-- Before running, replace the two placeholders below:
--   YOUR-APP.vercel.app   your app's address on Vercel
--   YOUR_CRON_SECRET      the CRON_SECRET value from .env.local / Vercel
--
-- It is safe to run again, e.g. after changing the address or the secret.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove the old timer, if there is one.
select cron.unschedule(jobid) from cron.job where jobname = 'diet-tracker-reminders';

select cron.schedule(
  'diet-tracker-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-APP.vercel.app/api/remind',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_CRON_SECRET'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- To check it is running (a few minutes later):
--   select status, start_time from cron.job_run_details order by start_time desc limit 5;
--   select status_code, content from net._http_response order by created desc limit 5;
-- A status_code of 200 with {"ok":true,...} means the app answered.
--
-- To stop reminders completely:
--   select cron.unschedule('diet-tracker-reminders');
