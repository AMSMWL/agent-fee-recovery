import { supabase } from "@/integrations/supabase/client";

export type RefundStatus = "pending" | "approved" | "processed";

export type RefundRequest = {
  id: string;
  broker_name: string;
  broker_email: string | null;
  agent_name: string;
  agent_email: string | null;
  agent_fmls_id: string | null;
  fmls_number: string;
  property_address: string | null;
  closing_date: string | null;
  fee_amount: number;
  notes: string | null;
  status: RefundStatus;
  credit_amount: number | null;
  credit_entered_at: string | null;
  processed_at: string | null;
  processed_note: string | null;
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

export async function processRefund(id: string, note: string | null) {
  const { data: session } = await supabase.auth.getSession();
  const { error } = await supabase
    .from("refund_requests")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
      processed_by: session.session?.user.id ?? null,
      processed_note: note,
    })
    .eq("id", id);
  if (error) throw error;
}

export type CreditInput = { fmls_number: string; credit_amount: number; invoice_month: string | null };

export async function addCredits(rows: CreditInput[]) {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id ?? null;
  const { data, error } = await supabase
    .from("fmls_credits")
    .insert(rows.map((r) => ({ ...r, entered_by: userId })))
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
