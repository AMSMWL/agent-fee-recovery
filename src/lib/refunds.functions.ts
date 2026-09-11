import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const submissionSchema = z.object({
  agent_name: z.string().trim().min(1).max(120),
  transaction_type: z.enum(["personal_home_purchase", "personal_home_sale"]),
  fmls_number: z.string().trim().min(1).max(60),
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
  const forwarded = headers?.get("cf-connecting-ip") ?? headers?.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim();
  return ip && ip.length > 0 ? ip : "unknown";
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

    const key = clientKey();
    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

    const { count, error: countError } = await supabaseAdmin
      .from("submission_throttle")
      .select("id", { count: "exact", head: true })
      .eq("client_key", key)
      .gte("created_at", since);

    if (countError) throw new Error("Could not verify submission limit. Please try again.");
    if ((count ?? 0) >= MAX_PER_WINDOW) {
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

    await supabaseAdmin.from("submission_throttle").insert({ client_key: key });

    return { ok: true };
  });
