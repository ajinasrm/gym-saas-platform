-- ============================================================================
--  GYM SaaS PLATFORM — SUPABASE SCHEMA (v2, corrected)
--  Run this ENTIRE file in: Supabase Dashboard -> SQL Editor -> New query -> Run
--  Safe to re-run (idempotent). It drops and recreates policies/functions only.
-- ============================================================================
--
--  BEFORE YOU RUN — edit the two values in STEP 9 (admin email + password).
--  The email MUST be a syntactically valid email address. Supabase Auth
--  (GoTrue) rejects bare usernames such as 'ajinasrm'.
--  You can still TYPE "ajinasrm" on the login screen — the app maps a
--  username to <username>@VITE_LOGIN_DOMAIN before calling Supabase.
--
-- ============================================================================

-- ---------------------------------------------------------------------------
-- STEP 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- STEP 1. Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenants (
    gym_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL,
    logo_url          TEXT,
    address           TEXT,
    subscription_tier TEXT NOT NULL DEFAULT 'Starter'
                      CHECK (subscription_tier IN ('Free','Starter','Pro','Enterprise')),
    currency          TEXT NOT NULL DEFAULT 'INR',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
    user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    gym_id              UUID REFERENCES public.tenants(gym_id) ON DELETE CASCADE,
    member_internal_id  SERIAL,
    role                TEXT NOT NULL DEFAULT 'Member'
                        CHECK (role IN ('Admin','Trainer','Member')),
    full_name           TEXT NOT NULL DEFAULT 'New Member',
    email               TEXT NOT NULL,
    phone               TEXT,
    date_of_birth       DATE,
    address             TEXT,
    weight              NUMERIC(5,2),
    height              NUMERIC(5,2),
    avatar_url          TEXT,
    qr_pass_code        TEXT UNIQUE,
    assigned_trainer_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- assigned_trainer_id is referenced by the Trainer dashboard but was missing
-- from v1 of this schema. Added here for existing installs:
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS assigned_trainer_id UUID
    REFERENCES public.users(user_id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- v1 declared email UNIQUE. That makes the signup trigger fail hard on any
-- duplicate. Uniqueness is already guaranteed by auth.users, so drop it.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;

CREATE TABLE IF NOT EXISTS public.memberships (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    gym_id         UUID NOT NULL REFERENCES public.tenants(gym_id) ON DELETE CASCADE,
    plan_name      TEXT NOT NULL,
    start_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date       DATE NOT NULL,
    amount_paid    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'Paid'
                   CHECK (payment_status IN ('Paid','Pending','Failed')),
    status         TEXT NOT NULL DEFAULT 'Active'
                   CHECK (status IN ('Active','Expired','Pending')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.attendance (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    gym_id        UUID NOT NULL REFERENCES public.tenants(gym_id) ON DELETE CASCADE,
    check_in      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gate_location TEXT NOT NULL DEFAULT 'Main Entry',
    status        TEXT NOT NULL DEFAULT 'GRANTED' CHECK (status IN ('GRANTED','DENIED')),
    verified_by   UUID REFERENCES public.users(user_id) ON DELETE SET NULL
);
-- 'status' is read by the UI but was missing from v1:
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'GRANTED';
DO $$ BEGIN
  ALTER TABLE public.attendance ADD CONSTRAINT attendance_status_check
    CHECK (status IN ('GRANTED','DENIED'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.workouts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    gym_id      UUID NOT NULL REFERENCES public.tenants(gym_id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    plan_data   JSONB NOT NULL,
    assigned_by TEXT NOT NULL DEFAULT 'AI Trainer',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    gym_id     UUID NOT NULL REFERENCES public.tenants(gym_id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id   UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    gym_id      UUID NOT NULL REFERENCES public.tenants(gym_id) ON DELETE CASCADE,
    subject     TEXT,
    content     TEXT NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment requests awaiting admin approval.
-- There is no online payment gateway. A member (or the front desk) raises a
-- request, money changes hands offline (cash / UPI / bank transfer), and an
-- Admin approves it. Approval is what extends the membership.
CREATE TABLE IF NOT EXISTS public.payments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    gym_id         UUID NOT NULL REFERENCES public.tenants(gym_id) ON DELETE CASCADE,
    plan_name      TEXT NOT NULL,
    plan_months    INTEGER NOT NULL DEFAULT 1 CHECK (plan_months BETWEEN 1 AND 36),
    amount         NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    currency       TEXT NOT NULL DEFAULT 'INR',
    status         TEXT NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    method         TEXT NOT NULL DEFAULT 'Cash'
                   CHECK (method IN ('Cash','UPI','Card','Bank Transfer','Cheque','Other')),
    reference      TEXT,                 -- UPI ref / receipt no. supplied by the member
    member_note    TEXT,
    admin_note     TEXT,
    reviewed_by    UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    reviewed_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bring an existing v2.0 payments table up to the approval model.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS plan_months INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reference   TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS member_note TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS admin_note  TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.payments DROP COLUMN IF EXISTS order_id;
ALTER TABLE public.payments DROP COLUMN IF EXISTS transaction_id;

DO $$ BEGIN
  UPDATE public.payments SET status = 'APPROVED' WHERE status = 'SUCCESS';
  UPDATE public.payments SET status = 'REJECTED' WHERE status = 'FAILED';
  ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
  ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
    CHECK (status IN ('PENDING','APPROVED','REJECTED'));
  ALTER TABLE public.payments ALTER COLUMN status SET DEFAULT 'PENDING';
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- STEP 2. Indexes (foreign keys are NOT auto-indexed in Postgres)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_gym            ON public.users(gym_id);
CREATE INDEX IF NOT EXISTS idx_users_trainer        ON public.users(assigned_trainer_id);
CREATE INDEX IF NOT EXISTS idx_memberships_gym      ON public.memberships(gym_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user     ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_end      ON public.memberships(end_date);
CREATE INDEX IF NOT EXISTS idx_attendance_gym       ON public.attendance(gym_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user      ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_checkin   ON public.attendance(check_in DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_user        ON public.workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver    ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender      ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_payments_user        ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_gym_status  ON public.payments(gym_id, status);

-- ---------------------------------------------------------------------------
-- STEP 3. SECURITY DEFINER helpers
--
-- WHY THIS EXISTS — this is bug #1 in the original script.
-- The v1 policy was:
--     CREATE POLICY ... ON public.users
--       FOR SELECT USING (gym_id = (SELECT gym_id FROM public.users WHERE ...))
-- A policy on public.users that reads public.users re-triggers itself.
-- Postgres aborts with 42P17 "infinite recursion detected in policy for
-- relation users", so EVERY read of the users table returned HTTP 500 —
-- which is why login always fell through to the mock data.
-- Ref: https://supabase.com/docs/guides/database/postgres/row-level-security
--
-- SECURITY DEFINER runs as the function owner and therefore bypasses RLS on
-- public.users, breaking the cycle. LANGUAGE plpgsql (not sql) is deliberate:
-- simple SQL functions can be inlined by the planner and recurse anyway.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auth_gym_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v UUID;
BEGIN
  SELECT gym_id INTO v FROM public.users WHERE user_id = auth.uid();
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v TEXT;
BEGIN
  SELECT role INTO v FROM public.users WHERE user_id = auth.uid();
  RETURN COALESCE(v, 'Member');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_gym_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid() AND role = 'Admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_gym_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid() AND role IN ('Admin','Trainer')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auth_gym_id()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_role()     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gym_admin()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gym_staff()  TO authenticated;

-- ---------------------------------------------------------------------------
-- STEP 4. updated_at maintenance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_users       ON public.users;
DROP TRIGGER IF EXISTS trg_touch_memberships ON public.memberships;
DROP TRIGGER IF EXISTS trg_touch_tenants     ON public.tenants;

CREATE TRIGGER trg_touch_users       BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_touch_memberships BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_touch_tenants     BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- STEP 5. Default tenant
-- ---------------------------------------------------------------------------
INSERT INTO public.tenants (gym_id, name, subscription_tier, currency, address)
VALUES ('00000000-0000-0000-0000-000000000001',
        'Body Line Fitness centre', 'Enterprise', 'INR', 'Kerala, India')
ON CONFLICT (gym_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.default_gym_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT '00000000-0000-0000-0000-000000000001'::uuid;
$$;

-- ---------------------------------------------------------------------------
-- STEP 6. Auto-create a public.users profile whenever an auth user is created
--
-- WHY THIS EXISTS — bug #2 in the original setup.
-- Sign-up created a row in auth.users but nothing in public.users, so the
-- app's `select * from users where user_id = ...` returned zero rows and the
-- login silently failed. This trigger closes that gap.
--
-- It is deliberately fault-tolerant: if it raised, GoTrue would return
-- "Database error saving new user" and block registration entirely.
-- ---------------------------------------------------------------------------
-- Safe casts: a single malformed metadata field (e.g. weight = "abc") must not
-- abort the whole trigger and leave the account without a profile row.
CREATE OR REPLACE FUNCTION public.safe_uuid(t TEXT)
RETURNS UUID LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN RETURN NULLIF(t,'')::uuid; EXCEPTION WHEN others THEN RETURN NULL; END; $$;

CREATE OR REPLACE FUNCTION public.safe_numeric(t TEXT)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN RETURN NULLIF(t,'')::numeric; EXCEPTION WHEN others THEN RETURN NULL; END; $$;

CREATE OR REPLACE FUNCTION public.safe_date(t TEXT)
RETURNS DATE LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN RETURN NULLIF(t,'')::date; EXCEPTION WHEN others THEN RETURN NULL; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_gym_id UUID;
  v_role   TEXT;
  v_name   TEXT;
BEGIN
  v_gym_id := COALESCE(
    public.safe_uuid(NEW.raw_user_meta_data ->> 'gym_id'),
    public.default_gym_id()
  );
  -- Never trust a client-supplied gym_id that does not exist.
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE gym_id = v_gym_id) THEN
    v_gym_id := public.default_gym_id();
  END IF;

  v_role := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'role', ''), 'Member');
  IF v_role NOT IN ('Admin','Trainer','Member') THEN
    v_role := 'Member';
  END IF;

  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    split_part(COALESCE(NEW.email, 'member'), '@', 1)
  );

  INSERT INTO public.users (
    user_id, gym_id, role, full_name, email, phone,
    date_of_birth, address, weight, height, qr_pass_code
  )
  VALUES (
    NEW.id,
    v_gym_id,
    v_role,
    v_name,
    COALESCE(NEW.email, ''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    public.safe_date(NEW.raw_user_meta_data ->> 'date_of_birth'),
    NULLIF(NEW.raw_user_meta_data ->> 'address', ''),
    public.safe_numeric(NEW.raw_user_meta_data ->> 'weight'),
    public.safe_numeric(NEW.raw_user_meta_data ->> 'height'),
    'PASS-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 10))
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'handle_new_auth_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Self-heal: any auth user that has no profile row gets one now.
INSERT INTO public.users (user_id, gym_id, role, full_name, email, qr_pass_code)
SELECT a.id,
       public.default_gym_id(),
       COALESCE(NULLIF(a.raw_user_meta_data ->> 'role',''), 'Member'),
       COALESCE(NULLIF(a.raw_user_meta_data ->> 'full_name',''), split_part(a.email,'@',1)),
       COALESCE(a.email, ''),
       'PASS-' || upper(substr(replace(a.id::text,'-',''),1,10))
FROM auth.users a
LEFT JOIN public.users u ON u.user_id = a.id
WHERE u.user_id IS NULL
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- STEP 7. Row Level Security
--
-- v1 enabled RLS on tenants, workouts and messages but created NO policies
-- for them. In Postgres that means "deny everything" — the gym name, workout
-- plans and messages were unreadable by every client. All seven tables now
-- have an explicit policy set.
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments      ENABLE ROW LEVEL SECURITY;

-- Remove every existing policy on these tables so re-runs stay clean.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('tenants','users','memberships','attendance',
                        'workouts','notifications','messages','payments')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ---- tenants -------------------------------------------------------------
CREATE POLICY tenants_select ON public.tenants
  FOR SELECT TO authenticated
  USING (gym_id = public.auth_gym_id());

CREATE POLICY tenants_update ON public.tenants
  FOR UPDATE TO authenticated
  USING (gym_id = public.auth_gym_id() AND public.is_gym_admin())
  WITH CHECK (gym_id = public.auth_gym_id() AND public.is_gym_admin());

-- ---- users ---------------------------------------------------------------
CREATE POLICY users_select_own ON public.users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY users_select_same_gym ON public.users
  FOR SELECT TO authenticated
  USING (gym_id = public.auth_gym_id());

CREATE POLICY users_insert_self ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY users_insert_admin ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (public.is_gym_admin() AND gym_id = public.auth_gym_id());

CREATE POLICY users_update_own ON public.users
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY users_update_admin ON public.users
  FOR UPDATE TO authenticated
  USING (public.is_gym_admin() AND gym_id = public.auth_gym_id())
  WITH CHECK (public.is_gym_admin() AND gym_id = public.auth_gym_id());

CREATE POLICY users_delete_admin ON public.users
  FOR DELETE TO authenticated
  USING (public.is_gym_admin()
         AND gym_id = public.auth_gym_id()
         AND user_id <> auth.uid());   -- an admin cannot delete themselves

-- ---- memberships ---------------------------------------------------------
CREATE POLICY memberships_select ON public.memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR gym_id = public.auth_gym_id());

CREATE POLICY memberships_insert_admin ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (public.is_gym_admin() AND gym_id = public.auth_gym_id());

CREATE POLICY memberships_update_admin ON public.memberships
  FOR UPDATE TO authenticated
  USING (public.is_gym_admin() AND gym_id = public.auth_gym_id())
  WITH CHECK (public.is_gym_admin() AND gym_id = public.auth_gym_id());

CREATE POLICY memberships_delete_admin ON public.memberships
  FOR DELETE TO authenticated
  USING (public.is_gym_admin() AND gym_id = public.auth_gym_id());

-- ---- attendance ----------------------------------------------------------
CREATE POLICY attendance_select ON public.attendance
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR gym_id = public.auth_gym_id());

CREATE POLICY attendance_insert ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (gym_id = public.auth_gym_id()
              AND (user_id = auth.uid() OR public.is_gym_staff()));

CREATE POLICY attendance_delete_admin ON public.attendance
  FOR DELETE TO authenticated
  USING (public.is_gym_admin() AND gym_id = public.auth_gym_id());

-- ---- workouts ------------------------------------------------------------
CREATE POLICY workouts_select ON public.workouts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR (public.is_gym_staff() AND gym_id = public.auth_gym_id()));

CREATE POLICY workouts_insert ON public.workouts
  FOR INSERT TO authenticated
  WITH CHECK (gym_id = public.auth_gym_id()
              AND (user_id = auth.uid() OR public.is_gym_staff()));

CREATE POLICY workouts_update ON public.workouts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()
         OR (public.is_gym_staff() AND gym_id = public.auth_gym_id()))
  WITH CHECK (gym_id = public.auth_gym_id());

CREATE POLICY workouts_delete ON public.workouts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid()
         OR (public.is_gym_admin() AND gym_id = public.auth_gym_id()));

-- ---- notifications -------------------------------------------------------
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR (public.is_gym_admin() AND gym_id = public.auth_gym_id()));

CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (gym_id = public.auth_gym_id()
              AND (user_id = auth.uid() OR public.is_gym_staff()));

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_delete ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid()
         OR (public.is_gym_admin() AND gym_id = public.auth_gym_id()));

-- ---- messages ------------------------------------------------------------
CREATE POLICY messages_select ON public.messages
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY messages_insert ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND gym_id = public.auth_gym_id());

CREATE POLICY messages_update_receiver ON public.messages
  FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

CREATE POLICY messages_delete ON public.messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- ---- payments ------------------------------------------------------------
CREATE POLICY payments_select ON public.payments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR (public.is_gym_admin() AND gym_id = public.auth_gym_id()));

-- A member may raise a request for themselves, but ONLY as PENDING. Without
-- the status clause a member could insert an already-APPROVED row and the
-- approval step would be meaningless.
CREATE POLICY payments_insert ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    gym_id = public.auth_gym_id()
    AND (
      (user_id = auth.uid() AND status = 'PENDING' AND reviewed_by IS NULL)
      OR public.is_gym_staff()
    )
  );

