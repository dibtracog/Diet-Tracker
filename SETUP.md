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
3. Open **Environment Variables** and add the same two values as in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Click **Deploy**. After a minute you get an address like `diet-tracker-xyz.vercel.app`.

From then on, every `git push` to `main` redeploys the app automatically.
If you change an environment variable later, redeploy (Deployments → ⋯ → Redeploy)
for it to take effect.
