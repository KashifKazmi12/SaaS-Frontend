import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/shared";
import type { Permission } from "@/types";

export function RequirePermission({
  path,
  action = "view",
  children,
}: {
  path: string;
  action?: Permission;
  children: React.ReactNode;
}) {
  const { can, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!can(path, action)) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <h2 className="text-lg font-semibold">Access restricted</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to open this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, navigation } = useAuth();

  if (loading) {
    return <PageLoader fullScreen />;
  }

  if (user) {
    const firstPath =
      navigation[0]?.children[0]?.path || navigation[0]?.path || "/dashboard";
    return <Navigate to={firstPath} replace />;
  }

  return <>{children}</>;
}
