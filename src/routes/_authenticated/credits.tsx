import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  addCredits,
  currency,
  fetchCredits,
  fetchRequests,
  parseCreditText,
  shortDate,
  type CreditInput,
  type FmlsCredit,
} from "@/lib/refunds";

export const Route = createFileRoute("/_authenticated/credits")({
  head: () => ({
    meta: [
      { title: "FMLS Credits | FMLS Fee Refund Tracker" },
      {
        name: "description",
        content: "Enter FMLS invoice credits manually or in bulk to auto-match pending refund requests.",
      },
      { property: "og:title", content: "FMLS Credits | FMLS Fee Refund Tracker" },
      {
        property: "og:description",
        content: "Accounting entry for FMLS invoice credits with automatic matching to pending requests.",
      },
    ],
  }),
  component: CreditsPage,
});

function CreditsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("single");

  const { data: credits = [], isLoading } = useQuery({
    queryKey: ["fmls_credits"],
    queryFn: fetchCredits,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["refund_requests"],
    queryFn: fetchRequests,
  });

  const stats = useMemo(() => {
    const total = credits.length;
    const matched = credits.filter((c) => c.matched_request_id).length;
    const unmatched = total - matched;
    const amount = credits.reduce((sum, c) => sum + c.credit_amount, 0);
    const pending = requests.filter((r) => r.status === "pending").length;
    return { total, matched, unmatched, amount, pending };
  }, [credits, requests]);

  const add = useMutation({
    mutationFn: addCredits,
    onSuccess: (inserted) => {
      queryClient.invalidateQueries({ queryKey: ["fmls_credits"] });
      queryClient.invalidateQueries({ queryKey: ["refund_requests"] });
      const matched = inserted.filter((c) => c.matched_request_id).length;
      toast.success(
        matched > 0
          ? `${inserted.length} credit(s) saved. ${matched} request(s) auto-matched to Approved.`
          : `${inserted.length} credit(s) saved. No matching pending requests found yet.`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">FMLS Credits</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter credits from the monthly FMLS invoice. The system auto-matches them to pending requests by FMLS
          number.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total credits" value={String(stats.total)} sub={`${currency(stats.amount)} entered`} />
        <Stat label="Matched" value={String(stats.matched)} sub="Approved requests" highlight />
        <Stat label="Unmatched" value={String(stats.unmatched)} sub="Awaiting a pending request" />
        <Stat label="Pending requests" value={String(stats.pending)} sub="Awaiting FMLS credit" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <section className="rounded-xl border border-border bg-card p-6 shadow-panel">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="single">
                Single entry
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="bulk">
                Bulk paste
              </TabsTrigger>
            </TabsList>
            <TabsContent value="single" className="mt-4">
              <SingleEntryForm onSubmit={(row) => add.mutate([row])} busy={add.isPending} />
            </TabsContent>
            <TabsContent value="bulk" className="mt-4">
              <BulkPasteForm onSubmit={(rows) => add.mutate(rows)} busy={add.isPending} />
            </TabsContent>
          </Tabs>
        </section>

        <section className="rounded-xl border border-border bg-card shadow-panel">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold">Recent credits</h3>
            <p className="text-xs text-muted-foreground">Credits entered from FMLS invoices</p>
          </div>
          <CreditTable credits={credits} loading={isLoading} />
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-panel ${
        highlight ? "border-accent/50 bg-accent/10" : "border-border bg-card"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function SingleEntryForm({ onSubmit, busy }: { onSubmit: (row: CreditInput) => void; busy: boolean }) {
  const [fmls_number, setFmlsNumber] = useState("");
  const [credit_amount, setCreditAmount] = useState("");
  const [invoice_month, setInvoiceMonth] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(credit_amount.replace(/[$,\s]/g, ""));
    if (!fmls_number.trim() || !Number.isFinite(amount) || amount <= 0) return;
    onSubmit({ fmls_number: fmls_number.trim(), credit_amount: amount, invoice_month: invoice_month || null });
    setFmlsNumber("");
    setCreditAmount("");
    setInvoiceMonth("");
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="fmls-number">FMLS number</Label>
        <Input
          id="fmls-number"
          value={fmls_number}
          onChange={(e) => setFmlsNumber(e.target.value)}
          placeholder="e.g. 123456"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="credit-amount">Credit amount</Label>
        <Input
          id="credit-amount"
          type="text"
          inputMode="decimal"
          value={credit_amount}
          onChange={(e) => setCreditAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invoice-month">Invoice month</Label>
        <Input
          id="invoice-month"
          type="month"
          value={invoice_month}
          onChange={(e) => setInvoiceMonth(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Saving…" : "Save credit"}
      </Button>
    </form>
  );
}

function BulkPasteForm({ onSubmit, busy }: { onSubmit: (rows: CreditInput[]) => void; busy: boolean }) {
  const [text, setText] = useState("");
  const preview = useMemo(() => parseCreditText(text), [text]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (preview.length === 0) return;
    onSubmit(preview);
    setText("");
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="bulk-credits">Paste credits</Label>
        <Textarea
          id="bulk-credits"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`FMLS number, amount, invoice month (optional) — one per line\n123456, 250.00, 2026-08\n654321, 175.50`}
        />
        <p className="text-xs text-muted-foreground">
          Accepts comma, tab, or semicolon separated values. Invoice month is optional.
        </p>
      </div>

      {preview.length > 0 ? (
        <div className="rounded-lg border border-border bg-secondary/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
          <ul className="mt-2 space-y-1 text-sm">
            {preview.slice(0, 5).map((row, i) => (
              <li key={i} className="flex justify-between">
                <span className="font-mono text-xs">{row.fmls_number}</span>
                <span>{currency(row.credit_amount)}</span>
              </li>
            ))}
            {preview.length > 5 ? <li className="text-xs text-muted-foreground">+{preview.length - 5} more</li> : null}
          </ul>
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={busy || preview.length === 0}>
        {busy ? "Saving…" : `Save ${preview.length || ""} credit${preview.length === 1 ? "" : "s"}`}
      </Button>
    </form>
  );
}

function CreditTable({ credits, loading }: { credits: FmlsCredit[]; loading: boolean }) {
  if (loading) {
    return <p className="px-5 py-8 text-sm text-muted-foreground">Loading credits…</p>;
  }

  if (credits.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-sm text-muted-foreground">No credits entered yet.</p>
        <p className="text-xs text-muted-foreground">Use the form to record the first FMLS invoice credit.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-5 py-3 font-semibold">Entered</th>
            <th className="px-5 py-3 font-semibold">FMLS #</th>
            <th className="px-5 py-3 text-right font-semibold">Credit</th>
            <th className="px-5 py-3 font-semibold">Invoice month</th>
            <th className="px-5 py-3 font-semibold">Matched request</th>
          </tr>
        </thead>
        <tbody>
          {credits.map((credit) => (
            <tr key={credit.id} className="border-t border-border align-middle">
              <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{shortDate(credit.created_at)}</td>
              <td className="px-5 py-3 font-mono text-xs">{credit.fmls_number}</td>
              <td className="whitespace-nowrap px-5 py-3 text-right text-muted-foreground">
                {currency(credit.credit_amount)}
              </td>
              <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                {credit.invoice_month ? shortDate(credit.invoice_month) : "—"}
              </td>
              <td className="px-5 py-3">
                {credit.matched_request_id ? (
                  <span className="inline-flex items-center rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success ring-1 ring-inset ring-success/40">
                    Matched
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning-foreground ring-1 ring-inset ring-warning/40">
                    Unmatched
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
