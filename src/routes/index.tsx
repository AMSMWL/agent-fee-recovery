import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FMLS Fee Refund Request | Broker Submission" },
      {
        name: "description",
        content:
          "Brokers submit agent FMLS personal deal fee refund requests. Track pending, approved, and processed refunds in one place.",
      },
      { property: "og:title", content: "FMLS Fee Refund Request" },
      {
        property: "og:description",
        content: "Submit an agent FMLS personal deal fee refund request for review by the transactions team.",
      },
    ],
  }),
  component: SubmitPage,
});

const emptyForm = {
  broker_name: "",
  broker_email: "",
  agent_name: "",
  agent_email: "",
  agent_fmls_id: "",
  fmls_number: "",
  property_address: "",
  closing_date: "",
  fee_amount: "",
  notes: "",
};

function SubmitPage() {
  const [form, setForm] = useState(emptyForm);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("refund_requests").insert({
        broker_name: form.broker_name.trim(),
        broker_email: form.broker_email.trim() || null,
        agent_name: form.agent_name.trim(),
        agent_email: form.agent_email.trim() || null,
        agent_fmls_id: form.agent_fmls_id.trim() || null,
        fmls_number: form.fmls_number.trim(),
        property_address: form.property_address.trim() || null,
        closing_date: form.closing_date || null,
        fee_amount: Number(form.fee_amount.replace(/[$,\s]/g, "")) || 0,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm(emptyForm);
      setDone(true);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
              eXp Realty
            </p>
            <h1 className="font-display text-lg font-semibold text-primary-foreground">FMLS Fee Refund</h1>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/dashboard">Team login</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {done ? (
          <section className="rounded-xl border border-border bg-card p-8 text-center shadow-panel">
            <h2 className="text-2xl font-semibold">Request submitted</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Your refund request is now <strong>Pending</strong>. Once the FMLS credit appears on the monthly
              invoice, accounting records it and the request moves to Approved for processing.
            </p>
            <Button className="mt-6" onClick={() => setDone(false)}>
              Submit another request
            </Button>
          </section>
        ) : (
          <section className="rounded-xl border border-border bg-card p-8 shadow-panel">
            <h2 className="text-2xl font-semibold">Personal deal fee refund request</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Brokers: submit one request per agent personal deal so the FMLS fee can be refunded once FMLS
              credits it back on the monthly invoice.
            </p>

            <form
              className="mt-8 grid gap-5 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit.mutate();
              }}
            >
              <Field label="Broker name" required>
                <Input required value={form.broker_name} onChange={set("broker_name")} />
              </Field>
              <Field label="Broker email">
                <Input type="email" value={form.broker_email} onChange={set("broker_email")} />
              </Field>
              <Field label="Agent name" required>
                <Input required value={form.agent_name} onChange={set("agent_name")} />
              </Field>
              <Field label="Agent email">
                <Input type="email" value={form.agent_email} onChange={set("agent_email")} />
              </Field>
              <Field label="Agent FMLS ID">
                <Input value={form.agent_fmls_id} onChange={set("agent_fmls_id")} />
              </Field>
              <Field label="FMLS number" required hint="Used to match the credit on the FMLS invoice">
                <Input required value={form.fmls_number} onChange={set("fmls_number")} />
              </Field>
              <Field label="Property address" className="sm:col-span-2">
                <Input value={form.property_address} onChange={set("property_address")} />
              </Field>
              <Field label="Closing date">
                <Input type="date" value={form.closing_date} onChange={set("closing_date")} />
              </Field>
              <Field label="Fee amount paid" required>
                <Input required inputMode="decimal" placeholder="0.00" value={form.fee_amount} onChange={set("fee_amount")} />
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <Textarea rows={3} value={form.notes} onChange={set("notes")} />
              </Field>

              <div className="sm:col-span-2">
                <Button type="submit" size="lg" disabled={submit.isPending}>
                  {submit.isPending ? "Submitting…" : "Submit refund request"}
                </Button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  hint,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
