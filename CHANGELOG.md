# Changelog

## 2.1.1 — admin credentials configured

- Admin login set to `ajinas0496@gmail.com` / `alaksa`.
- The email now lives in exactly one place, `public.admin_email()`. The
  verification queries at the end of the script read from it, so changing the
  email requires editing a single line.
- `VITE_LOGIN_DOMAIN` default changed from `example.com` to `gmail.com`, so
  typing `ajinas0496` alone signs in even if the env var is not set in Vercel.
- The script now deletes the old `ajinasrm@example.com` placeholder account if a
  previous run created it.

**Verified:** `crypt('alaksa', encrypted_password)` matches the stored bcrypt
hash and a wrong password does not; `aud` and `role` are `authenticated`,
`email_confirmed_at` is set, the four token columns are `''`, and the
`auth.identities` row exists with provider `email`.

---

## 2.1.0 — admin payment approval

Razorpay is not integrated. The simulated gateway has been removed entirely and
replaced with an offline-payment + admin-approval workflow.

### Removed
- `RazorpayModal.tsx` (fake checkout, fake confetti "success")
- `/api/payments/create-order` and `/api/payments/verify` endpoints
- `canvas-confetti` and `@types/canvas-confetti` dependencies (now unused)
- `PaymentTransaction` type

### Added
- `public.payments` reworked into a request ledger: `plan_months`, `reference`,
  `member_note`, `admin_note`, `reviewed_by`, `reviewed_at`; status is now
  `PENDING | APPROVED | REJECTED`. Existing `SUCCESS`/`FAILED` rows are migrated.
- `public.approve_payment()` and `public.reject_payment()` — SECURITY DEFINER,
  transactional. Approval stamps the payment, extends or creates the membership,
  and writes a notification together, so an approval cannot half-apply.
- `PaymentRequestModal.tsx` — member picks plan, method and reference.
- `PaymentApprovalsPanel.tsx` — admin Approve / Reject with an optional note,
  filters by status, shows pending count and pending value.
- Admin dashboard: **Payment Approvals** tab with a pending badge, plus a
  "Payments to Approve" KPI on the overview.

### Enforcement — **verified**
- Member insert policy permits their own rows **only** with `status = 'PENDING'`.
  A member inserting `status='APPROVED'` is refused by RLS.
- No member UPDATE policy: flipping their own row to approved returns `UPDATE 0`.
- `approve_payment()` called by a Member → `Only an Admin can approve payments.`
- `approve_payment()` called by another gym's Admin → `That payment belongs to
  another gym.`; that admin cannot even SELECT the row.
- Approving an already-reviewed request → `This request was already approved.`
- Early renewal extends rather than replaces: a member valid to 2026-11-08 who
  renews 1 month moves to 2026-12-08, not 2026-09-08.

---

## 2.0.0 — repair release

Every item below was reproduced before being fixed. Items marked **verified**
were tested directly: SQL against a local PostgreSQL 16 instance with a mocked
Supabase `auth` schema, TypeScript via `tsc --noEmit`, and the API via a live
HTTP smoke test.

---

## Blocking bugs

### 1. RLS infinite recursion made every user query fail — **verified**

`supabase_schema.sql` (v1) contained:

```sql
CREATE POLICY "Users can view their own gym data" ON public.users
  FOR SELECT USING (gym_id = (SELECT gym_id FROM public.users WHERE user_id = auth.uid()));
