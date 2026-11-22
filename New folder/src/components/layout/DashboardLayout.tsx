import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LayoutProvider } from "@/context/LayoutContext";
import { PageLoader } from "@/components/shared";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function DashboardLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <LayoutProvider>
      <div className="flex h-dvh overflow-hidden bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-[1800px] p-4 pb-8 sm:p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </LayoutProvider>
  );
}
