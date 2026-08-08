import express from "express";
import { GoogleGenAI } from "@google/genai";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const app = express();

app.use(express.json({ limit: "1mb" }));

/**
 * Server-side Supabase client. Uses the SERVICE ROLE key, which bypasses RLS,
 * so it must only ever be constructed on the server. Never expose
 * SUPABASE_SERVICE_ROLE_KEY to the browser or prefix it with VITE_.
 */
let adminClient: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  if (adminClient) return adminClient;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

// Lazy Google GenAI Client
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return new GoogleGenAI({ apiKey });
}

// --- API ENDPOINTS ---

// Health check — also reports which server-side integrations are configured,
// so a bad deploy can be diagnosed without reading logs.
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    integrations: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      supabaseAdmin: Boolean(getAdminClient()),
      cronSecret: Boolean(process.env.CRON_SECRET),
    },
  });
});

// AI Workout Generator Endpoint
app.post("/api/ai/generate-workout", async (req, res) => {
  try {
    const { goal, experience, daysPerWeek, equipment, targetMuscles, specialNotes } = req.body;
    
    if (!goal) {
      return res.status(400).json({ error: "Goal is required" });
    }

    const ai = getGenAI();
    const prompt = `You are an elite personal trainer for a premium gym platform. Generate a structured workout plan formatted strictly as JSON.
User Parameters:
- Fitness Goal: ${goal}
- Experience Level: ${experience || "Intermediate"}
- Days Per Week: ${daysPerWeek || 4}
- Available Equipment: ${equipment || "Full Gym"}
- Focus Muscle Groups: ${targetMuscles || "Full Body"}
- Special Requirements/Notes: ${specialNotes || "None"}

Respond ONLY with valid JSON in the following schema:
{
  "title": "String title of plan",
  "summary": "Short 2-sentence description",
  "weeklyFrequency": "Number of days",
  "estimatedDurationMinutes": "Number, e.g. 45",
  "schedule": [
    {
      "dayName": "Day 1 - Push Focus",
      "focus": "Chest, Shoulders & Triceps",
      "warmup": ["Warmup exercise 1", "Warmup exercise 2"],
      "exercises": [
        {
          "name": "Exercise Name",
          "sets": 4,
          "reps": "8-12",
          "restSeconds": 60,
          "tempo": "3-0-1-0",
          "formTip": "Crucial form cue"
        }
      ],
      "cooldown": ["Cooldown exercise 1"]
    }
  ],
  "nutritionAdvice": ["Advice 1", "Advice 2"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    return res.json({ success: true, plan: parsed });
  } catch (error: any) {
    console.error("Error generating workout plan:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to generate workout plan",
      fallbackPlan: {
        title: "Pro Hypertrophy & Conditioning Plan",
        summary: "A balanced 4-day split designed for peak muscle growth and athletic strength.",
        weeklyFrequency: 4,
        estimatedDurationMinutes: 50,
        schedule: [
          {
            dayName: "Day 1 - Chest & Triceps (Push Focus)",
            focus: "Upper Body Hypertrophy",
            warmup: ["5 mins light treadmill", "Arm circles & shoulder dislocates"],
            exercises: [
              { name: "Incline Barbell Bench Press", sets: 4, reps: "8-10", restSeconds: 90, tempo: "2-0-1-0", formTip: "Keep shoulder blades retracted and elbows at 45 degrees." },
              { name: "Dumbbell Flyes", sets: 3, reps: "12-15", restSeconds: 60, tempo: "3-1-1-0", formTip: "Slight bend in elbows, feel a deep stretch in lower chest." },
              { name: "Cable Tricep Pushdowns", sets: 4, reps: "10-12", restSeconds: 60, tempo: "2-0-1-1", formTip: "Lock elbows at ribs, squeeze hard at peak contraction." }
            ],
            cooldown: ["Pectoral doorway stretch - 2 mins"]
          },
          {
            dayName: "Day 2 - Back & Biceps (Pull Focus)",
            focus: "Posterior Chain & Lats",
            warmup: ["Band pull-aparts", "Cat-cow spinal mobility"],
            exercises: [
              { name: "Lat Pulldown (Wide Grip)", sets: 4, reps: "10-12", restSeconds: 75, tempo: "2-1-1-0", formTip: "Pull bar to upper chest, drive with elbows." },
              { name: "Seated Cable Rows", sets: 3, reps: "10-12", restSeconds: 60, tempo: "2-0-1-1", formTip: "Squeeze shoulder blades together at torso." },
              { name: "Incline Dumbbell Bicep Curls", sets: 3, reps: "12-15", restSeconds: 60, tempo: "3-0-1-0", formTip: "Keep shoulders locked back against incline bench." }
            ],
            cooldown: ["Lat stretch on rack - 2 mins"]
          }
        ],
        nutritionAdvice: ["Consume 1.6g-2.2g of protein per kg of bodyweight.", "Stay hydrated with 3-4L of water daily."]
      }
    });
  }
});

// AI Gym Business Advisor for Admin
app.post("/api/ai/gym-insights", async (req, res) => {
  try {
    const { activeMembers, totalRevenue, expiringMemberships, occupancyRate } = req.body;
    
    const ai = getGenAI();
    const prompt = `You are an AI Gym Franchise Director. Analyze this gym's key metrics and return actionable business advice as JSON.
Data:
- Active Members: ${activeMembers}
- Monthly Revenue: $${totalRevenue}
- Memberships Expiring in 7 Days: ${expiringMemberships}
- Peak Hour Occupancy Rate: ${occupancyRate}%

Return JSON with:
{
  "healthScore": 88 (number out of 100),
  "statusSummary": "Short punchy status headline",
  "recommendations": [
    { "category": "Retention", "action": "Specific action item", "impact": "High/Medium" },
    { "category": "Revenue", "action": "Specific upselling/pricing tip", "impact": "High" },
    { "category": "Operations", "action": "Equipment/trainer scheduling tip", "impact": "Medium" }
  ],
  "aiPromotions": ["Campaign idea 1", "Campaign idea 2"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ success: true, insights: parsed });
  } catch (error: any) {
    return res.json({
      success: false,
      insights: {
        healthScore: 85,
        statusSummary: "Strong member engagement with high retention opportunities",
        recommendations: [
          { category: "Retention", action: "Send automated WhatsApp/SMS renewal discounts to 14 members expiring this week", impact: "High" },
          { category: "Revenue", action: "Launch 'AI Personal Training Add-on' trial for Starter tier members", impact: "High" },
          { category: "Operations", action: "Adjust evening peak slot trainer allocation between 6 PM - 8 PM", impact: "Medium" }
        ],
        aiPromotions: [
          "Monsoon Fitness Transformation - 15% off Annual Pro Pass",
          "Bring a Gym Buddy Weekend Pass with free InBody Composition test"
        ]
      }
    });
  }
});