```

A policy on `public.users` that reads `public.users` re-triggers itself.
Reproduced locally:

```
ERROR:  infinite recursion detected in policy for relation "users"   (SQLSTATE 42P17)
```

Every `.from('users').select()` returned HTTP 500. `LoginScreen` caught the
error and fell through to `INITIAL_USERS`, which is why sign-in appeared to
work while showing invented data.

**Fix:** four `SECURITY DEFINER` helpers — `auth_gym_id()`, `auth_role()`,
`is_gym_admin()`, `is_gym_staff()` — declared `LANGUAGE plpgsql` rather than
`sql`, because simple SQL functions can be inlined by the planner and recurse
anyway. All policies now call these instead of sub-querying the table.

### 2. The seeded admin could never authenticate — **verified**

Two independent causes.

*Invalid email.* `'ajinasrm'` is not an email address; GoTrue rejects it.

*NULL token columns.* The raw `INSERT INTO auth.users` left
`confirmation_token`, `email_change`, `email_change_token_new` and
`recovery_token` NULL. GoTrue reads these as non-nullable Go strings and fails
with HTTP 500 `Database error querying schema`. Documented by Supabase at
`/docs/guides/troubleshooting/scan-error-on-column-confirmation_token-converting-null-to-string-is-unsupported-during-auth-login-a0c686`.

*Missing identity.* No `auth.identities` row was created; email/password
sign-in requires one.

**Fix:** `public.create_gym_user()` sets all four columns to `''`, sets `aud`
and `role` to `authenticated`, creates the identity row (detecting the
`provider_id` / uuid-`id` column variants across GoTrue versions), and rejects
non-email input with a clear message. STEP 8 repairs rows already damaged by
the v1 script and deletes the invalid `ajinasrm` account.

### 3. Three tables were enabled for RLS with zero policies — **verified**

`tenants`, `workouts` and `messages` had `ENABLE ROW LEVEL SECURITY` and no
`CREATE POLICY`. In PostgreSQL that means deny-all: the gym name, all workout
plans and all messages were unreadable by every client.

**Fix:** explicit SELECT/INSERT/UPDATE/DELETE policies on all eight tables.

### 4. Three missing imports crashed the Admin dashboard — **verified**

```
AdminDashboard.tsx(615,20): error TS2304: Cannot find name 'MailIcon'.
AdminDashboard.tsx(794,28): error TS2304: Cannot find name 'Edit2'.
AdminDashboard.tsx(797,28): error TS2304: Cannot find name 'Trash2'.
```

Vite does not type-check, so the build passed and the app threw at runtime.

**Fix:** `MailIcon` → `Mail` (the imported name); `Edit2` and `Trash2` added to
the `lucide-react` import.

### 5. Vercel environment variables were ignored

`src/lib/supabase.ts` never read `import.meta.env`. It fell back to a
hardcoded project URL (`cuhqepmgtfedrxotojpg.supabase.co`) and anon key, so the
app connected there regardless of configuration.

**Fix:** rewritten to read `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
first, then localStorage. Hardcoded credentials removed. **If that project is
yours, rotate its keys.**

### 6. Tenant ID mismatch discarded all real data

`currentTenant` stayed as the mock tenant (`gym_id: 'gym-tenant-001'`) while
real rows carry a UUID. Every `row.gym_id === currentTenant.gym_id` filter
matched nothing, so dashboards rendered empty even when queries succeeded.

**Fix:** `fetchGymSnapshot()` loads the tenant from the database using the
signed-in profile's `gym_id`. The mock tenant dropdown in the Admin header —
which could re-break this by selecting a non-existent gym — was replaced with
a read-only label.

### 7. `assigned_trainer_id` did not exist in the database

`types.ts` declared it and `App.tsx` filtered on it, so the Trainer dashboard
always showed zero clients.

**Fix:** column added, indexed, with `ON DELETE SET NULL`.

### 8. New sign-ups created no profile row

`signUp` populated `auth.users` but nothing in `public.users`, so the profile
lookup returned nothing and login failed.

**Fix:** `on_auth_user_created` trigger. Hardened so that malformed metadata
cannot abort it — **verified** that `weight: "abc"`, `date_of_birth:
"32/13/9999"` and a non-UUID `gym_id` all still produce a valid profile, that
`role: "Hacker"` is downgraded to `Member`, and that a forged `gym_id` pointing
at another tenant falls back to the default gym.

---

## Silent no-ops

| Behaviour | v1 | v2 |
|---|---|---|
| Registration | `setTimeout` showing a fake success message | Real `signUp` with profile metadata |
| Forgot password | `setTimeout` claiming a link was sent | Real `resetPasswordForEmail` |
| Logout | Cleared React state only; refresh signed you back in | Calls `auth.signOut()` |
| Delete member | Spliced the local array; row reappeared on refresh | Deletes the row, then refetches |
| Refresh button | Spun the icon for 800 ms | Refetches everything |
| Check-in | Never written anywhere | Inserted into `public.attendance` |
| Payment success | Local state only | Writes membership + `public.payments` |
| AI workout plan | Local state only | Saved to `public.workouts` |
| "Check-ins Today" KPI | Filtered on `a.date`, a field that does not exist — always 0 | Filters on `check_in` |
| CSV export | Joined rows with a literal `\n`; produced one line | Real Blob, CRLF, quoted fields, UTF-8 BOM |
| Login failure | Swallowed the real error, fell back to mocks | Shows the actual reason |

