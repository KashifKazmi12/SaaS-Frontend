import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
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
    return <p className="text-sm text-muted-foreground">Loading...</p>;
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
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (user) {
    const firstPath =
      navigation[0]?.children[0]?.path || navigation[0]?.path || "/catalog/products";
    return <Navigate to={firstPath} replace />;
  }

  return <>{children}</>;
}
