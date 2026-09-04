import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import {
  currency,
  fetchRequests,
  processRefund,
  shortDate,
  type PayoutInput,
  type RefundRequest,
} from "@/lib/refunds";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Issue Refund Payments | FMLS Fee Refund Tracker" },
      {
        name: "description",
        content:
          "Record the payment date, refund amount, and bank details for each approved FMLS fee refund, then move it to processed history.",
      },
      { property: "og:title", content: "Issue Refund Payments | FMLS Fee Refund Tracker" },
      {
        property: "og:description",
        content: "Enter payment date, amount, and bank details to process approved FMLS fee refunds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsPage,
});

const todayISO = () => new Date().toISOString().slice(0, 10);

type FormState = {
  payment_date: string;
  refund_amount: string;
  bank_name: string;
  bank_account_reference: string;
  payment_method: string;
  payment_reference: string;
  processed_note: string;
};

function blankForm(row: RefundRequest): FormState {
  return {
    payment_date: todayISO(),
    refund_amount: row.credit_amount == null ? "" : String(Number(row.credit_amount)),
    bank_name: "",
    bank_account_reference: "",
    payment_method: "",
    payment_reference: "",
    processed_note: "",
  };
}

function PaymentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["refund_requests"],
    queryFn: fetchRequests,
  });

  const approved = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests
      .filter((r) => r.status === "approved")
      .filter((r) =>
        q
          ? [r.agent_name, r.fmls_number, r.property_address ?? ""].some((v) => v.toLowerCase().includes(q))
          : true,
      );
  }, [requests, search]);

  const recentlyProcessed = useMemo(
    () => requests.filter((r) => r.status === "processed").slice(0, 8),
    [requests],
  );

  const pay = useMutation({
    mutationFn: ({ id, payout }: { id: string; payout: PayoutInput }) => processRefund(id, null, payout),
    onSuccess: () => {
      toast.success("Refund recorded and moved to processed history");
      setOpenId(null);
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["refund_requests"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const startEdit = (row: RefundRequest) => {
    setOpenId(row.id);
    setForm(blankForm(row));
  };

  const submit = (row: RefundRequest) => {
    if (!form) return;
    const amount = Number(form.refund_amount.replace(/[$,\s]/g, ""));
    if (!form.payment_date) {
      toast.error("Enter the payment date");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a refund amount greater than zero");
      return;
    }
    if (!form.bank_name.trim()) {
      toast.error("Enter the bank or account the refund was paid from");
      return;
    }


    pay.mutate({
      id: row.id,
      payout: {
        payment_date: form.payment_date,
        refund_amount: amount,
        bank_name: form.bank_name.trim(),
        bank_account_reference: form.bank_account_reference.trim() || null,
        payment_method: form.payment_method.trim() || null,
        payment_reference: form.payment_reference.trim() || null,
        processed_note: form.processed_note.trim() || null,
      },
    });
  };

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const totalApproved = approved.reduce((sum, r) => sum + Number(r.credit_amount ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Issue refund payments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {approved.length} approved refund{approved.length === 1 ? "" : "s"} ready —{" "}
            {currency(totalApproved)} credited by FMLS.
          </p>
        </div>
        <Input
          className="max-w-xs"
          placeholder="Search agent, FMLS #, property…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-panel">
            Loading approved refunds…
          </p>
        ) : approved.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-panel">
            Nothing approved yet. Enter FMLS credits to approve pending requests.
          </p>
        ) : (
          approved.map((row) => (
            <div key={row.id} className="rounded-xl border border-border bg-card shadow-panel">
              <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="mr-auto min-w-[14rem]">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{row.agent_name}</p>
                    <StatusBadge status={row.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    FMLS <span className="font-mono">{row.fmls_number}</span> ·{" "}
                    {row.property_address ?? "No property listed"} · submitted{" "}
                    {shortDate(row.submission_date ?? row.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">FMLS credit</p>
                  <p className="font-display text-lg font-semibold">{currency(row.credit_amount)}</p>
                </div>
                <Button
                  variant={openId === row.id ? "secondary" : "default"}
                  size="sm"
                  onClick={() => (openId === row.id ? (setOpenId(null), setForm(null)) : startEdit(row))}
                >
                  {openId === row.id ? "Cancel" : "Record payment"}
                </Button>
              </div>

              {openId === row.id && form ? (
                <div className="border-t border-border bg-secondary/40 px-5 py-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Payment date">
                      <Input
                        type="date"
                        value={form.payment_date}
                        onChange={(e) => set("payment_date")(e.target.value)}
                      />
                    </Field>
                    <Field label="Refund amount paid">
                      <Input
                        inputMode="decimal"
                        placeholder="0.00"
                        value={form.refund_amount}
                        onChange={(e) => set("refund_amount")(e.target.value)}
                      />
                    </Field>
                    <Field label="Bank / account paid from">
                      <Input
                        placeholder="e.g. Operating account"
                        value={form.bank_name}
                        onChange={(e) => set("bank_name")(e.target.value)}
                      />
                    </Field>
                    <Field label="Account reference (last 4)" hint="Optional">
                      <Input
                        placeholder="•••• 1234"
                        value={form.bank_account_reference}
                        onChange={(e) => set("bank_account_reference")(e.target.value)}
                      />
                    </Field>
                    <Field label="Payment method" hint="Optional">
                      <Input
                        placeholder="ACH, check, wire…"
                        value={form.payment_method}
                        onChange={(e) => set("payment_method")(e.target.value)}
                      />
                    </Field>
                    <Field label="Check / confirmation number" hint="Optional">
                      <Input
                        placeholder="e.g. 10482"
                        value={form.payment_reference}
                        onChange={(e) => set("payment_reference")(e.target.value)}
                      />
                    </Field>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Field label="Notes" hint="Optional">
                        <Textarea
                          rows={2}
                          placeholder="Anything the team should know about this payment"
                          value={form.processed_note}
                          onChange={(e) => set("processed_note")(e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Button disabled={pay.isPending} onClick={() => submit(row)}>
                      {pay.isPending ? "Saving…" : "Mark refund processed"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      This moves the line to Processed history on the dashboard.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-panel">
        <p className="border-b border-border px-5 py-3 text-sm text-muted-foreground">
          Recently processed payments
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Paid</th>
                <th className="px-5 py-3 font-semibold">Agent</th>
                <th className="px-5 py-3 font-semibold">FMLS #</th>
                <th className="px-5 py-3 font-semibold">Bank / account</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold">Reference</th>
                <th className="px-5 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentlyProcessed.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-muted-foreground" colSpan={7}>
                    No refunds processed yet.
                  </td>
                </tr>
              ) : (
                recentlyProcessed.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                      {shortDate(row.payment_date ?? row.processed_at)}
                    </td>
                    <td className="px-5 py-3 font-medium">{row.agent_name}</td>
                    <td className="px-5 py-3 font-mono text-xs">{row.fmls_number}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {row.bank_name ?? "—"}
                      {row.bank_account_reference ? ` · ${row.bank_account_reference}` : ""}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{row.payment_method ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{row.payment_reference ?? "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      {currency(row.refund_amount ?? row.credit_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {hint ? <span className="ml-1 font-normal normal-case tracking-normal">({hint})</span> : null}
      </Label>
      {children}
    </div>
  );
}
