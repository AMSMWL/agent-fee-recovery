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
  agent_name: "",
  transaction_type: "" as "" | "personal_home_purchase" | "personal_home_sale",
  fmls_number: "",
  property_address: "",
  submission_date: "",
  prior_waiver: "" as "" | "yes" | "no",
  prior_waiver_date: "",
  prior_waiver_details: "",
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
        agent_name: form.agent_name.trim(),
        transaction_type: form.transaction_type || null,
        fmls_number: form.fmls_number.trim(),
        property_address: form.property_address.trim() || null,
        submission_date: form.submission_date || null,
        prior_waiver: form.prior_waiver === "yes",
        prior_waiver_date: form.prior_waiver === "yes" ? form.prior_waiver_date || null : null,
        prior_waiver_details: form.prior_waiver === "yes" ? form.prior_waiver_details.trim() || null : null,
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
              <Field label="Agent name" required>
                <Input required value={form.agent_name} onChange={set("agent_name")} />
              </Field>
              <Field label="FMLS number" required hint="Used to match the credit on the FMLS invoice">
                <Input required value={form.fmls_number} onChange={set("fmls_number")} />
              </Field>
              <Field label="Transaction type" required className="sm:col-span-2">
                <RadioGroup
                  className="flex flex-col gap-2 sm:flex-row sm:gap-6"
                  value={form.transaction_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, transaction_type: v as typeof f.transaction_type }))}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="tt-purchase" value="personal_home_purchase" required />
                    <Label htmlFor="tt-purchase" className="text-sm font-normal">
                      Personal Home Purchase
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="tt-sale" value="personal_home_sale" required />
                    <Label htmlFor="tt-sale" className="text-sm font-normal">
                      Personal Home Sale
                    </Label>
                  </div>
                </RadioGroup>
              </Field>
              <Field label="Property address" className="sm:col-span-2">
                <Input value={form.property_address} onChange={set("property_address")} />
              </Field>
              <Field label="Date of submission" required>
                <Input required type="date" value={form.submission_date} onChange={set("submission_date")} />
              </Field>
              <Field
                label="Has the agent requested a waiver in the last 5 years?"
                required
                className="sm:col-span-2"
              >
                <RadioGroup
                  className="flex gap-6"
                  value={form.prior_waiver}
                  onValueChange={(v) => setForm((f) => ({ ...f, prior_waiver: v as typeof f.prior_waiver }))}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="pw-yes" value="yes" required />
                    <Label htmlFor="pw-yes" className="text-sm font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="pw-no" value="no" required />
                    <Label htmlFor="pw-no" className="text-sm font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </Field>
              {form.prior_waiver === "yes" ? (
                <>
                  <Field label="Date of previous waiver" required>
                    <Input
                      required
                      type="date"
                      value={form.prior_waiver_date}
                      onChange={set("prior_waiver_date")}
                    />
                  </Field>
                  <Field label="Previous waiver details" required>
                    <Input required value={form.prior_waiver_details} onChange={set("prior_waiver_details")} />
                  </Field>
                </>
              ) : null}
              <Field label="Broker notes" className="sm:col-span-2">
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
