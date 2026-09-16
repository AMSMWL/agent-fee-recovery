import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const submissionSchema = z.object({
  agent_name: z.string().trim().min(1).max(120),
  transaction_type: z.enum(["personal_home_purchase", "personal_home_sale"]),
  fmls_number: z.string().trim().min(1).max(60).regex(/^[A-Za-z0-9][A-Za-z0-9 ._/-]*$/),
  property_address: z.string().trim().max(240).nullable(),
  submission_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  prior_waiver: z.boolean(),
  prior_waiver_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  prior_waiver_details: z.string().trim().max(1000).nullable(),
  notes: z.string().trim().max(2000).nullable(),
});

export type RefundSubmission = z.infer<typeof submissionSchema>;

const WINDOW_MINUTES = 60;
const MAX_PER_WINDOW = 10;

function clientKey(): string {
  const request = getRequest();
  const headers = request?.headers;
  // cf-connecting-ip is set by the hosting edge and cannot be forged by the
  // caller; x-forwarded-for is a fallback for other environments.
  const forwarded = headers?.get("cf-connecting-ip") ?? headers?.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim();
  if (ip && ip.length > 0) return ip;
  // No identifiable IP: bucket by user agent so unknown callers do not all
  // share (and exhaust) one global allowance.
  const ua = headers?.get("user-agent") ?? "";
  return `unknown:${ua.slice(0, 80)}`;
}

/**
 * Public endpoint used by the broker form. Anonymous callers have no direct
 * insert access to refund_requests: submissions are validated, rate limited by
 * caller IP, and written here with a fixed pending status and no admin fields.
 */
export const submitRefundRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submissionSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Single statement: records the attempt and evaluates the window together,
    // so concurrent submissions cannot race past the cap.
    const { data: allowed, error: throttleError } = await supabaseAdmin.rpc(
      "record_submission_attempt",
      {
        _client_key: clientKey(),
        _max_per_window: MAX_PER_WINDOW,
        _window_minutes: WINDOW_MINUTES,
      },
    );

    if (throttleError) throw new Error("Could not verify submission limit. Please try again.");
    if (allowed === false) {
      throw new Error("Too many submissions from this connection. Please try again later.");
    }

    const { error } = await supabaseAdmin.from("refund_requests").insert({
      agent_name: data.agent_name,
      transaction_type: data.transaction_type,
      fmls_number: data.fmls_number,
      property_address: data.property_address,
      submission_date: data.submission_date,
      prior_waiver: data.prior_waiver,
      prior_waiver_date: data.prior_waiver ? data.prior_waiver_date : null,
      prior_waiver_details: data.prior_waiver ? data.prior_waiver_details : null,
      notes: data.notes,
      status: "pending",
    });

    if (error) throw new Error("Could not save the request. Please check the form and try again.");

    return { ok: true };
  });

type AuthContext = {
  supabase: {
    rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    from: (table: string) => any;
  };
  userId: string;
};

async function isStaffCaller(context: AuthContext): Promise<boolean> {
  const { data } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  return data === true;
}

async function assertStaff(context: AuthContext): Promise<void> {
  if (!(await isStaffCaller(context))) {
    throw new Error("Forbidden: accounting or admin access required");
  }
}

/**
 * Reads refund requests for any signed-in user through the caller's own
 * RLS-scoped client — never the service role. Staff read the table directly
 * (their policies allow it); view-only accounts get a database function that
 * returns an explicit allow-list of non-financial columns only.
 */
export const listRefundRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as AuthContext;

    if (await isStaffCaller(ctx)) {
      const { data, error } = await ctx.supabase
        .from("refund_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error("Could not load refund requests");
      return data ?? [];
    }

    const { data, error } = await ctx.supabase.rpc("list_refund_requests_safe");
    if (error) throw new Error("Could not load refund requests");

    return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
      ...row,
      bank_name: null,
      bank_account_reference: null,
      payment_method: null,
      payment_reference: null,
      processed_note: null,
    }));
  });

/** Staff-only: FMLS credit entries, read through the caller's scoped client. */
export const listFmlsCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as AuthContext;
    await assertStaff(ctx);

    const { data, error } = await ctx.supabase
      .from("fmls_credits")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load credits");
    return data ?? [];
  });

const creditSchema = z.object({
  fmls_number: z.string().trim().min(1).max(60).regex(/^[A-Za-z0-9][A-Za-z0-9 ._/-]*$/),
  credit_amount: z.number().positive().max(1_000_000),
  invoice_month: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

/** Staff-only: records FMLS invoice credits, which auto-match pending requests. */
export const addFmlsCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ rows: z.array(creditSchema).min(1).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as AuthContext;
    await assertStaff(ctx);

    // Written through the caller's own client so RLS and the matching trigger
    // both see the staff identity.
    const { data: inserted, error } = await (context as { supabase: any }).supabase
      .from("fmls_credits")
      .insert(
        data.rows.map((row) => ({
          fmls_number: row.fmls_number,
          credit_amount: row.credit_amount,
          invoice_month: row.invoice_month,
          entered_by: ctx.userId,
        })),
      )
      .select("*");
    if (error) throw new Error("Could not save the credit. Please check the values and try again.");
    return inserted ?? [];
  });

const payoutSchema = z.object({
  id: z.string().uuid(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  refund_amount: z.number().positive().max(1_000_000),
  bank_name: z.string().trim().min(1).max(160),
  bank_account_reference: z.string().trim().max(80).nullable(),
  payment_method: z.string().trim().max(80).nullable(),
  payment_reference: z.string().trim().max(120).nullable(),
  processed_note: z.string().trim().max(2000).nullable(),
});

/** Staff-only: marks an approved request as processed with its payment details. */
export const processRefundPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => payoutSchema.parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as AuthContext;
    await assertStaff(ctx);

    const { id, ...payout } = data;
    const { data: updated, error } = await (context as { supabase: any }).supabase
      .from("refund_requests")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
        processed_by: ctx.userId,
        ...payout,
      })
      .eq("id", id)
      .eq("status", "approved")
      .select("id");

    if (error) throw new Error("Could not record the payment. Please try again.");
    if (!updated || updated.length === 0) {
      throw new Error("That request is no longer awaiting payment.");
    }
    return { ok: true };
  });