---

## Security

- **Cron endpoint was public.** `/api/cron/expiry-alerts` accepted any GET.
  Now requires the `CRON_SECRET` bearer token Vercel sends. **Verified: 401
  without it.**
- **Gate endpoint granted access to anything.** `/api/attendance/checkin`
  returned `ACCESS GRANTED` for any token not containing the string
  `"EXPIRED"`, and never consulted the database. Now verifies the pass code
  and membership expiry, and writes the check-in. **Verified: 503 rather than
  a false grant when the service key is absent.**
- **Schema endpoint removed.** `/api/supabase/sql-schema` served the full
  database layout — including, in v1, the seeded admin credentials — to any
  caller. **Verified: now 404.**
- **Server bundle was published as a static asset.** The build wrote
  `dist/server.cjs` and `dist/server.cjs.map` into the directory Vercel serves
  publicly. Server bundling moved to `build/` and sourcemaps disabled.
  **Verified: `dist/` now contains only `index.html` and `assets/`.**
- **Payments.** v2.0 labelled the simulated gateway honestly; v2.1 removes it
  and replaces it with the admin-approval workflow above.
- Security headers added in `vercel.json`.
- Admins can no longer delete their own account (would orphan the gym).

---

## Correctness and quality

- **`@types/react` and `@types/react-dom` were missing.** `npm run lint`
  (`tsc --noEmit`) was therefore treating all React code as `any` — prop
  mismatches went undetected. Added; this immediately exposed bug #9 above.
- Foreign keys indexed (PostgreSQL does not index them automatically).
- `updated_at` columns with maintenance triggers.
- `public.payments` table added — payment history had nowhere to live.
- `attendance.status` column added; the UI read it but it did not exist.
- `users.email` UNIQUE constraint dropped — it made the signup trigger fail
  hard on any duplicate, and `auth.users` already guarantees uniqueness.
- `describeDbError()` maps Postgres error codes (`42501`, `42P17`, `42P01`,
  `23505`, `23503`, `22P02`) to actionable messages surfaced in a dismissible
  banner instead of a silent `console.error`.
- **Missing CSS.** `animate-in`, `fade-in`, `zoom-in`, `slide-in-from-top`,
  `no-scrollbar` and `custom-scrollbar` were used in 12 places but were neither
  core Tailwind v4 utilities nor provided by any installed plugin, so the modal
  animations did nothing. Defined directly in `index.css` — no new dependency —
  with a `prefers-reduced-motion` guard.
- Bundle split from one 1,065 kB chunk into cacheable vendor chunks; the Rollup
  size warning is gone.
- Session restore now shows a loading state instead of flashing the login screen.
- `index.html` title, description, theme colour and `noindex` added.
- `PORT` is read from the environment.

---

## Verification performed

```
tsc --noEmit                                    0 errors
npm run build                                   success, no chunk warnings
supabase_schema.sql on PostgreSQL 16            clean; idempotent over 3 runs
  all 6 built-in verification checks            OK
RLS: admin sees own gym only                    3 users
RLS: rival gym admin sees own gym only          1 user
RLS: member cannot insert a membership          policy violation (correct)
RLS: member cannot check in another user        policy violation (correct)
RLS: admin cannot delete self                   DELETE 0 (correct)
RLS: admin can delete a member                  DELETE 1
Trigger: junk metadata                          profile still created
Trigger: forged gym_id                          falls back to default gym
API: /api/health                                200, reports integration status
API: /api/cron/expiry-alerts without secret     401
API: /api/attendance/checkin without key        503
API: /api/supabase/sql-schema                   404

Payment approval (2.1.0)
  member raises PENDING request                 INSERT 0 1
  member inserts status=APPROVED                RLS violation (correct)
  member UPDATEs own row to APPROVED            UPDATE 0 (correct)
  member calls approve_payment()                refused: not an Admin
  other gym's admin calls approve_payment()     refused: belongs to another gym
  other gym's admin SELECTs the request         0 rows (correct)
  admin approves                                membership created, member notified
  admin approves the same request again         refused: already approved
  admin rejects with a reason                   status REJECTED + note stored
  early renewal 2026-11-08 + 1 month            2026-12-08 (days not burned)
```

**Not verified:** behaviour against a live Supabase project. The mock reproduces
the `auth.users` and `auth.identities` table shapes and `auth.uid()`, but not
GoTrue itself. Run the script and check the six-row verification table.
