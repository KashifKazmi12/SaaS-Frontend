import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { BrandThemeProvider } from "@/context/BrandThemeContext";
import { ConfirmDialogProvider } from "@/components/shared";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GuestRoute } from "@/components/layout/RouteGuards";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ProductsPage from "@/pages/catalog/ProductsPage";
import CategoriesPage from "@/pages/catalog/CategoriesPage";
import BusinessGroupsPage from "@/pages/businesses/BusinessGroupsPage";
import BusinessesListPage from "@/pages/businesses/BusinessesListPage";
import ModulesPage from "@/pages/settings/ModulesPage";
import RolesPage from "@/pages/settings/RolesPage";
import SystemUsersPage from "@/pages/settings/SystemUsersPage";
import ThemeSettingsPage from "@/pages/settings/ThemeSettingsPage";
import NotificationEventsPage from "@/pages/settings/NotificationEventsPage";

export default function App() {
  return (
    <AuthProvider>
      <ConfirmDialogProvider>
        <BrandThemeProvider>
          <BrowserRouter>
            <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPasswordPage />
              </GuestRoute>
            }
          />

          <Route element={<DashboardLayout />}>
            <Route index element={<Navigate to="/businesses/list" replace />} />
            <Route path="/businesses" element={<Navigate to="/businesses/list" replace />} />
            <Route path="/businesses/groups" element={<BusinessGroupsPage />} />
            <Route path="/businesses/list" element={<BusinessesListPage />} />
            <Route path="/catalog" element={<Navigate to="/catalog/products" replace />} />
            <Route path="/catalog/products" element={<ProductsPage />} />
            <Route path="/catalog/categories" element={<CategoriesPage />} />
            <Route path="/products" element={<Navigate to="/catalog/products" replace />} />
            <Route path="/settings" element={<Navigate to="/settings/modules" replace />} />
            <Route path="/settings/modules" element={<ModulesPage />} />
            <Route path="/settings/roles" element={<RolesPage />} />
            <Route path="/settings/users" element={<SystemUsersPage />} />
            <Route path="/settings/themes" element={<ThemeSettingsPage />} />
            <Route path="/settings/notifications" element={<NotificationEventsPage />} />
          </Route>

              <Route path="*" element={<Navigate to="/businesses/list" replace />} />
            </Routes>
          </BrowserRouter>
        </BrandThemeProvider>
      </ConfirmDialogProvider>
    </AuthProvider>
  );
}
