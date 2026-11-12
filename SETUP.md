# Setup: cloud sync (Supabase) and hosting (Vercel)

The app works without any of this (local-only mode). These steps give you a
login, data shared between phone and laptop, and a proper `https://` address.

---

## 1. Supabase (database + login) — free tier is plenty

1. Go to **supabase.com**, sign up, and click **New project**.
   - Name: `diet-tracker`
   - Database password: generate one and keep it somewhere safe (the app never needs it).
   - Region: the one closest to you (e.g. *South Asia (Mumbai)*).
2. When the project is ready, open **SQL Editor → New query**, paste the whole of
   [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. You should see "Success".
   This creates the data table and the private `photos` storage bucket. The file is safe to run
   again, and **must be run again after updating the app** if it has changed (newer features need it).
3. **Authentication → Sign In / Providers**:
   - Make sure **Email** is enabled.
   - Turn **off** "Allow new users to sign up", so nobody else can create an account.
4. **Authentication → Users → Add user → Create new user**:
   - Your email and a password you'll use to sign in to the app.
   - Tick **Auto Confirm User**.
5. Get the two values the app needs (the **Connect** button at the top of the
   dashboard shows both, or **Project Settings → API Keys / Data API**):
   - **Project URL**, like `https://abcdefgh.supabase.co`
   - **Publishable key**, starting with `sb_publishable_` (older projects call it the *anon* key).
     Never use the *secret* / *service_role* key in this app.

## 2. Local `.env.local`

Create a file called `.env.local` in the project folder (it is git-ignored):

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Restart the dev server. The app now asks you to sign in. Anything you logged
in local-only mode on that device is uploaded to your account on first sign-in.

## 3. GitHub

The repo's remote is already set (`origin`). Push with:

```
git push -u origin main
```

A **private** repository is recommended (GitHub → repo → Settings → General → Danger Zone → Change visibility).

## 4. Vercel (hosting)

1. Go to **vercel.com** and sign up with your GitHub account.
2. **Add New… → Project**, pick the `Diet-Tracker` repository, click **Import**.
   Vercel detects Next.js automatically; leave the build settings as they are.
3. Open **Environment Variables** and add the same values as in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - for reminders (step 5): `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, `SUPABASE_SECRET_KEY`
4. Click **Deploy**. After a minute you get an address like `diet-tracker-xyz.vercel.app`.

From then on, every `git push` to `main` redeploys the app automatically.
If you change an environment variable later, redeploy (Deployments → ⋯ → Redeploy)
for it to take effect.

## 5. Reminders (push notifications)

Reminders are sent by the app on Vercel, on a timer kept by your Supabase database.
Nothing here uses AI: they go out at the fixed times you choose in Settings.

1. **Push keys.** `.env.local` needs these four values (they may already be there):
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`: make a pair with
     `npx web-push generate-vapid-keys`.
   - `CRON_SECRET`: any long random text (a password for the timer).
   - `SUPABASE_SECRET_KEY`: Supabase → **Project Settings → API Keys → Secret key**
     (starts with `sb_secret_`; older projects call it *service_role*). This one can
     read all data, so it only ever goes in `.env.local` and Vercel, never in the code.
2. Add the same four to **Vercel → Project → Settings → Environment Variables**, then redeploy.
3. Run [`supabase/schema.sql`](supabase/schema.sql) again if you haven't since updating.
4. Open [`supabase/reminders.sql`](supabase/reminders.sql), replace `YOUR-APP.vercel.app`
   and `YOUR_CRON_SECRET`, and run it in the Supabase SQL Editor. This starts the 5-minute timer.
5. On your phone, open the app from its Vercel address in Chrome and **install it**
   (⋮ → *Add to Home screen*). Then in the app: **Settings → Reminders → Turn on
   notifications**, switch on meal and/or water reminders, pick times, and save.
   **Send a test** checks the whole chain; a notification should arrive within seconds.

Each device that should get reminders needs "Turn on notifications" once.
Reminders arrive within 5 minutes of the chosen time, and water reminders stop for
the day once the water goal is reached.

## 6. Offline use and photos

- Once installed and opened online, the app opens without internet. Entries made
  offline are sent when the connection returns (Settings → Sync shows what's waiting).
- Meal photos are shrunk on the phone and saved to your account's private `photos`
  bucket (about 0.1–0.3 MB each; the free tier's 1 GB holds several thousand).
  The full-quality original stays in the phone's gallery.
- To try the published build on your laptop with throwaway data and no login:
  `node scripts/local-mode.mjs build`, then `node scripts/local-mode.mjs start -p 3100`.
