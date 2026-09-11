import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { listTeam, setTeamRole } from "@/lib/team.functions";
import { fetchMyRoles, isAdmin } from "@/lib/roles";
import { shortDate } from "@/lib/refunds";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team Access | FMLS Fee Refund Tracker" },
      {
        name: "description",
        content: "Admins assign viewer, accounting, and admin access for the FMLS fee refund tracker.",
      },
      { property: "og:title", content: "Team Access | FMLS Fee Refund Tracker" },
      { property: "og:description", content: "Manage who can view, record credits, and issue refunds." },
    ],
  }),
  component: TeamPage,
});

const ROLES = ["viewer", "accounting", "admin"] as const;

function TeamPage() {
  const queryClient = useQueryClient();
  const { data: myRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["my_roles"],
    queryFn: fetchMyRoles,
  });
  const admin = isAdmin(myRoles);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => listTeam(),
    enabled: admin,
  });

  const update = useMutation({
    mutationFn: (vars: { userId: string; role: (typeof ROLES)[number] }) =>
      setTeamRole({ data: vars }),
    onSuccess: () => {
      toast.success("Access updated");
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["my_roles"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (rolesLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!admin)
    return (
      <div className="rounded-xl border border-border bg-card p-8 shadow-panel">
        <h2 className="text-xl font-semibold">Admins only</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask an administrator if you need access to manage team permissions.
        </p>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Team access</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Viewer can see the dashboard only. Accounting can record FMLS credits and issue payments. Admin can
          also delete records and manage access.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-panel">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3">Current access</th>
              <th className="px-4 py-3">Set access</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                  Loading team…
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{m.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{shortDate(m.created_at)}</td>
                  <td className="px-4 py-3">{m.roles.join(", ") || "none"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {ROLES.map((role) => (
                        <Button
                          key={role}
                          size="sm"
                          variant={m.roles.includes(role) ? "default" : "outline"}
                          disabled={update.isPending}
                          onClick={() => update.mutate({ userId: m.id, role })}
                        >
                          {role}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
