import { useQuery } from "@tanstack/react-query";

import { fetchMyRoles, isStaff } from "@/lib/roles";

/**
 * Hides accounting/admin screens from viewer accounts.
 * UI convenience only — not a security boundary. Enforcement lives in the
 * server functions (role check + auth middleware) and in the database policies.
 */
export function StaffOnly({ children }: { children: React.ReactNode }) {
  const { data: roles = [], isLoading } = useQuery({ queryKey: ["my_roles"], queryFn: fetchMyRoles });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!isStaff(roles)) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 shadow-panel">
        <h2 className="text-xl font-semibold">Accounting access required</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account can view the dashboard only. Ask an administrator for accounting access to record FMLS
          credits or issue refunds.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
