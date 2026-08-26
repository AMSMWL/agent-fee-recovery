import type { RefundStatus } from "@/lib/refunds";

const styles: Record<RefundStatus, string> = {
  pending: "bg-warning/15 text-warning-foreground ring-warning/40",
  approved: "bg-success/15 text-success ring-success/40",
  processed: "bg-muted text-muted-foreground ring-border",
};

const labels: Record<RefundStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  processed: "Processed",
};

export function StatusBadge({ status }: { status: RefundStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