// NOTE: there are no payment endpoints.
// This platform has no online payment gateway. Members raise a renewal request
// (public.payments, status PENDING) and a gym Admin approves it, which calls
// the approve_payment() function in supabase_schema.sql. That function
// extends the membership and notifies the member in one transaction.
// See README -> "Payments: how approval works".

// QR attendance verification
//
// NOTE: v1 of this endpoint returned "ACCESS GRANTED" for any token that did
// not contain the literal string "EXPIRED", and never consulted the database.
// Verification now happens client-side against Supabase (see src/lib/db.ts
// findUserByPassCode + fetchActiveMembership) so that RLS is enforced and the
// check-in is actually written to public.attendance.
//
// This endpoint is kept only for hardware turnstiles that cannot run the web
// client. It requires the service-role key and does real verification.
app.post("/api/attendance/checkin", async (req, res) => {
  const { qrPassToken, gymId } = req.body ?? {};

  if (!qrPassToken || !gymId) {
    return res
      .status(400)
      .json({ success: false, error: "qrPassToken and gymId are required" });
  }

  const supabase = getAdminClient();
  if (!supabase) {
    return res.status(503).json({
      success: false,
      error:
        "Gate verification needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.",
    });
  }

  try {
    const { data: member, error: memberError } = await supabase
      .from("users")
      .select("user_id, full_name, gym_id")
      .eq("gym_id", gymId)
      .eq("qr_pass_code", String(qrPassToken).trim())
      .maybeSingle();

    if (memberError) throw memberError;
    if (!member) {
      return res
        .status(404)
        .json({ success: false, error: "Pass code not registered at this gym." });
    }

    const { data: membership, error: mErr } = await supabase
      .from("memberships")
      .select("end_date, status, plan_name")
      .eq("user_id", member.user_id)
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (mErr) throw mErr;

    const today = new Date(new Date().toDateString());
    const valid =
      membership &&
      membership.status === "Active" &&
      new Date(membership.end_date) >= today;

    await supabase.from("attendance").insert({
      user_id: member.user_id,
      gym_id: member.gym_id,
      gate_location: "Turnstile Gate 1 - Main Entry",
      status: valid ? "GRANTED" : "DENIED",
    });

    if (!valid) {
      return res.status(403).json({
        success: false,
        memberName: member.full_name,
        error: membership
          ? `Membership ended ${membership.end_date}. Please renew at the front desk.`
          : "No membership on file for this member.",
      });
    }

    return res.json({
      success: true,
      memberName: member.full_name,
      status: "GRANTED",
      validUntil: membership!.end_date,
      checkInTime: new Date().toISOString(),
      gateAccess: "Turnstile Gate 1 - Unlocked",
    });
  } catch (err: any) {
    console.error("checkin failed:", err);
    return res
      .status(500)
      .json({ success: false, error: err?.message ?? "Verification failed" });
  }
});

