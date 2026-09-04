import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
          <div className="mr-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
              eXp Realty
            </p>
            <h1 className="font-display text-lg font-semibold text-primary-foreground">FMLS Fee Refund Tracker</h1>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/credits">FMLS Credits</NavLink>
            <NavLink to="/payments">Issue Payments</NavLink>
            <NavLink to="/">Broker form</NavLink>

          </nav>
          <div className="flex items-center gap-3 border-l border-primary-foreground/20 pl-4">
            <span className="hidden text-xs text-primary-foreground/70 sm:inline">{user.email}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                router.navigate({ to: "/auth", search: { redirect: undefined } });
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-2 text-sm font-medium text-primary-foreground/75 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground [&.active]:bg-primary-foreground/15 [&.active]:text-primary-foreground"
    >
      {children}
    </Link>
  );
}
