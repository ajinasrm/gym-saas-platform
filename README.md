# GymSaaS Pro — Multi-Tenant Gym Management Platform

React 19 + Vite + Tailwind v4 front end, Supabase (Postgres + Auth + RLS) back end,
Express serverless API on Vercel.

Version 2.1.1 — see [`CHANGELOG.md`](./CHANGELOG.md) for everything that was fixed.

---

## Deploy in five steps

### 1. Run the database script

Supabase Dashboard → **SQL Editor** → **New query** → paste the whole of
[`supabase_schema.sql`](./supabase_schema.sql) → **Run**.

The admin account is configured near the bottom under `STEP 9`, in one place:

```sql
CREATE OR REPLACE FUNCTION public.admin_email()
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT 'ajinas0496@gmail.com'::text;
$$;

SELECT public.create_gym_user(public.admin_email(), 'alaksa', 'Admin', 'Super Admin');
```

The email **must** be a valid address — Supabase Auth rejects a bare username
such as `ajinasrm`. On the login screen you can type either the full address or
just `ajinas0496`; the app appends `VITE_LOGIN_DOMAIN`, which must match the
domain of this email.

If you change the email, change `VITE_LOGIN_DOMAIN` to match. The verification
queries at the end of the script read from `admin_email()`, so nothing else
needs updating.

The script ends with a verification table. Every row must read `OK`:

| check | result |
|---|---|
| tenants seeded | OK |
| admin auth user | OK |
| admin profile | OK |
| no NULL auth tokens | OK |
| identity row present | OK |
| approval functions | OK |
| policies on all tables | OK |

The script is idempotent — re-running it is safe and is the correct fix if
anything drifts.

### 2. Collect your Supabase keys

Supabase Dashboard → **Project Settings → API**:

| Value | Where it goes |
|---|---|
| Project URL | `VITE_SUPABASE_URL` **and** `SUPABASE_URL` |
| `anon` / publishable key | `VITE_SUPABASE_ANON_KEY` |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` — **server only** |

The `service_role` key bypasses row-level security. Never prefix it with
`VITE_`, never paste it into front-end code, never commit it.

### 3. Set environment variables in Vercel

Project → **Settings → Environment Variables**. Add for *Production*,
*Preview* and *Development*:

```
VITE_SUPABASE_URL          = https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY     = eyJ...
VITE_LOGIN_DOMAIN          = gmail.com            # must match the admin email domain
SUPABASE_URL               = https://<your-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY  = eyJ...               # server only
GEMINI_API_KEY             = ...                  # optional, for AI features
```

`CRON_SECRET` is provisioned by Vercel automatically once a cron job exists.

> `VITE_*` variables are baked in at build time. After changing any of them you
> must **redeploy** — restarting is not enough.

### 4. Deploy

Push to Git and import the repo in Vercel, or:

```bash
npm install
npx vercel --prod
```

Vercel auto-detects the Vite framework, runs `npm run build`, publishes `dist/`,
and turns `api/index.ts` into a serverless function.

### 5. Verify

Open `https://<your-app>.vercel.app/api/health`:

```json
{
  "status": "ok",
  "integrations": { "gemini": true, "supabaseAdmin": true, "cronSecret": true }
}
```

Any `false` means that variable did not reach the server. Then sign in with the
admin credentials from step 1. The header pill should read **Live**, not **Demo**.

---

## Local development

```bash
npm install
cp .env.example .env
# fill in .env
npm run dev          # http://localhost:3000
npm run typecheck    # must report zero errors before you deploy
npm run build
```

---

## How authentication works

1. `signInWithPassword` against Supabase Auth. A username without `@` becomes
   `username@VITE_LOGIN_DOMAIN`.
2. The app reads the matching row from `public.users` to get the role and `gym_id`.
3. `AndroidFrame` routes to the Admin, Trainer or Member dashboard by role.
4. Every subsequent query is scoped by RLS to the caller's `gym_id`.

New sign-ups are handled by the `on_auth_user_created` trigger, which creates
the `public.users` profile automatically. Self-registered accounts always get
role `Member` and the default gym — a client cannot escalate itself to `Admin`
by forging sign-up metadata (this is enforced in the trigger and covered by the
`users_insert_admin` policy).

---

## Adding staff and members

**From the app:** Admin dashboard → Members → *Add Member*. This calls
`signUp` on a throwaway client so the admin's own session is not replaced, then
inserts the profile and a membership.

**From SQL** (for a trainer or a second admin):

```sql
SELECT public.create_gym_user('coach@yourgym.com', 'StrongPass123', 'Trainer', 'Coach Marcus');
```

**Change the admin password later:**

```sql
SELECT public.create_gym_user(public.admin_email(), 'YourNewPassword', 'Admin', 'Super Admin');
```

`create_gym_user` resets the password if the account already exists. Members
can also use *Forgot Password* on the login screen, which needs SMTP configured
in Supabase → Authentication → Emails.

**Assign a trainer to a member:**