// ---------------------------------------------------------------------------
// Automated expiry alerts (invoked by the Vercel cron entry in vercel.json)
//
// v1 was an unauthenticated GET that printed two hardcoded names to the
// console. Anyone who found the URL could trigger it, and it never touched
// the database. This version requires the CRON_SECRET bearer token that
// Vercel sends automatically, and queries real memberships.
// ---------------------------------------------------------------------------
function isAuthorisedCron(req: express.Request): boolean {
  const secret = process.env.CRON_SECRET;
  // If no secret is configured, only allow Vercel's own cron user-agent.
  if (!secret) return req.get("user-agent")?.startsWith("vercel-cron") ?? false;
  return req.get("authorization") === `Bearer ${secret}`;
}

app.get("/api/cron/expiry-alerts", async (req, res) => {
  if (!isAuthorisedCron(req)) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const supabase = getAdminClient();
  if (!supabase) {
    return res.status(503).json({
      success: false,
      error:
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set on the server.",
    });
  }

  try {
    const today = new Date();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 7);

    const toDate = (d: Date) => d.toISOString().split("T")[0];

    const { data: expiring, error } = await supabase
      .from("memberships")
      .select("id, user_id, gym_id, plan_name, end_date, status")
      .eq("status", "Active")
      .gte("end_date", toDate(today))
      .lte("end_date", toDate(horizon));

    if (error) throw error;

    const rows = expiring ?? [];
    let notified = 0;

    for (const m of rows) {
      const daysLeft = Math.ceil(
        (new Date(m.end_date).getTime() - today.getTime()) / 86_400_000,
      );
      const { error: notifyError } = await supabase.from("notifications").insert({
        user_id: m.user_id,
        gym_id: m.gym_id,
        title: "Membership expiring soon",
        message:
          daysLeft <= 0
            ? `Your ${m.plan_name} membership expires today. Please renew to keep gym access.`
            : `Your ${m.plan_name} membership expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${m.end_date}). Please renew to keep gym access.`,
      });
      if (!notifyError) notified += 1;
    }

    // Mark anything already past its end date as Expired.
    const { data: lapsed, error: lapseError } = await supabase
      .from("memberships")
      .update({ status: "Expired" })
      .eq("status", "Active")
      .lt("end_date", toDate(today))
      .select("id");

    if (lapseError) throw lapseError;

    return res.json({
      success: true,
      ranAt: new Date().toISOString(),
      expiringWithin7Days: rows.length,
      notificationsCreated: notified,
      markedExpired: lapsed?.length ?? 0,
    });
  } catch (err: any) {
    console.error("[CRON] expiry-alerts failed:", err);
    return res
      .status(500)
      .json({ success: false, error: err?.message ?? "Cron job failed" });
  }
});

export default app;