-- Only an Admin may approve or reject.
CREATE POLICY payments_update_admin ON public.payments
  FOR UPDATE TO authenticated
  USING (public.is_gym_admin() AND gym_id = public.auth_gym_id())
  WITH CHECK (public.is_gym_admin() AND gym_id = public.auth_gym_id());

-- A member may withdraw their own request while it is still pending.
CREATE POLICY payments_delete ON public.payments
  FOR DELETE TO authenticated
  USING ((user_id = auth.uid() AND status = 'PENDING')
         OR (public.is_gym_admin() AND gym_id = public.auth_gym_id()));

-- ---------------------------------------------------------------------------
-- STEP 7b. Payment approval
--
-- Approving a payment has to do three things together: stamp the request,
-- extend (or create) the membership, and notify the member. Doing that as
-- three separate calls from the browser can half-succeed and leave a member
-- marked paid but not extended. These functions run it as one transaction.
--
-- They are SECURITY DEFINER, so they check the caller's role themselves.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.approve_payment(
  p_payment_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pay        public.payments%ROWTYPE;
  v_admin_gym  UUID := public.auth_gym_id();
  v_membership public.memberships%ROWTYPE;
  v_base       DATE;
  v_new_end    DATE;
BEGIN
  IF NOT public.is_gym_admin() THEN
    RAISE EXCEPTION 'Only an Admin can approve payments.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pay FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment request not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_pay.gym_id IS DISTINCT FROM v_admin_gym THEN
    RAISE EXCEPTION 'That payment belongs to another gym.' USING ERRCODE = '42501';
  END IF;

  IF v_pay.status <> 'PENDING' THEN
    RAISE EXCEPTION 'This request was already %.', lower(v_pay.status)
      USING ERRCODE = '22023';
  END IF;

  -- Most recent membership for this member, if any.
  SELECT * INTO v_membership
    FROM public.memberships
   WHERE user_id = v_pay.user_id
   ORDER BY end_date DESC
   LIMIT 1;

  -- Renewing early must not burn the remaining days.
  v_base := GREATEST(CURRENT_DATE, COALESCE(v_membership.end_date, CURRENT_DATE));
  v_new_end := (v_base + (v_pay.plan_months || ' months')::interval)::date;

  IF v_membership.id IS NOT NULL THEN
    UPDATE public.memberships
       SET plan_name      = v_pay.plan_name,
           end_date       = v_new_end,
           amount_paid    = v_pay.amount,
           payment_status = 'Paid',
           status         = 'Active'
     WHERE id = v_membership.id;
  ELSE
    INSERT INTO public.memberships
      (user_id, gym_id, plan_name, start_date, end_date,
       amount_paid, payment_status, status)
    VALUES
      (v_pay.user_id, v_pay.gym_id, v_pay.plan_name, CURRENT_DATE, v_new_end,
       v_pay.amount, 'Paid', 'Active');
  END IF;

  UPDATE public.payments
     SET status      = 'APPROVED',
         reviewed_by = auth.uid(),
         reviewed_at = NOW(),
         admin_note  = COALESCE(p_admin_note, admin_note)
   WHERE id = p_payment_id;

  INSERT INTO public.notifications (user_id, gym_id, title, message)
  VALUES (
    v_pay.user_id, v_pay.gym_id,
    'Payment approved',
    format('Your %s payment of %s %s was approved. Your membership is now valid until %s.',
           v_pay.plan_name, v_pay.currency, v_pay.amount::text, v_new_end::text)
  );

  RETURN jsonb_build_object(
    'payment_id', p_payment_id,
    'user_id',    v_pay.user_id,
    'new_end_date', v_new_end,
    'status',     'APPROVED'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_payment(
  p_payment_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pay public.payments%ROWTYPE;
BEGIN
  IF NOT public.is_gym_admin() THEN
    RAISE EXCEPTION 'Only an Admin can reject payments.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pay FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment request not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_pay.gym_id IS DISTINCT FROM public.auth_gym_id() THEN
    RAISE EXCEPTION 'That payment belongs to another gym.' USING ERRCODE = '42501';
  END IF;

  IF v_pay.status <> 'PENDING' THEN
    RAISE EXCEPTION 'This request was already %.', lower(v_pay.status)
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.payments
     SET status      = 'REJECTED',
         reviewed_by = auth.uid(),
         reviewed_at = NOW(),
         admin_note  = COALESCE(p_admin_note, admin_note)
   WHERE id = p_payment_id;

  INSERT INTO public.notifications (user_id, gym_id, title, message)
  VALUES (
    v_pay.user_id, v_pay.gym_id,
    'Payment request declined',
    COALESCE(
      NULLIF(p_admin_note, ''),
      format('Your %s payment request was declined. Please contact the front desk.',
             v_pay.plan_name)
    )
  );

  RETURN jsonb_build_object('payment_id', p_payment_id, 'status', 'REJECTED');
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_payment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment(UUID, TEXT)  TO authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_payment(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_payment(UUID, TEXT)  FROM anon;

-- ---------------------------------------------------------------------------
-- STEP 8. Repair any auth users that were inserted by the v1 script
--
-- GoTrue reads confirmation_token / email_change / email_change_token_new /
-- recovery_token as non-nullable Go strings. A raw INSERT that leaves them
-- NULL makes every login for that user fail with HTTP 500
-- "Database error querying schema".
-- Ref: https://supabase.com/docs/guides/troubleshooting/scan-error-on-column-confirmation_token-converting-null-to-string-is-unsupported-during-auth-login-a0c686
-- ---------------------------------------------------------------------------
UPDATE auth.users SET
  confirmation_token     = COALESCE(confirmation_token, ''),
  email_change           = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  recovery_token         = COALESCE(recovery_token, ''),
  aud                    = COALESCE(NULLIF(aud, ''), 'authenticated'),
  role                   = COALESCE(NULLIF(role, ''), 'authenticated')
WHERE confirmation_token IS NULL
   OR email_change IS NULL
   OR email_change_token_new IS NULL
   OR recovery_token IS NULL
   OR aud IS NULL OR aud = ''
   OR role IS NULL OR role = '';

-- Delete the invalid 'ajinasrm' account created by the v1 script.
-- GoTrue cannot authenticate a user whose email is not a valid address.
DELETE FROM auth.users WHERE email = 'ajinasrm';

-- ---------------------------------------------------------------------------
-- STEP 9. Admin bootstrap
--
--   The admin email is defined ONCE, in public.admin_email() below. The
--   verification queries at the end read from it, so changing it in one place
--   is enough.
--
--   The email must be a syntactically valid address. Supabase Auth (GoTrue)
--   rejects a bare username such as 'ajinasrm'.
--
--   On the login screen you can type either the full address or just the part
--   before the "@" — the app appends VITE_LOGIN_DOMAIN, which must match the
--   domain of this email.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_gym_user(
  p_email    TEXT,
  p_password TEXT,
  p_role     TEXT DEFAULT 'Member',
  p_name     TEXT DEFAULT NULL,
  p_gym_id   UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_user_id  UUID;
  v_gym      UUID := COALESCE(p_gym_id, public.default_gym_id());
  v_meta     JSONB;
  v_has_pid  BOOLEAN;
  v_id_uuid  BOOLEAN;
BEGIN
  IF p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'create_gym_user: "%" is not a valid email address. '
                    'Supabase Auth requires a real email format.', p_email;
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = lower(p_email);
  IF v_user_id IS NOT NULL THEN
    -- Already exists: just reset the password and normalise the row.
    UPDATE auth.users SET
      encrypted_password     = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at     = COALESCE(email_confirmed_at, NOW()),
      confirmation_token     = COALESCE(confirmation_token, ''),
      email_change           = COALESCE(email_change, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      recovery_token         = COALESCE(recovery_token, ''),
      aud                    = 'authenticated',
      role                   = 'authenticated',
      updated_at             = NOW()
    WHERE id = v_user_id;

    UPDATE public.users
       SET role = p_role,
           gym_id = v_gym,
           full_name = COALESCE(p_name, full_name)
     WHERE user_id = v_user_id;

    RETURN v_user_id;
  END IF;

  v_user_id := gen_random_uuid();
  v_meta := jsonb_build_object(
    'full_name', COALESCE(p_name, split_part(p_email, '@', 1)),
    'role',      p_role,
    'gym_id',    v_gym::text
  );

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_super_admin,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    lower(p_email),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    v_meta,
    NOW(), NOW(), FALSE,
    '', '', '', ''            -- must be '' not NULL, see STEP 8
  );

  -- auth.identities is required for email/password sign-in.
  -- Its column set changed across GoTrue versions, so detect and adapt.
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='auth' AND table_name='identities'
                   AND column_name='provider_id')
    INTO v_has_pid;
  SELECT (data_type = 'uuid') FROM information_schema.columns
   WHERE table_schema='auth' AND table_name='identities' AND column_name='id'
    INTO v_id_uuid;

  IF v_has_pid AND COALESCE(v_id_uuid, FALSE) THEN
    EXECUTE 'INSERT INTO auth.identities
             (id, user_id, provider_id, identity_data, provider,
              last_sign_in_at, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, ''email'', NOW(), NOW(), NOW())'
      USING v_user_id, v_user_id::text,
            jsonb_build_object('sub', v_user_id::text, 'email', lower(p_email),
                               'email_verified', true, 'phone_verified', false);
  ELSIF v_has_pid THEN
    EXECUTE 'INSERT INTO auth.identities
             (id, user_id, provider_id, identity_data, provider,
              last_sign_in_at, created_at, updated_at)
             VALUES ($1, $1, $2, $3, ''email'', NOW(), NOW(), NOW())'
      USING v_user_id, v_user_id::text,
            jsonb_build_object('sub', v_user_id::text, 'email', lower(p_email),
                               'email_verified', true, 'phone_verified', false);
  ELSE
    EXECUTE 'INSERT INTO auth.identities
             (id, user_id, identity_data, provider,
              last_sign_in_at, created_at, updated_at)
             VALUES ($1, $1, $2, ''email'', NOW(), NOW(), NOW())'
      USING v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', lower(p_email),
                               'email_verified', true, 'phone_verified', false);
  END IF;

  -- The AFTER INSERT trigger already created the profile; make sure the
  -- role/gym are exactly what was asked for.
  UPDATE public.users
     SET role = p_role, gym_id = v_gym,
         full_name = COALESCE(p_name, full_name)
   WHERE user_id = v_user_id;

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_gym_user(TEXT,TEXT,TEXT,TEXT,UUID) FROM PUBLIC, anon, authenticated;

-- ===========================================================================
--  >>> THE ONLY TWO VALUES YOU NEED TO EDIT <<<
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.admin_email()
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT 'ajinas0496@gmail.com'::text;      -- admin login email
$$;

SELECT public.create_gym_user(
  public.admin_email(),
  'alaksa',                                 -- admin password
  'Admin',
  'Super Admin'
);
-- ===========================================================================

-- Remove the placeholder admin from earlier runs of this script, if present.
-- Comment this out if you deliberately want to keep it.
DELETE FROM auth.users
 WHERE email = 'ajinasrm@example.com'
   AND email <> public.admin_email();

-- ---------------------------------------------------------------------------
-- STEP 10. Verification — every row below should read OK
-- ---------------------------------------------------------------------------
SELECT 'tenants seeded'      AS check,
       CASE WHEN EXISTS (SELECT 1 FROM public.tenants) THEN 'OK' ELSE 'FAIL' END AS result
UNION ALL
SELECT 'admin auth user',
       CASE WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = public.admin_email())
            THEN 'OK' ELSE 'FAIL' END
UNION ALL
SELECT 'admin profile',
       CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE role='Admin')
            THEN 'OK' ELSE 'FAIL' END
UNION ALL
SELECT 'no NULL auth tokens',
       CASE WHEN NOT EXISTS (
              SELECT 1 FROM auth.users
              WHERE confirmation_token IS NULL OR email_change IS NULL
                 OR email_change_token_new IS NULL OR recovery_token IS NULL)
            THEN 'OK' ELSE 'FAIL' END
UNION ALL
SELECT 'identity row present',
       CASE WHEN EXISTS (
              SELECT 1 FROM auth.identities i
              JOIN auth.users u ON u.id = i.user_id
              WHERE u.email = public.admin_email())
            THEN 'OK' ELSE 'FAIL' END
UNION ALL
SELECT 'approval functions',
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='approve_payment')
             AND EXISTS (SELECT 1 FROM pg_proc WHERE proname='reject_payment')
            THEN 'OK' ELSE 'FAIL' END
UNION ALL
SELECT 'policies on all tables',
       CASE WHEN (SELECT COUNT(DISTINCT tablename) FROM pg_policies
                  WHERE schemaname='public'
                    AND tablename IN ('tenants','users','memberships','attendance',
                                      'workouts','notifications','messages','payments')) = 8
            THEN 'OK' ELSE 'FAIL' END;