```sql
UPDATE public.users
   SET assigned_trainer_id = (SELECT user_id FROM public.users WHERE email = 'coach@yourgym.com')
 WHERE email = 'member@yourgym.com';
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Header says **Demo**, data looks fake | `VITE_SUPABASE_*` missing at build time | Add them in Vercel, then **redeploy** |
| `Database error querying schema` on login | NULL token columns in `auth.users` | Re-run `supabase_schema.sql` (STEP 8 repairs them) |
| `infinite recursion detected in policy` | Old v1 policies still installed | Re-run `supabase_schema.sql`; it drops and recreates every policy |
| Login succeeds, dashboards empty | Profile row missing or wrong `gym_id` | Re-run the script — STEP 6 backfills missing profiles |
| `Incorrect username or password` | Email format, or wrong `VITE_LOGIN_DOMAIN` | Domain must match the admin email you seeded |
| `permission denied` / `42501` on save | RLS policy blocking the write | Confirm your role is `Admin` in `public.users` |
| AI panels show generic text | `GEMINI_API_KEY` not set | Endpoints fall back to canned content by design |
| Member sees "Only an Admin can approve payments" | Their role is not `Admin` | `UPDATE public.users SET role='Admin' WHERE email='...'` |
| Approve button does nothing | Old schema without `approve_payment()` | Re-run `supabase_schema.sql` |
| Cron returns 401 | Missing `CRON_SECRET` bearer token | Expected — only Vercel's scheduler may call it |

Useful queries:

```sql
-- who am I and what gym am I in?
SELECT user_id, email, role, gym_id FROM public.users ORDER BY created_at;

-- are the policies installed?
SELECT tablename, policyname, cmd FROM pg_policies
 WHERE schemaname='public' ORDER BY tablename;
```

---

## Payments: how approval works

**There is no online payment gateway, by design.** Money is collected offline
and an Admin confirms it. Razorpay is not integrated and nothing in the app
pretends it is.

The flow:

1. The member pays at the front desk (cash, UPI, card or bank transfer).
2. Member dashboard → *Request Renewal*. They pick the plan, the method they
   used, and enter a reference (UPI ref / UTR / receipt no.) if it was not cash.
3. A row is written to `public.payments` with status `PENDING`. It appears on
   the Admin dashboard under **Payment Approvals**, with a badge on the tab and
   a KPI card on the overview.
4. The Admin clicks **Approve & extend membership** (or **Reject**, with a
   reason). Approval calls `public.approve_payment()`, which in one transaction
   stamps the payment, extends the membership, and writes a notification for
   the member.

Renewing early **adds to** the remaining days rather than replacing them:
the new end date is `max(today, current end_date) + plan_months`.

Enforcement, so this cannot be bypassed:

- The RLS insert policy on `public.payments` only lets a member create rows for
  themselves **with status `PENDING`**. Inserting an already-`APPROVED` row is
  rejected by the database.
- There is no member-facing UPDATE policy, so a member cannot flip their own
  pending row to approved.
- `approve_payment()` and `reject_payment()` check `is_gym_admin()` themselves
  and refuse requests belonging to another gym.
- Approving twice is refused.

To add a real gateway later, keep this table as the ledger and set status to
`APPROVED` from a server-side webhook after verifying the provider's signature.

**Recording a walk-in payment as the admin:** the Admin can raise the request
on the member's behalf from the Members tab (renew), then approve it — staff
inserts are permitted at any status.

---

## What is real and what is not

**Real, backed by the database:** authentication, registration, password reset,
role routing, the member roster, memberships and renewals, the payment request
and approval workflow, QR pass verification and check-in logging, member
deletion, CSV export, workout plan persistence, tenant isolation, and the
nightly expiry job.

**Simulated — do not treat as production:**

- **Camera QR scanning.** There is no live camera decode; pass codes are typed
  or pasted. Verification of the code itself is real. Add a library such as
  `html5-qrcode` for optical scanning.
- **Classes, supplement store, nutrition and body-composition charts.** These
  render from `src/lib/mockData.ts`. No tables exist for them yet.
- **Email delivery.** The expiry job writes rows to `public.notifications`. It
  does not send email; wire up Supabase Auth SMTP or a provider such as Resend.

---

## Project layout

```
supabase_schema.sql        Database schema, RLS policies, triggers, seed
api/index.ts               Vercel serverless entry point
app.ts                     Express routes (AI, gate, cron — no payment routes)
server.ts                  Local dev server / standalone Node host
src/lib/supabase.ts        Client factory, env resolution, username mapping
src/lib/db.ts              All database reads and writes
src/lib/types.ts           Shared TypeScript types
src/lib/mockData.ts        Demo data used only when no database is connected
src/App.tsx                Session handling, data loading, role routing
src/components/            Modals, approvals panel, device frame
src/components/screens/    Admin, Trainer and Member dashboards
```

---

## Security notes

- The anon key is safe in the browser **only because** RLS is enforced. If you
  disable RLS on any table, that table becomes world-readable.
- `SUPABASE_SERVICE_ROLE_KEY` must never appear in a `VITE_` variable.
- The v1 endpoint that served the full SQL schema over HTTP has been removed.
- The v1 hardcoded Supabase project URL and anon key have been removed from
  `src/lib/supabase.ts`. If that project is yours and was ever public, rotate
  its keys in Supabase → Settings → API.
- The cron endpoint requires the `CRON_SECRET` bearer token.
