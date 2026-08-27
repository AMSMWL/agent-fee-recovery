import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { currency, fetchRequests, processRefund, shortDate, type RefundRequest } from "@/lib/refunds";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Refund Dashboard | FMLS Fee Refund Tracker" },
      {
        name: "description",
        content: "Review pending submissions, approved refunds ready to process, and processed refund history.",
      },
      { property: "og:title", content: "Refund Dashboard | FMLS Fee Refund Tracker" },
      { property: "og:description", content: "Pending, approved, and processed FMLS fee refunds in one view." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["refund_requests"],
    queryFn: fetchRequests,
  });

  const process = useMutation({
    mutationFn: (id: string) => processRefund(id, null),
    onSuccess: () => {
      toast.success("Refund processed and moved to history");
      queryClient.invalidateQueries({ queryKey: ["refund_requests"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) =>
      [r.broker_name, r.agent_name, r.fmls_number, r.property_address ?? ""].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [requests, search]);

  const byStatus = (status: RefundRequest["status"]) => filtered.filter((r) => r.status === status);
  const total = (rows: RefundRequest[], key: "fee_amount" | "credit_amount") =>
    rows.reduce((sum, r) => sum + Number(r[key] ?? 0), 0);

  const pending = byStatus("pending");
  const approved = byStatus("approved");
  const processed = byStatus("processed");

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pending submissions" value={String(pending.length)} sub={`${currency(total(pending, "fee_amount"))} in fees`} />
        <Stat
          label="Approved — ready to refund"
          value={String(approved.length)}
          sub={`${currency(total(approved, "credit_amount"))} credited by FMLS`}
          highlight
        />
        <Stat label="Processed" value={String(processed.length)} sub={`${currency(total(processed, "fee_amount"))} refunded`} />
      </div>

      <Tabs defaultValue="pending">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="processed">History ({processed.length})</TabsTrigger>
          </TabsList>
          <Input
            className="max-w-xs"
            placeholder="Search broker, agent, FMLS #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <TabsContent value="pending" className="mt-4">
          <RequestTable
            rows={pending}
            loading={isLoading}
            empty="No pending submissions."
            caption="Waiting on the FMLS credit to appear on the monthly invoice."
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          <RequestTable
            rows={approved}
            loading={isLoading}
            empty="Nothing approved yet — enter FMLS credits to approve pending requests."
            caption="FMLS credit received. Issue the refund, then mark it processed."
            showCredit
            action={(row) => (
              <Button size="sm" disabled={process.isPending} onClick={() => process.mutate(row.id)}>
                Process refund
              </Button>
            )}
          />
        </TabsContent>

        <TabsContent value="processed" className="mt-4">
          <RequestTable
            rows={processed}
            loading={isLoading}
            empty="No processed refunds yet."
            caption="Archived history of issued refunds."
            showCredit
            showProcessed
          />
        </TabsContent>
      </Tabs>
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

function RequestTable({
  rows,
  loading,
  empty,
  caption,
  showCredit = false,
  showProcessed = false,
  action,
}: {
  rows: RefundRequest[];
  loading: boolean;
  empty: string;
  caption: string;
  showCredit?: boolean;
  showProcessed?: boolean;
  action?: (row: RefundRequest) => React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-panel">
      <p className="border-b border-border px-5 py-3 text-sm text-muted-foreground">{caption}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-semibold">Submitted</th>
              <th className="px-5 py-3 font-semibold">Agent</th>
              <th className="px-5 py-3 font-semibold">Type</th>
              <th className="px-5 py-3 font-semibold">FMLS #</th>
              <th className="px-5 py-3 font-semibold">Property</th>
              <th className="px-5 py-3 font-semibold">Prior waiver</th>
              {showCredit ? <th className="px-5 py-3 text-right font-semibold">FMLS credit</th> : null}
              {showProcessed ? <th className="px-5 py-3 font-semibold">Processed</th> : null}
              <th className="px-5 py-3 font-semibold">Status</th>
              {action ? <th className="px-5 py-3 text-right font-semibold">Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-5 py-8 text-muted-foreground" colSpan={10}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-5 py-8 text-muted-foreground" colSpan={10}>
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border align-middle">
                  <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                    {shortDate(row.submission_date ?? row.created_at)}
                  </td>
                  <td className="px-5 py-3 font-medium">{row.agent_name}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                    {row.transaction_type === "personal_home_purchase"
                      ? "Home purchase"
                      : row.transaction_type === "personal_home_sale"
                        ? "Home sale"
                        : "—"}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{row.fmls_number}</td>
                  <td className="max-w-[16rem] truncate px-5 py-3 text-muted-foreground">
                    {row.property_address ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                    {row.prior_waiver ? shortDate(row.prior_waiver_date) : "No"}
                  </td>
                  {showCredit ? (
                    <td className="whitespace-nowrap px-5 py-3 text-right text-muted-foreground">
                      {row.credit_amount == null ? "—" : currency(row.credit_amount)}
                    </td>
                  ) : null}
                  {showProcessed ? (
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{shortDate(row.processed_at)}</td>
                  ) : null}
                  <td className="px-5 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  {action ? <td className="px-5 py-3 text-right">{action(row)}</td> : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
