import { supabase } from "@/integrations/supabase/client";

export type RefundStatus = "pending" | "approved" | "processed";

export type TransactionType = "personal_home_purchase" | "personal_home_sale";

export type RefundRequest = {
  id: string;
  agent_name: string;
  fmls_number: string;
  transaction_type: TransactionType | null;
  property_address: string | null;
  submission_date: string | null;
  prior_waiver: boolean;
  prior_waiver_date: string | null;
  prior_waiver_details: string | null;
  notes: string | null;
  status: RefundStatus;
  credit_amount: number | null;
  credit_entered_at: string | null;
  processed_at: string | null;
  processed_note: string | null;
  payment_date: string | null;
  refund_amount: number | null;
  bank_name: string | null;
  bank_account_reference: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  created_at: string;
};


export type FmlsCredit = {
  id: string;
  fmls_number: string;
  credit_amount: number;
  invoice_month: string | null;
  matched_request_id: string | null;
  created_at: string;
};

export const currency = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(value ?? 0),
  );

export const shortDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export async function fetchRequests() {
  const { data, error } = await supabase
    .from("refund_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as RefundRequest[];
}

export async function fetchCredits() {
  const { data, error } = await supabase
    .from("fmls_credits")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FmlsCredit[];
}

export type PayoutInput = {
  payment_date: string;
  refund_amount: number;
  bank_name: string;
  bank_account_reference: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  processed_note: string | null;
};

export async function processRefund(id: string, note: string | null, payout?: PayoutInput) {
  const { data: session } = await supabase.auth.getSession();
  const { error } = await supabase
    .from("refund_requests")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
      processed_by: session.session?.user.id ?? null,
      processed_note: payout?.processed_note ?? note,
      ...(payout
        ? {
            payment_date: payout.payment_date,
            refund_amount: payout.refund_amount,
            bank_name: payout.bank_name,
            bank_account_reference: payout.bank_account_reference,
            payment_method: payout.payment_method,
            payment_reference: payout.payment_reference,
          }
        : {}),
    })
    .eq("id", id);
  if (error) throw error;
}


export type CreditInput = { fmls_number: string; credit_amount: number; invoice_month: string | null };

/** Normalizes "2026-08" (month input) or "8/2026" to a valid first-of-month date string. */
export function normalizeInvoiceMonth(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const slash = raw.match(/^(\d{1,2})[/-](\d{4})$/);
  if (slash) return `${slash[2]}-${String(slash[1]).padStart(2, "0")}-01`;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-01`;
  }
  return null;
}

export async function addCredits(rows: CreditInput[]) {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id ?? null;
  const { data, error } = await supabase
    .from("fmls_credits")
    .insert(
      rows.map((r) => ({
        fmls_number: r.fmls_number.trim(),
        credit_amount: r.credit_amount,
        invoice_month: normalizeInvoiceMonth(r.invoice_month),
        entered_by: userId,
      })),
    )
    .select("*");
  if (error) throw error;
  return (data ?? []) as unknown as FmlsCredit[];
}


/** Parses pasted CSV / TSV text: FMLS number, amount[, invoice month] per line. */
export function parseCreditText(text: string): CreditInput[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/[\t,;]/).map((c) => c.trim().replace(/^"|"$/g, "")))
    .filter((cells) => cells.length >= 2 && !/^fmls/i.test(cells[0] ?? ""))
    .map((cells) => {
      const amount = Number((cells[1] ?? "").replace(/[$,\s]/g, ""));
      return {
        fmls_number: cells[0] ?? "",
        credit_amount: Number.isFinite(amount) ? amount : 0,
        invoice_month: cells[2] ? cells[2] : null,
      };
    })
    .filter((r) => r.fmls_number.length > 0 && r.credit_amount > 0);
}
