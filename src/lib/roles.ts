import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "accounting" | "viewer";

export async function fetchMyRoles(): Promise<AppRole[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.role as AppRole);
}

export const isAdmin = (roles: AppRole[]) => roles.includes("admin");
export const isStaff = (roles: AppRole[]) => roles.includes("admin") || roles.includes("accounting");
